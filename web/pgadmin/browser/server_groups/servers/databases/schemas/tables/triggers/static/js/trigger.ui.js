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

export class EventSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      evnt_update: false,
      evnt_insert: false,
      evnt_delete: false,
      evnt_truncate: false,
      is_row_trigger: false,
      is_constraint_trigger: false,
      ...initValues,
    });

    this.fieldOptions = {
      nodeInfo: null,
      ...fieldOptions,
    };

    this.nodeInfo = this.fieldOptions.nodeInfo;

  }

  get idAttribute() {
    return 'oid';
  }

  inSchemaWithModelCheck(state) {
    // Check if we are under schema node & in 'create' mode
    if(this.nodeInfo && 'schema' in this.nodeInfo) {
      // We will disable control if it's in 'edit' mode
      return !this.isNew(state);
    }
    return true;
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'evnt_insert', label: gettext('INSERT'),
      type: 'switch', mode: ['create','edit', 'properties'],
      group: gettext('Events'),
      readonly: (state) => {
        let evn_insert = state.evnt_insert;
        if (!_.isUndefined(evn_insert) && obj.nodeInfo && obj.nodeInfo.server.server_type == 'ppas' && obj.isNew(state))
          return false;
        return obj.inSchemaWithModelCheck(state);
      },
    },{
      id: 'evnt_update', label: gettext('UPDATE'),
      type: 'switch', mode: ['create','edit', 'properties'],
      group: gettext('Events'),
      readonly: (state) => {
        let evn_update = state.evnt_update;
        if (!_.isUndefined(evn_update) && obj.nodeInfo && obj.nodeInfo.server.server_type == 'ppas' && obj.isNew(state))
          return false;
        return obj.inSchemaWithModelCheck(state);
      },
    },{
      id: 'evnt_delete', label: gettext('DELETE'),
      type: 'switch', mode: ['create','edit', 'properties'],
      group: gettext('Events'),
      readonly: (state) => {
        let evn_delete = state.evnt_delete;
        if (!_.isUndefined(evn_delete) && obj.nodeInfo && obj.nodeInfo.server.server_type == 'ppas' && obj.isNew(state))
          return false;
        return obj.inSchemaWithModelCheck(state);
      },
    },{
      id: 'evnt_truncate', label: gettext('TRUNCATE'),
      type: 'switch', group: gettext('Events'), deps: ['is_row_trigger', 'is_constraint_trigger'],
      readonly: (state) => {
        let is_constraint_trigger = state.is_constraint_trigger,
          is_row_trigger = state.is_row_trigger,
          server_type = obj.nodeInfo ? obj.nodeInfo.server.server_type: null;
        if (is_row_trigger){
          state.evnt_truncate = false;
          return true;
        }

        if (server_type === 'ppas' && !_.isUndefined(is_constraint_trigger) &&
        !_.isUndefined(is_row_trigger) &&
        is_constraint_trigger === false && obj.isNew(state))
          return false;

        return obj.inSchemaWithModelCheck(state);
      },
    }];
  }

  validate(state, setError) {

    if (isEmptyString(state.service)) {
      let errmsg = null;
      /* events validation*/
      if (state.tfunction && !state.evnt_truncate && !state.evnt_delete && !state.evnt_update && !state.evnt_insert) {
        errmsg = gettext('Specify at least one event.');
        setError('evnt_insert', errmsg);
        return true;
      } else {
        setError('evnt_insert', null);
      }
    }
  }

}


