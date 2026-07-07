/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { SCHEMA_STATE_ACTIONS } from 'sources/SchemaView';

export default class PgtChainSchema extends BaseUISchema {
  constructor(fieldOptions={}, getPgtChainTaskSchema=()=>[], initValues={}) {
    super({
      chain_name: '',
      chain_id: undefined,
      live: true,
      max_instances: null,
      timeout: 0,
      self_destruct: false,
      exclusive_execution: false,
      client_name: '',
      on_error: null,
      ctasks: [],
      run_at: '',
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
    this.getPgtChainTaskSchema = getPgtChainTaskSchema;
  }

  get idAttribute() {
    return 'chain_id';
  }

  get baseFields() {
    return [
      {
        id: 'chain_name', label: gettext('Name'), type: 'text', noEmpty: true,
      },{
        id: 'chain_id', label: gettext('ID'), mode: ['properties'],
        type: 'int',
      },{
        id: 'live', label: gettext('Enabled?'), type: 'switch',
      },{
        id: 'max_instances', label: gettext('Max instances'), type: 'int',
        helpMessage: gettext('Number of instances (clients) this chain can run in parallel. Leave blank for no limit.'),
        helpMessageMode: ['edit', 'create'],
      },{
        id: 'timeout', label: gettext('Timeout (ms)'), type: 'int',
        helpMessage: gettext('Abort any chain that takes more than the specified number of milliseconds. 0 means no timeout.'),
        helpMessageMode: ['edit', 'create'],
      },{
        id: 'self_destruct', label: gettext('Self-destruct?'), type: 'switch',
        helpMessage: gettext('If enabled, this chain will delete itself after a successful run.'),
        helpMessageMode: ['edit', 'create'],
      },{
        id: 'exclusive_execution', label: gettext('Exclusive execution?'), type: 'switch',
        helpMessage: gettext('If enabled, all parallel chains will be paused while executing this chain.'),
        helpMessageMode: ['edit', 'create'],
      },{
        id: 'client_name', label: gettext('Host agent'), type: 'text',
        helpMessage: gettext('Enter the client name of a machine running pgTimetable if you wish to ensure only that machine will run this job. Leave blank if any host may run the job.'),
        helpMessageMode: ['edit', 'create'],
      },{
        id: 'on_error', label: gettext('On error'), type: 'text',
        helpMessage: gettext('Action to take on error. NULL=default error handling, LOG=log and continue, ABORT=abort chain.'),
        helpMessageMode: ['edit', 'create'],
      },{
        id: 'run_at', label: gettext('Schedule'), type: 'text',
        helpMessage: gettext(`<pre>----CRON-Style
-- * * * * * command to execute
-- ┬ ┬ ┬ ┬ ┬
-- │ │ │ │ │
-- │ │ │ │ └──── day of the week (0 - 7) (Sunday to Saturday)(0 and 7 is Sunday);
-- │ │ │ └────── month (1 - 12)
-- │ │ └──────── day of the month (1 - 31)
-- │ └────────── hour (0 - 23)
-- └──────────── minute (0 - 59)</pre>`),
        helpMessageMode: ['create', 'edit'],
      },{
        id: 'last_run', label: gettext('Last run'), type: 'text',
        mode: ['properties'],
      },{
        id: 'finished', label: gettext('Finished'), type: 'text',
        mode: ['properties'],
      },{
        id: 'duration', label: gettext('Duration'), type: 'text',
        mode: ['properties'],
      },{
        id: 'next_run', label: gettext('Next run'), type: 'text',
        mode: ['properties'],
      },{
        id: 'currently_running_on', label: gettext('Currently running on'), type: 'text',
        mode: ['properties'],
      },{
        id: 'ctasks', label: '', group: gettext('Tasks'),
        type: 'collection', mode: ['edit', 'create'],
        schema: this.getPgtChainTaskSchema(),
        canEdit: true, canAdd: true, canDelete: true,
        columns: [
          'task_name',  'task_order', 'kind', 'ignore_error',
        ],
        depChange: (state, source, topState, actionObj) => {
          if (actionObj.type === SCHEMA_STATE_ACTIONS.ADD_ROW && state?.ctasks) {
            const tasks = state.ctasks;
            const lastOrder = tasks.reduce((max, t) => Math.max(max, t.task_order || 0), 0);
            tasks[tasks.length - 1].task_order = lastOrder + 10;
          }
          return state;
        },
      }
    ];
  }
}
