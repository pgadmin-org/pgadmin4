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
import SecLabelSchema from '../../../../../static/js/sec_label.ui';
import { emptyValidator, isEmptyString } from '../../../../../../../../static/js/validators';

export class OwnedBySchema extends BaseUISchema {
  constructor(allTables, getColumns) {
    super({
      owned_table: undefined,
      owned_column: undefined,
    });

    this.allTables = allTables;
    this.allTablesOptions = [];
    this.getColumns = getColumns;
  }

  getTableOid(tabName) {
    // Here we will fetch the table oid from table name
    // iterate over list to find table oid
    for(const t of this.allTablesOptions) {
      if(t.label === tabName) {
        return t._id;
      }
    }
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'owned_table', label: gettext('Table'), type: 'select', editable: false,
        options: obj.allTables,
        optionsLoaded: (res)=>obj.allTablesOptions=res,
      },{
        id: 'owned_column', label: gettext('Column'), editable: false, deps: ['owned_table'],
        type: (state)=>{
          let tid = obj.getTableOid(state.owned_table);
          return {
            type: 'select',
            options: state.owned_table ? ()=>obj.getColumns({tid: tid}) : [],
            optionsReloadBasis: state.owned_table,
          };
        },
      }
    ];
  }

  validate(state, setError) {
    if (!isEmptyString(state.owned_table) && isEmptyString(state.owned_column)) {
      setError('owned_column', gettext('Column cannot be empty.'));
      return true;
    } else {
      setError('owned_column', null);
    }
  }
}


export default class SequenceSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      seqowner: undefined,
      schema: undefined,
      is_sys_obj: undefined,
      comment: undefined,
      increment: undefined,
      start: undefined,
      current_value: undefined,
      minimum: undefined,
      maximum: undefined,
      cache: undefined,
      cycled: undefined,
      relacl: [],
      securities: [],
      ...initValues,
    });
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.fieldOptions = {
      role: [],
      schema: [],
      allTables: [],
      ...fieldOptions,
    };
    this.ownedSchemaObj = new OwnedBySchema(this.fieldOptions.allTables, this.fieldOptions.getColumns);
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', mode: ['properties', 'create', 'edit'],
        noEmpty: true,
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      }, {
        id: 'seqowner', label: gettext('Owner'),
        editable: false, type: 'select', options: this.fieldOptions.role,
        controlProps: { allowClear: false }
      }, {
        id: 'schema', label: gettext('Schema'),
        editable: false, type: 'select', options: this.fieldOptions.schema,
        controlProps: { allowClear: false },
        mode: ['create', 'edit'],
        cache_node: 'database', cache_level: 'database',
      }, {
        id: 'is_sys_obj', label: gettext('System sequence?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      }, {
        id: 'comment', label: gettext('Comment'), type: 'multiline',
        mode: ['properties', 'create', 'edit'],
      }, {
        id: 'current_value', label: gettext('Current value'), type: 'int',
        mode: ['properties', 'edit'], group: gettext('Definition'),
      }, {
        id: 'increment', label: gettext('Increment'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
      }, {
        id: 'start', label: gettext('Start'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
      }, {
        id: 'minimum', label: gettext('Minimum'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
      }, {
        id: 'maximum', label: gettext('Maximum'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
      }, {
        id: 'cache', label: gettext('Cache'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        min: 1,
      }, {
        id: 'cycled', label: gettext('Cycled'), type: 'switch',
        mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
      }, {
        type: 'nested-fieldset', label: gettext('Owned By'), group: gettext('Definition'),
        schema: this.ownedSchemaObj,
      }, {
        id: 'owned_by_note', type: 'note', group: gettext('Definition'),
        mode: ['create', 'edit'],
        text: gettext('The OWNED BY option causes the sequence to be associated with a specific table column, such that if that column (or its whole table) is dropped, the sequence will be automatically dropped as well. The specified table must have the same owner and be in the same schema as the sequence.'),
      }, {
        id: 'acl', label: gettext('Privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      }, {
        id: 'relacl', label: gettext('Privileges'), group: gettext('Security'), type: 'collection',
        schema: this.getPrivilegeRoleSchema(['r', 'w', 'U']),
        uniqueCol : ['grantee', 'grantor'], mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
      }, {
        id: 'securities', label: gettext('Security labels'), type: 'collection',
        editable: false, group: gettext('Security'),
        schema: new SecLabelSchema(),
        mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
        uniqueCol : ['provider'],
        min_version: 90200,
      }
    ];
  }
  /* validate function is used to validate the input given by
   * the user. In case of error, message will be displayed on
   * the GUI for the respective control.
   */
  validate(state, setError) {
    let errmsg = null,
      minimum = state.minimum,
      maximum = state.maximum,
      start = state.start;

    errmsg = emptyValidator('Owner', state.seqowner);
    if (errmsg) {
      setError('seqowner', errmsg);
      return true;
    } else {
      setError('seqowner', errmsg);
    }

    errmsg = emptyValidator('Schema', state.schema);
    if (errmsg) {
      setError('schema', errmsg);
      return true;
    } else {
      setError('schema', errmsg);
    }

    if (!this.isNew(state)) {
      errmsg = emptyValidator('Current value', state.current_value);
      if (errmsg) {
        setError('current_value', errmsg);
        return true;
      } else {
        setError('current_value', errmsg);
      }

      errmsg = emptyValidator('Increment value', state.increment);
      if (errmsg) {
        setError('increment', errmsg);
        return true;
      } else {
        setError('increment', errmsg);
      }

      errmsg = emptyValidator('Minimum value', state.minimum);
      if (errmsg) {
        setError('minimum', errmsg);
        return true;
      } else {
        setError('minimum', errmsg);
      }

      errmsg = emptyValidator('Maximum value', state.maximum);
      if (errmsg) {
        setError('maximum', errmsg);
        return true;
      } else {
        setError('maximum', errmsg);
      }

      errmsg = emptyValidator('Cache value', state.cache);
      if (errmsg) {
        setError('cache', errmsg);
        return true;
      } else {
        setError('cache', errmsg);
      }
    }

    let min_lt = gettext('Minimum value must be less than maximum value.'),
      start_lt = gettext('Start value cannot be less than minimum value.'),
      start_gt = gettext('Start value cannot be greater than maximum value.');

    if (isEmptyString(minimum) || isEmptyString(maximum))
      return null;

    if ((minimum == 0 && maximum == 0) ||
        (parseInt(minimum, 10) >= parseInt(maximum, 10))) {
      setError('minimum', min_lt);
      return true;
    } else {
      setError('minimum', null);
    }

    if (start && minimum && parseInt(start) < parseInt(minimum)) {
      setError('start', start_lt);
      return true;
    } else {
      setError('start', null);
    }

    if (start && maximum && parseInt(start) > parseInt(maximum)) {
      setError('start', start_gt);
      return true;
    } else {
      setError('start', null);
    }
    return null;
  }
}
