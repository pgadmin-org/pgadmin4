/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from 'sources/validators';


export class ForEventsSchema extends BaseUISchema {
  constructor(fieldOptions={}, nodeInfo={}, initValues={}) {
    super({
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
    this.nodeInfo = nodeInfo;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'evnt_insert', label: gettext('INSERT'),
        type: 'switch',
        readonly: function(state) {
          let evn_insert = state.evnt_insert;
          if (!_.isUndefined(evn_insert) && obj.nodeInfo.server.server_type == 'ppas')
            return false;
          return obj.inCatalog();
        },
      },{
        id: 'evnt_update', label: gettext('UPDATE'),
        type: 'switch',
        readonly: function(state) {
          let evn_update = state.evnt_update;
          if (!_.isUndefined(evn_update) && obj.nodeInfo.server.server_type == 'ppas')
            return false;
          return obj.inCatalog();
        },
      },{
        id: 'evnt_delete', label: gettext('DELETE'),
        type: 'switch',
        readonly: function(state) {
          let evn_delete = state.evnt_delete;
          if (!_.isUndefined(evn_delete) && obj.nodeInfo.server.server_type == 'ppas')
            return false;
          return obj.inCatalog();
        },
      },{
        id: 'evnt_truncate', label: gettext('TRUNCATE'),
        type: 'switch',
        readonly: function(state) {
          let evn_truncate = state.evnt_truncate;
          // Views cannot have TRUNCATE triggers.
          if ('view' in obj.nodeInfo)
            return true;

          if (!_.isUndefined(evn_truncate) && obj.nodeInfo.server.server_type == 'ppas')
            return false;
          return obj.inCatalog();
        },
      }
    ];
  }
}

export default class CompoundTriggerSchema extends BaseUISchema {
  constructor(fieldOptions={}, nodeInfo={}, initValues={}) {
    super({
      name: undefined,
      ...initValues,
    });

    this.fieldOptions = {
      columns: [],
      ...fieldOptions,
    };
    this.nodeInfo = nodeInfo;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', noEmpty: true,
        disabled: obj.inCatalog(),
      },{
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'int', mode: ['properties'],
      },{
        id: 'is_enable_trigger', label: gettext('Trigger enabled?'),
        mode: ['edit', 'properties'],
        disabled: obj.inCatalog(),
        type: 'select', controlProps: { allowClear: false },
        options: [
          {label: gettext('Enable'), value: 'O'},
          {label: gettext('Enable Replica'), value: 'R'},
          {label: gettext('Enable Always'), value: 'A'},
          {label: gettext('Disable'), value: 'D'},
        ],
      },{
        type: 'nested-fieldset', label: gettext('FOR Events'), group: gettext('Events'),
        schema: new ForEventsSchema({}, this.nodeInfo),
      },{
        id: 'whenclause', label: gettext('When'), group: gettext('Events'),
        type: 'sql', disabled: obj.inCatalog(),
        readonly: function(state) { return !obj.isNew(state); },
      },{
        id: 'columns', label: gettext('Columns'), group: gettext('Events'),
        editable: false, type: 'select', options: this.fieldOptions.columns,
        controlProps: { allowClear: false, multiple: true }, deps: ['evnt_update'],
        disabled: function(state) {
          if(obj.inCatalog()) {
            return true;
          }
          // Enable column only if update event is set true
          let isUpdate = state.evnt_update;
          if(!_.isUndefined(isUpdate) && isUpdate) {
            return false;
          }
          return true;
        },
        readonly: function(state) { return !obj.isNew(state); },
      },{
        id: 'prosrc', label: gettext('Code'), group: gettext('Code'),
        type: 'sql', mode: ['create', 'edit'],
        isFullTab: true,
        disabled: function(state) {
          if(obj.isNew(state) && _.isUndefined(state.prosrc)) {
            state.prosrc = obj.getCodeTemplate();
          }
          return false;
        },
      },{
        id: 'is_sys_trigger', label: gettext('System trigger?'),
        type: 'switch', disabled: obj.inCatalog(), mode: ['properties'],
        readonly: function(state) { return !obj.isNew(state); },
      },{
        id: 'description', label: gettext('Comment'), type: 'multiline',
        disabled: obj.inCatalog(),
      }
    ];
  }

  validate(state, setError) {
    if(!state.evnt_truncate && !state.evnt_delete && !state.evnt_update && !state.evnt_insert) {
      setError('evnt_insert', gettext('Specify at least one event.'));
      return true;
    } else {
      setError('evnt_insert', null);
    }

    if(isEmptyString(state.prosrc)) {
      setError(state.prosrc, gettext('Code cannot be empty.'));
      return true;
    } else {
      setError(state.prosrc, null);
    }
  }

  // This function returns the code template for compound trigger
  getCodeTemplate() {
    return gettext('-- Enter any global declarations below:\n\n' +
            '-- BEFORE STATEMENT block. Delete if not required.\n' +
            'BEFORE STATEMENT IS\n' +
            '    -- Enter any local declarations here\n' +
            'BEGIN\n' +
            '    -- Enter any required code here\n' +
            'END;\n\n' +
            '-- AFTER STATEMENT block. Delete if not required.\n' +
            'AFTER STATEMENT IS\n' +
            '    -- Enter any local declarations here\n' +
            'BEGIN\n' +
            '    -- Enter any required code here\n' +
            'END;\n\n' +
            '-- BEFORE EACH ROW block. Delete if not required.\n' +
            'BEFORE EACH ROW IS\n' +
            '    -- Enter any local declarations here\n' +
            'BEGIN\n' +
            '    -- Enter any required code here\n' +
            'END;\n\n' +
            '-- AFTER EACH ROW block. Delete if not required.\n' +
            'AFTER EACH ROW IS\n' +
            '    -- Enter any local declarations here\n' +
            'BEGIN\n' +
            '    -- Enter any required code here\n' +
            'END;\n\n' +
            '-- INSTEAD OF EACH ROW block. Delete if not required.\n' +
            'INSTEAD OF EACH ROW IS\n' +
            '    -- Enter any local declarations here\n' +
            'BEGIN\n' +
            '    -- Enter any required code here\n' +
            'END;');
  }
}
