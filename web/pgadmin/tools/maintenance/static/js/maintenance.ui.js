/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';

export class VacuumSchema extends BaseUISchema {
  constructor(fieldOptions={}) {
    super();

    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'op';
  }

  isApplicableForVacuum(state) {
    return state?.op ? state.op == 'VACUUM' : false;
  }
  isApplicableForReindex(state) {
    return state?.op ? state.op == 'REINDEX' : false;
  }

  get baseFields() {
    let obj = this;
    return  [{
      id: 'vacuum_full',
      deps: ['op'],
      type: 'switch',
      label: gettext('FULL'),
      inlineNext: true,
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state)) {
          state.vacuum_full = false;
          return true;
        }
        return false;
      }
    }, {
      id: 'vacuum_freeze',
      deps: ['op'],
      type: 'switch',
      label: gettext('FREEZE'),
      inlineNext: true,
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state)) {
          state.vacuum_freeze = false;
          return true;
        }
        return false;
      }
    }, {
      id: 'vacuum_analyze',
      deps: ['op'],
      type: 'switch',
      label: gettext('ANALYZE'),
      inlineNext: true,
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state)) {
          state.vacuum_analyze = false;
          return true;
        }
        return false;
      }
    }, {
      id: 'vacuum_disable_page_skipping',
      deps: ['op', 'vacuum_full'],
      type: 'switch',
      label: gettext('DISABLE PAGE SKIPPING'),
      inlineNext: true,
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state) || state.vacuum_full) {
          state.vacuum_disable_page_skipping = false;
          return true;
        }
        return false;
      },
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      }
    }, {
      id: 'skip_locked',
      deps: ['op'],
      type: 'switch',
      label: gettext('SKIP LOCKED'),
      inlineNext: true,
      visible: function(state) {
        return state?.op ? (state.op == 'VACUUM' || state.op == 'ANALYZE') : false;
      },
      disabled: function(state) {
        if (state?.op && state.op != 'VACUUM' && state.op != 'ANALYZE') {
          state.skip_locked = false;
          return true;
        }
        return false;
      },
      min_version: 120000,
    }, {
      id: 'vacuum_truncate',
      deps: ['op', 'vacuum_full'],
      type: 'switch',
      label: gettext('TRUNCATE'),
      inlineNext: true,
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state) || state.vacuum_full) {
          state.vacuum_truncate = false;
          return true;
        }
        return false;
      },
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      min_version: 120000,
    }, {
      id: 'vacuum_process_toast',
      deps: ['op'],
      type: 'switch',
      label: gettext('PROCESS TOAST'),
      inlineNext: true,
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state)) {
          state.vacuum_process_toast = false;
          return true;
        }
        return false;
      },
      min_version: 140000,
    }, {
      id: 'vacuum_process_main',
      deps: ['op'],
      type: 'switch',
      label: gettext('PROCESS MAIN'),
      inlineNext: true,
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state)) {
          state.vacuum_process_main = false;
          return true;
        }
        return false;
      },
      min_version: 160000,
    }, {
      id: 'vacuum_skip_database_stats',
      deps: ['op'],
      type: 'switch',
      label: gettext('SKIP DATABASE STATS'),
      inlineNext: true,
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state)) {
          state.vacuum_skip_database_stats = false;
          return true;
        }
        return false;
      },
      min_version: 160000,
    }, {
      id: 'vacuum_only_database_stats',
      deps: ['op'],
      type: 'switch',
      label: gettext('ONLY DATABASE STATS'),
      inlineNext: true,
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state)) {
          state.vacuum_only_database_stats = false;
          return true;
        }
        return false;
      },
      min_version: 160000,
    }, {
      id: 'vacuum_index_cleanup',
      deps: ['op', 'vacuum_full'],
      type: 'select',
      label: gettext('INDEX CLEANUP'),
      controlProps: { allowClear: false, width: '100%' },
      options: function () {
        let optArray = [{
          label: gettext('ON'),
          value: 'ON',
        },
        {
          label: gettext('OFF'),
          value: 'OFF',
        }];

        if (obj?.top?.nodeInfo?.server?.version >= 140000) {
          optArray.push({
            label: gettext('AUTO'),
            value: 'AUTO',
          });
        }

        return optArray;
      },
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state) || state.vacuum_full) {
          state.vacuum_index_cleanup = undefined;
          return true;
        }
        return false;
      },
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      min_version: 120000,
    }, {
      id: 'vacuum_parallel',
      deps: ['op', 'vacuum_full'],
      type: 'int',
      label: gettext('PARALLEL'),
      min:0, max:1024,
      visible: function(state) {
        return obj.isApplicableForVacuum(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForVacuum(state) || state.vacuum_full) {
          state.vacuum_parallel = undefined;
          return true;
        }
        return false;
      },
      min_version: 130000,
    }, {
      id: 'buffer_usage_limit',
      deps: ['op', 'vacuum_full', 'vacuum_analyze'],
      type: 'text',
      label: gettext('BUFFER USAGE LIMIT'),
      visible: function(state) {
        return state?.op ? (state.op == 'VACUUM' || state.op == 'ANALYZE') : false;
      },
      disabled: function(state) {
        if (state?.op && ((state.op != 'VACUUM' && state.op != 'ANALYZE') || (state.op == 'VACUUM' && state.vacuum_full && !state.vacuum_analyze))) {
          state.buffer_usage_limit = '';
          return true;
        }
        return false;
      },
      helpMessage: gettext('Sizes should be specified as a string containing the numerical size followed by any one of the following memory units: kB (kilobytes), MB (megabytes), GB (gigabytes), or TB (terabytes)'),
      min_version: 160000,
    }, {
      id: 'reindex_system',
      deps: ['op'],
      type: 'switch',
      label: gettext('SYSTEM'),
      visible: function(state) {
        return obj.isApplicableForReindex(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForReindex(state) || obj?._top?.nodeInfo?.schema) {
          state.reindex_system = false;
          return true;
        }
        return false;
      },
      helpMessage: gettext('This option is enabled only when the database is selected in the object explorer.'),
    }, {
      id: 'reindex_concurrently',
      deps: ['op', 'reindex_system'],
      type: 'switch',
      label: gettext('CONCURRENTLY'),
      visible: function(state) {
        return obj.isApplicableForReindex(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForReindex(state) || state.reindex_system) {
          state.reindex_concurrently = false;
          return true;
        }
        return false;
      },
      min_version: 120000,
    }, {
      id: 'reindex_tablespace',
      label: gettext('TABLESPACE'),
      deps: ['op', 'reindex_system'],
      type: 'select',
      options: this.fieldOptions.tablespace,
      controlProps: { allowClear: true },
      visible: function(state) {
        return obj.isApplicableForReindex(state);
      },
      disabled: function(state) {
        if (!obj.isApplicableForReindex(state) || state.reindex_system) {
          state.reindex_tablespace = undefined;
          return true;
        }
        return false;
      },
      min_version: 140000,
    }];
  }
}