export default class TriggerSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      is_row_trigger: true,
      fires: 'BEFORE',
      ...initValues
    });

    this.fieldOptions = {
      triggerFunction: [],
      //columns: [],
      ...fieldOptions,
    };
    this.nodeInfo = this.fieldOptions.nodeInfo;

  }

  get idAttribute() {
    return 'oid';
  }

  inSchemaWithModelCheck(state) {
    // Check if we are under schema node & in 'create' mode
    if('schema' in this.nodeInfo) {
      // We will disable control if it's in 'edit' mode
      return !this.isNew(state);
    }
    return true;
  }

  disableTransition(state) {
    if (!this.isNew())
      return true;
    let flag = false,
      evnt = null,
      name = state.name,
      evnt_count = 0;

    // Disable transition tables for view trigger and PG version < 100000
    if(_.indexOf(Object.keys(this.nodeInfo), 'table') == -1 ||
      this.nodeInfo.server.version < 100000) return true;

    if (name == 'tgoldtable') evnt = 'evnt_delete';
    else if (name == 'tgnewtable') evnt = 'evnt_insert';

    if(state.evnt_insert) evnt_count++;
    if(state.evnt_update) evnt_count++;
    if(state.evnt_delete) evnt_count++;


    // Disable transition tables if
    //  - It is a constraint trigger
    //  - Fires other than AFTER
    //  - More than one events enabled
    //  - Update event with the column list

    // Disable Old transition table if both UPDATE and DELETE events are disabled
    // Disable New transition table if both UPDATE and INSERT events are disabled
    if(!state.is_constraint_trigger && state.fires == 'AFTER' &&
      (state.evnt_update || state[evnt]) && evnt_count == 1) {
      flag = (state.evnt_update && (_.size(state.columns) >= 1 && state.columns[0] != ''));
    }

    if(flag && state.name) {
      state.name = null;
    }

    return flag;
  }

  isDisable(state) {
    return !state.is_constraint_trigger;
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), cell: 'text',
      type: 'text', disabled: obj.inCatalog(), noEmpty: true
    },{
      id: 'oid', label: gettext('OID'), cell: 'text',
      type: 'int', mode: ['properties'],
    },{
      id: 'is_enable_trigger', label: gettext('Trigger enabled?'),
      mode: ['edit', 'properties'], group: gettext('Definition'),
      type: 'select',
      disabled: () => {
        return 'catalog' in obj.nodeInfo || 'view' in obj.nodeInfo;
      },
      options: [
        {label: gettext('Enable'), value: 'O'},
        {label: gettext('Enable Replica'), value: 'R'},
        {label: gettext('Enable Always'), value: 'A'},
        {label: gettext('Disable'), value: 'D'},
      ],
      controlProps: { allowClear: false },
    },{
      id: 'is_row_trigger', label: gettext('Row trigger?'),
      type: 'switch', group: gettext('Definition'),
      mode: ['create','edit', 'properties'],
      deps: ['is_constraint_trigger'],
      readonly: (state) => {
        // Disabled if table is a partitioned table.
        if (!obj.isNew())
          return true;

        if (( _.has(obj.nodeInfo, 'table') && _.has(obj.nodeInfo.table, 'is_partitioned') &&
         obj.nodeInfo.table.is_partitioned) && obj.nodeInfo?.server.version < 110000)
        {
          state.is_row_trigger = false;
          return true;
        }

        // If constraint trigger is set to True then row trigger will
        // automatically set to True and becomes disable
        let is_constraint_trigger = state.is_constraint_trigger;
        if(!obj.inSchemaWithModelCheck(state)) {
          if(!_.isUndefined(is_constraint_trigger) &&
            is_constraint_trigger === true) {
            // change it's model value
            state.is_row_trigger = true;
            return true;
          } else {
            return false;
          }
        } else {
          // Check if it is row trigger then enabled it.
          let is_row_trigger = state.is_row_trigger;
          return !(!_.isUndefined(is_row_trigger) && obj.nodeInfo.server.server_type == 'ppas');
        }
      },
    },{
      id: 'is_constraint_trigger', label: gettext('Constraint trigger?'),
      type: 'switch',
      mode: ['create','edit', 'properties'],
      group: gettext('Definition'),
      deps: ['tfunction'],
      readonly: (state) => {
        // Disabled if table is a partitioned table.
        let tfunction = state.tfunction;
        if (( _.has(obj.nodeInfo, 'table') && _.has(obj.nodeInfo.table, 'is_partitioned') &&
         obj.nodeInfo.table.is_partitioned) || ( _.has(obj.nodeInfo, 'view')) ||
         (obj.nodeInfo.server.server_type === 'ppas' && !_.isUndefined(tfunction) &&
         tfunction === 'Inline EDB-SPL')) {
          state.is_constraint_trigger = false;
          return true;
        }
        return obj.inSchemaWithModelCheck(state);
      },
      disabled: () => {
        return 'view' in obj.nodeInfo;
      }
    },{
      id: 'tgdeferrable', label: gettext('Deferrable?'),
      type: 'switch', group: gettext('Definition'),
      mode: ['create','edit', 'properties'],
      deps: ['is_constraint_trigger'],
      readonly: (state) => {
        // If constraint trigger is set to True then only enable it
        let is_constraint_trigger = state.is_constraint_trigger;
        if(!obj.inSchemaWithModelCheck(state)) {
          if(!_.isUndefined(is_constraint_trigger) &&
            is_constraint_trigger === true) {
            return false;
          } else {
            // If value is already set then reset it to false
            if(state.tgdeferrable) {
              state.tgdeferrable =  false;
            }
            return true;
          }
        } else {
          // readonly it
          return true;
        }
      },
      disabled: (state) => {
        return obj.isDisable(state);
      }
    },{
      id: 'tginitdeferred', label: gettext('Deferred?'),
      type: 'switch', group: gettext('Definition'),
      mode: ['create','edit', 'properties'],
      deps: ['tgdeferrable', 'is_constraint_trigger'],
      readonly: (state) => {
        // If Deferrable is set to True then only enable it
        let tgdeferrable = state.tgdeferrable;
        if(!obj.inSchemaWithModelCheck(state)) {
          if(!_.isUndefined(tgdeferrable) && tgdeferrable) {
            return false;
          } else {
            // If value is already set then reset it to false
            if(obj.tginitdeferred) {
              state.tginitdeferred = false;
            }
            // If constraint trigger is set then do not disable
            return state.is_constraint_trigger ? false : true;
          }
        } else {
          // readonly it
          return true;
        }
      },
      disabled: (state) => {
        return obj.isDisable(state);
      }
    },{
      id: 'tfunction', label: gettext('Trigger function'),
      type: 'select', readonly: obj.inSchemaWithModelCheck,
      mode: ['create','edit', 'properties'], group: gettext('Definition'),
      control: 'node-ajax-options', url: 'get_triggerfunctions', url_jump_after_node: 'schema',
      options: obj.fieldOptions.triggerFunction,
      cache_node: 'trigger_function',
    },{
      id: 'tgargs', label: gettext('Arguments'), cell: 'text',
      group: gettext('Definition'),
      type: 'text',mode: ['create','edit', 'properties'], deps: ['tfunction'],
      readonly: (state) => {
        // We will disable it when EDB PPAS and trigger function is
        // set to Inline EDB-SPL
        let tfunction = state.tfunction,
          server_type = obj.nodeInfo.server.server_type;
        if(!obj.inSchemaWithModelCheck(state)) {
          if(server_type === 'ppas' &&
            !_.isUndefined(tfunction) &&
              tfunction === 'Inline EDB-SPL') {
            // Disable and clear its value
            state.tgargs = undefined;
            return true;
          } else {
            return false;
          }
        } else {
          // Disable it
          return true;
        }
      },
    },{
      id: 'fires', label: gettext('Fires'), deps: ['is_constraint_trigger'],
      mode: ['create','edit', 'properties'], group: gettext('Events'),
      options: () => {
        let table_options = [
            {label: 'BEFORE', value: 'BEFORE'},
            {label: 'AFTER', value: 'AFTER'}],
          view_options = [
            {label: 'BEFORE', value: 'BEFORE'},
            {label: 'AFTER', value: 'AFTER'},
            {label: 'INSTEAD OF', value: 'INSTEAD OF'}];
        // If we are under table then show table specific options
        if(_.indexOf(Object.keys(obj.nodeInfo), 'table') != -1) {
          return table_options;
        } else {
          return view_options;
        }
      },
      type: 'select', controlProps: { allowClear: false },
      readonly: (state) => {
        if (!obj.isNew())
          return true;
        // If contraint trigger is set to True then only enable it
        let is_constraint_trigger = state.is_constraint_trigger;
        if(!obj.inSchemaWithModelCheck(state)) {
          if(!_.isUndefined(is_constraint_trigger) &&
            is_constraint_trigger === true) {
            state.fires = 'AFTER';
            return true;
          } else {
            return false;
          }
        } else {
          // Check if it is row trigger then enabled it.
          let fires_ = state.fires;
          return !(!_.isUndefined(fires_) && obj.nodeInfo.server.server_type == 'ppas');
        }
      },
    },{
      type: 'nested-fieldset', mode: ['create','edit', 'properties'],
      label: gettext('Events'), group: gettext('Events'),
      schema: new EventSchema({nodeInfo: obj.nodeInfo}),
    },{
      id: 'whenclause', label: gettext('When'),
      type: 'sql',
      readonly: obj.inSchemaWithModelCheck,
      mode: ['create', 'edit', 'properties'], visible: true,
      group: gettext('Events'),
    },{
      id: 'columns', label: gettext('Columns'),
      type: 'select', controlProps: { multiple: true },
      deps: ['evnt_update'], group: gettext('Events'),
      options: obj.fieldOptions.columns,
      readonly: (state) => {
        if(obj.nodeInfo &&  'catalog' in obj.nodeInfo) {
          return true;
        }
        //Disable in edit mode
        if (!obj.isNew()) {
          return true;
        }
        // Enable column only if update event is set true
        let isUpdate = state.evnt_update;
        return !(!_.isUndefined(isUpdate) && isUpdate);
      },
    },{
      id: 'tgoldtable', label: gettext('Old table'),
      type: 'text', group: gettext('Transition'),
      cell: 'text', mode: ['create', 'edit', 'properties'],
      deps: ['fires', 'is_constraint_trigger', 'evnt_insert', 'evnt_update', 'evnt_delete', 'columns'],
      disabled: obj.disableTransition,
    },{
      id: 'tgnewtable', label: gettext('New table'),
      type: 'text', group: gettext('Transition'),
      cell: 'string', mode: ['create', 'edit', 'properties'],
      deps: ['fires', 'is_constraint_trigger', 'evnt_insert', 'evnt_update', 'evnt_delete', 'columns'],
      disabled: obj.disableTransition,
    },{
      id: 'prosrc', label: gettext('Code'), group: gettext('Code'),
      type: 'sql', mode: ['create', 'edit'], deps: ['tfunction'],
      isFullTab: true,
      visible: true,
      disabled: (state) => {
        // We will enable it only when EDB PPAS and trigger function is
        // set to Inline EDB-SPL
        let tfunction = state.tfunction,
          server_type = obj.nodeInfo.server.server_type;

        return (server_type !== 'ppas' ||
        _.isUndefined(tfunction) ||
          tfunction !== 'Inline EDB-SPL');
      },
      depChange: (state) => {
        if (state.tfunction == null) {
          return { prosrc: '' };
        }
      }
    },{
      id: 'is_sys_trigger', label: gettext('System trigger?'), cell: 'text',
      type: 'switch', disabled: obj.inSchemaWithModelCheck, mode: ['properties'],
    },{
      id: 'description', label: gettext('Comment'), cell: 'string',
      type: 'multiline', mode: ['properties', 'create', 'edit'],
      disabled: obj.inCatalog(),
    }];
  }

  validate(state, setError) {
    let errmsg = null;

    if (isEmptyString(state.service)) {

      /* trigger function validation*/
      if (isEmptyString(state.tfunction)) {
        errmsg = gettext('Trigger function cannot be empty.');
        setError('tfunction', errmsg);
        return true;
      } else {
        setError('tfunction', null);
      }
    }
  }
}

