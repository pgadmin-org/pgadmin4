/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/url_for', 'jquery',
  'sources/pgadmin', 'pgadmin.tools.schema_diff_ui',
], function(
  url_for, $, pgAdmin, SchemaDiffUIModule
) {
  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};
  var SchemaDiffUI = SchemaDiffUIModule.default;

  /* Return back, this has been called more than once */
  if (pgTools.SchemaDiffHook)
    return pgTools.SchemaDiffHook;

  pgTools.SchemaDiffHook = {
    load: function(trans_id) {
      window.onbeforeunload = function() {
        $.ajax({
          url: url_for('schema_diff.close', {'trans_id': trans_id}),
          method: 'DELETE',
        });
      };

      let schemaUi = new SchemaDiffUI($('#schema-diff-container'), trans_id);
      schemaUi.render();
    },
  };

  return pgTools.SchemaDiffHook;
});