export function getVacuumSchema(fieldOptions) {
  return new VacuumSchema(fieldOptions);
}


//Maintenance Schema
export default class MaintenanceSchema extends BaseUISchema {

  constructor(vacuumSchema, fieldOptions = {}) {
    super({
      op: (fieldOptions.nodeInfo?.schema && !fieldOptions.nodeInfo?.table &&
          !fieldOptions.nodeInfo?.primary_key && !fieldOptions.nodeInfo?.unique_constraint &&
          !fieldOptions.nodeInfo?.index && !fieldOptions.nodeInfo?.partition &&
          !fieldOptions.nodeInfo?.mview) ? 'REINDEX' : 'VACUUM',
      verbose: true
    });

    this.fieldOptions = {
      nodeInfo: null,
      ...fieldOptions,
    };

    this.getVacuumSchema = vacuumSchema;
    this.nodeInfo = fieldOptions.nodeInfo;
  }

  get idAttribute() {
    return 'id';
  }

  isSchemaNode() {
    return this.nodeInfo?.schema && !this.nodeInfo?.table &&
           !this.nodeInfo?.primary_key && !this.nodeInfo?.unique_constraint &&
           !this.nodeInfo?.index && !this.nodeInfo?.partition;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'op',
        label: gettext('Maintenance operation'),
        type: 'toggle',
        group: gettext('Options'),
        options: [
          {
            'label': gettext('VACUUM'),
            value: 'VACUUM',
            disabled: (obj.isSchemaNode() && !obj.nodeInfo?.mview) ? true : false
          },
          {
            'label': gettext('ANALYZE'),
            value: 'ANALYZE',
            disabled: (obj.isSchemaNode() && !obj.nodeInfo?.mview) ? true : false
          },
          {
            'label': gettext('REINDEX'),
            value: 'REINDEX',
            disabled: obj.nodeInfo?.mview ? true : false
          },
          {
            'label': gettext('CLUSTER'),
            value: 'CLUSTER',
            disabled: obj.nodeInfo?.mview ? true : obj.isSchemaNode() ? true : false
          },
        ],
      },
      {
        type: 'nested-fieldset',
        label: gettext('Type of objects'),
        schema: obj.getVacuumSchema(),
        group: gettext('Options'),
        visible: function(state) {
          if (state?.op == 'ANALYZE') {
            return obj?.nodeInfo?.server?.version >= 120000;
          } else if (state?.op == 'CLUSTER') {
            return false;
          }
          return true;
        }
      },
      {
        id: 'verbose',
        group: gettext('Options'),
        deps: ['op'],
        type: 'switch',
        label: gettext('Verbose Messages'),
      },
    ];
  }
}
