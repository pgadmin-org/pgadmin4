/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// QueryToolComponent.jsx pulls in editors and viewers that this test never
// renders, and whose ESM-only dependencies Jest cannot load.
jest.mock('../../../pgadmin/static/js/components/ReactCodeMirror', () => ({
  __esModule: true,
  default: ({ value }) => value,
}));
jest.mock('../../../pgadmin/static/js/components/JsonEditor', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/sections/GeometryViewer', () => ({
  GeometryViewer: () => null,
}));
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/sections/GraphVisualiser', () => ({
  GraphVisualiser: () => null,
}));

import { getInitialiseRequestData } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx';

const connParams = {
  user: 'postgres',
  role: null,
  password: '',
  dbname: 'postgres',
};

describe('getInitialiseRequestData', () => {
  it('sends the toolbar execute options for a Query Tool', () => {
    expect(getInitialiseRequestData({is_query_tool: true}, connParams, {
      auto_commit: false,
      auto_rollback: true,
      server_cursor: true,
      explain_verbose: true,
      open_in_new_tab: false,
    })).toEqual({
      ...connParams,
      auto_commit: false,
      auto_rollback: true,
      server_cursor: true,
    });
  });

  it('leaves out execute options that are not known yet', () => {
    expect(getInitialiseRequestData({is_query_tool: true}, connParams, null))
      .toEqual(connParams);
    expect(getInitialiseRequestData({is_query_tool: true}, connParams, {}))
      .toEqual(connParams);
    expect(getInitialiseRequestData({is_query_tool: true}, connParams, {
      auto_commit: undefined, server_cursor: false,
    })).toEqual({...connParams, server_cursor: false});
  });

  it('does not send the toolbar execute options for View/Edit Data', () => {
    expect(getInitialiseRequestData({
      is_query_tool: false, sql_filter: 'id > 1', server_cursor: true,
    }, connParams, {auto_commit: false, auto_rollback: true, server_cursor: false}))
      .toEqual({...connParams, sql_filter: 'id > 1', server_cursor: true});
  });
});
