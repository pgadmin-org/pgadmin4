//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

define(function () {
  return {
    'static': '/base/pgadmin/static/<path:filename>',
    'sqleditor.poll': '/sqleditor/query_tool/poll/<path:trans_id>',
    'sqleditor.query_tool_start': '/sqleditor/query_tool/start/<path:trans_id>',
    'backup.create_server_job':  '/backup/job/<int:sid>',
    'backup.create_object_job':  '/backup/job/<int:sid>/object',
    'datagrid.initialize_datagrid': '/initialize/datagrid/<int:cmd_type>/<obj_type>/<int:sgid>/<int:sid>/<int:did>/<int:obj_id>',
    'datagrid.initialize_query_tool': '/initialize/query_tool/<int:sgid>/<int:sid>',
    'datagrid.initialize_query_tool_with_did': '/initialize/query_tool/<int:sgid>/<int:sid>/<int:did>',
    'restore.create_job': '/restore/job/<int:sid>',
  };
});
