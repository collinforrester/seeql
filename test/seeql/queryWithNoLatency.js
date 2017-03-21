// @flow

import test from 'ava';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import delay from 'delay';

let remoteQuerySpy = sinon.spy();
const createOnConnectionHandler = proxyquire('../../src/createOnConnectionHandler.js', {
	mysql2: {
		createConnection: sinon.stub().returns({ query: remoteQuerySpy })
	}
}).default;
const onConnection = createOnConnectionHandler({
	argv: {
		'database-database': 'db',
		'database-host': 'host',
		'database-password': 'pw',
		'database-user': 'user'
	}
});
const connectionMock = {
	serverHandshake: sinon.spy(),
	on: sinon.stub()
};
connectionMock.on.withArgs('query').callsFake((evt, cb) => cb('SELECT * FROM table;'));
test('has 0 proxy latency by default', (t) => {
	onConnection(connectionMock);
	t.false(remoteQuerySpy.called);
	return delay(0).then(() => {
		t.true(remoteQuerySpy.called);
	});
});