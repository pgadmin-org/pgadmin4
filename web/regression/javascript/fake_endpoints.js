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
  };
});
