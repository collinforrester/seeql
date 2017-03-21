// @flow

import yargs from 'yargs';
import mysql from 'mysql2';
import createDebug from 'debug';
import prettyHrtime from 'pretty-hrtime';
import createDatabaseConnectionConfiguration from './createDatabaseConnectionConfiguration';
import formatSql from './formatSql';
import createOnConnectionHandler from './createOnConnectionHandler';

const debug = createDebug('seeql');
const argv = yargs
  .env('SEEQL')
  .help()
  .strict()
  .options({
    'database-database': {
      demand: true,
      type: 'string'
    },
    'database-host': {
      demand: true,
      description: 'Target database host. Seeql will connect to this database and proxy all incoming queries.',
      type: 'string'
    },
    'database-password': {
      demand: true,
      type: 'string'
    },
    'database-user': {
      demand: true,
      type: 'string'
    },
    'service-port': {
      default: 3306,
      type: 'number'
    },
    'latency': {
      default: 0,
      description: 'Add an artifical latency to all queries.',
      type: 'number'
    },
    'use-screen': {
      default: true,
      type: 'boolean'
    }
  })
  .argv;

let screen;
let table;

if (argv.useScreen) {
  const blessed = require('blessed');
  const contrib = require('blessed-contrib');

  screen = blessed.screen({
    smartCSR: true
  });

  screen.key(['escape', 'q', 'C-c'], () => {
    // eslint-disable-next-line no-process-exit
    return process.exit(0);
  });

  table = contrib.table({
    columnSpacing: 5,
    columnWidth: [
      15,
      15,
      50,
      10,
      30
    ],
    fg: 'white',
    height: '80%',
    interactive: true,
    keys: true,
    label: null,
    selectedBg: 'blue',
    selectedFg: 'white',
    width: '80%'
  });

  table.focus();

  screen.append(table);

  screen.render();
}

const server = mysql.createServer();

const drawTable = (drawQueries) => {
  table.setData({
    data: drawQueries.map((query) => {
      return [
        query.connectionId,
        query.queryId,
        formatSql(query.sql).slice(0, 50),
        query.rows.length,
        prettyHrtime(query.executionTime)
      ];
    }),
    headers: [
      'Connection ID',
      'Query ID',
      'SQL',
      'Row count',
      'Execution time'
    ]
  });

  screen.render();
};

const queries = [];
const onConnection = createOnConnectionHandler({
  argv,
  queries,
  drawTable
});

server.on('connection', onConnection);
server.listen(argv.servicePort, () => {
  debug('server listening on port %d', argv.servicePort);
});
