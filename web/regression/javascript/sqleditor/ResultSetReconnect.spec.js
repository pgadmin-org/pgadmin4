/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// When a query needs the server password (HTTP 428) or the master password
// crypt key is missing, the user is prompted and the connection is
// re-initialised through REINIT_QT_CONNECTION, which QueryToolComponent hands
// to initializeQueryTool(password, explainObject, macroSQL, executeCursor,
// executeServerCursor, reexecute). reexecute must be true, or the Query Tool
// does not re-run the query, and executeServerCursor must be false. #10603
// The re-run rebuilds the query from the editor or macroSQL, so an external
// query with no macro (the toolbar's COMMIT or ROLLBACK) is not re-run.

jest.mock('sources/url_for', () => ({
  __esModule: true,
  default: jest.fn((endpoint) => `/mock/${endpoint}`),
}));

jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx', () => {
  const React = require('react');
  return {
    QueryToolContext: React.createContext(null),
    QueryToolConnectionContext: React.createContext(null),
    QueryToolEventsContext: React.createContext(null),
  };
});

jest.mock('../../../pgadmin/static/js/components/ReactCodeMirror', () => ({
  __esModule: true,
  default: ({ value }) => value,
}));

jest.mock('../../../pgadmin/static/js/components/JsonEditor', () => ({
  __esModule: true,
  default: () => null,
}));

// ResultSet.jsx pulls in the map and chart viewers, which this test never
// renders and whose ESM-only dependencies Jest cannot load.
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/sections/GeometryViewer', () => ({
  GeometryViewer: () => null,
}));
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/sections/GraphVisualiser', () => ({
  GraphVisualiser: () => null,
}));

// Accept the password prompt and the reconnection straight away.
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/connectServer', () => ({
  connectServerModal: jest.fn((_modal, _data, connectCallback) => connectCallback({password: 'secret'})),
  connectServer: jest.fn(async (_api, _modal, _sid, _user, _formData, connectCallback) => connectCallback()),
}));

import { ResultSetUtils } from '../../../pgadmin/tools/sqleditor/static/js/components/sections/ResultSet';
import { QUERY_TOOL_EVENTS } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolConstants';

describe('ResultSetUtils.startExecution reconnection', () => {
  const explainObject = {analyze: false};
  const macroSQL = 'SELECT $SELECTION$';
  let eventBus, api, rsu, originalPgAdmin;

  beforeEach(() => {
    originalPgAdmin = window.pgAdmin;
    eventBus = {
      fireEvent: jest.fn(),
      registerListener: jest.fn(),
      deregisterListener: jest.fn(),
    };
    api = {post: jest.fn(), get: jest.fn()};
    rsu = new ResultSetUtils(api, {modal: {}, params: {sid: 1, user: 'postgres'}}, 1234, true);
    rsu.setEventBus(eventBus);
  });

  afterEach(() => {
    window.pgAdmin = originalPgAdmin;
  });

  const reinitCalls = () => eventBus.fireEvent.mock.calls.filter(
    (c) => c[0] === QUERY_TOOL_EVENTS.REINIT_QT_CONNECTION
  );

  // Name the arguments as initializeQueryTool receives them.
  const reinitArgs = (call) => {
    const [, password, explain, macro, executeCursor, executeServerCursor, reexecute] = call;
    return {password, explain, macro, executeCursor, executeServerCursor, reexecute};
  };

  // The prompt callbacks are not awaited by startExecution, so let them finish.
  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  const expectRerun = async () => {
    await flushPromises();
    const calls = reinitCalls();
    expect(calls).toHaveLength(1);
    expect(reinitArgs(calls[0])).toEqual({
      password: '',
      explain: explainObject,
      macro: macroSQL,
      executeCursor: true,
      executeServerCursor: false,
      reexecute: true,
    });
  };

  const flags = {isQueryTool: true, external: false, reconnect: false, executeCursor: true, refreshData: false};

  it('re-runs the query after the server password prompt', async () => {
    api.post.mockRejectedValue({response: {status: 428, data: {result: {}}}});

    await rsu.startExecution('SELECT 1', explainObject, macroSQL, jest.fn(), flags);

    await expectRerun();
  });

  it('re-runs the query after the master password prompt', async () => {
    window.pgAdmin = {Browser: {set_master_password: jest.fn((_p, cb) => cb({password: 'secret'}))}};
    api.post.mockRejectedValue({response: {status: 500, data: {info: 'CRYPTKEY_MISSING'}}});

    await rsu.startExecution('SELECT 1', explainObject, macroSQL, jest.fn(), flags);

    await expectRerun();
  });

  // The toolbar's COMMIT and ROLLBACK run external queries with no macro, and
  // a re-run would rebuild the query from the editor rather than run them.
  const externalFlags = {...flags, external: true, executeCursor: false};

  const expectNoRerun = async () => {
    await flushPromises();
    const calls = reinitCalls();
    expect(calls).toHaveLength(1);
    expect(reinitArgs(calls[0]).reexecute).toBe(false);
  };

  it('does not re-run an external query without a macro after the server password prompt', async () => {
    api.post.mockRejectedValue({response: {status: 428, data: {result: {}}}});

    await rsu.startExecution('COMMIT;', null, undefined, jest.fn(), externalFlags);

    await expectNoRerun();
  });

  it('does not re-run an external query without a macro after the master password prompt', async () => {
    window.pgAdmin = {Browser: {set_master_password: jest.fn((_p, cb) => cb({password: 'secret'}))}};
    api.post.mockRejectedValue({response: {status: 500, data: {info: 'CRYPTKEY_MISSING'}}});

    await rsu.startExecution('ROLLBACK;', null, undefined, jest.fn(), externalFlags);

    await expectNoRerun();
  });

  it('re-runs an external macro query, which rebuilds from macroSQL', async () => {
    api.post.mockRejectedValue({response: {status: 428, data: {result: {}}}});

    await rsu.startExecution('SELECT 1', explainObject, macroSQL, jest.fn(), {...flags, external: true});

    await expectRerun();
  });
});
