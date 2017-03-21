// @flow
import createDatabaseConnectionConfiguration from './createDatabaseConnectionConfiguration';
import mysql from 'mysql2';
import createDebug from 'debug';
const ClientFlags = require('mysql2/lib/constants/client.js');
const debug = createDebug('seeql');

export default (options) => {
	let connectionId = 0;
	let queryId = 0;
	let argv = options.argv || {};
  let latency = argv.latency || 0;
	let queries = options.queries || [];
	let drawTable = options.drawTable || function() {};

  return (connection) => {
    debug('received client connection request');

    connection.serverHandshake({
      capabilityFlags: 0xffffff ^ ClientFlags.COMPRESS,
      characterSet: 8,
      connectionId: connectionId++,
      protocolVersion: 10,
      serverVersion: '5.6.10',
      statusFlags: 2
    });

    const remote = mysql.createConnection(createDatabaseConnectionConfiguration(argv));
    connection.on('field_list', (targetTable, fields) => {
      debug('field_list', targetTable, fields);

      connection.writeEof();
    });

    connection.on('query', (sql) => {
      queryId++;

      const start = process.hrtime();

      debug('received query', sql);
      setTimeout(() => {
        remote.query(sql, (queryError, rows, fields) => {
          if (queryError) {
            throw new Error('Unexpected error.');
          }

          const end = process.hrtime(start);

          debug('received response from the remote database in %s', prettyHrtime(end), rows, fields);

          queries.push({
            connectionId,
            executionTime: end,
            fields,
            queryId,
            rows,
            sql
          });

          if (argv.useScreen) {
            drawTable(queries);
          }

          if (Array.isArray(rows)) {
            connection.writeTextResult(rows, fields);
          } else {
            connection.writeOk(rows);
          }
        });
      }, latency);
    });

    connection.on('end', () => {
      remote.end();
    });
  }
}
