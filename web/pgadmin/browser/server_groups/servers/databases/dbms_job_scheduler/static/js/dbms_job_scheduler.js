/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import DBMSJobSchedulerSchema from './dbms_jobscheduler.ui';

define('pgadmin.node.dbms_job_scheduler', [
  'sources/gettext', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection', 'pgadmin.node.dbms_job',
  'pgadmin.node.dbms_program', 'pgadmin.node.dbms_schedule',
], function(gettext, pgAdmin, pgBrowser) {


  if (!pgBrowser.Nodes['dbms_job_scheduler']) {
    pgAdmin.Browser.Nodes['dbms_job_scheduler'] = pgAdmin.Browser.Node.extend({
      parent_type: 'database',
      type: 'dbms_job_scheduler',
      label: gettext('DBMS Job Scheduler'),
      columns: ['jobname', 'jobstatus', 'joberror', 'jobstarttime', 'jobendtime', 'jobnextrun'],
      canDrop: false,
      canDropCascade: false,
      canSelect: false,
      hasSQL:  false,
      hasDepends: false,
      hasStatistics: false,
      hasScriptTypes: [],
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

      },
      getSchema: ()=> {
        return new DBMSJobSchedulerSchema();
      }
    });
  }

  return pgBrowser.Nodes['dbms_job_scheduler'];
});
