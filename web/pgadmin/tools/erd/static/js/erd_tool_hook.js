/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/pgadmin', 'pgadmin.tools.erd/erd_tool', 'pgadmin.browser',
  'pgadmin.browser.server.privilege', 'pgadmin.node.database', 'pgadmin.node.primary_key',
  'pgadmin.node.foreign_key', 'pgadmin.browser.datamodel', 'pgadmin.file_manager',
], function(
  pgAdmin, ERDToolModule
) {
  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};
  var ERDTool = ERDToolModule.default;

  /* Return back, this has been called more than once */
  if (pgTools.ERDToolHook)
    return pgTools.ERDToolHook;

  pgTools.ERDToolHook = {
    load: function(params) {
      /* Create the ERD Tool object and render it */
      let erdObj = new ERDTool('#erd-tool-container', params);
      erdObj.render();
    },
  };

  return pgTools.ERDToolHook;
});


