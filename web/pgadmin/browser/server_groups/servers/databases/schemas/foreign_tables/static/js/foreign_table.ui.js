/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import SecLabelSchema from '../../../../../static/js/sec_label.ui';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import OptionsSchema from '../../../../../static/js/options.ui';
import { isEmptyString } from 'sources/validators';

import _ from 'lodash';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import { getNodeAjaxOptions } from '../../../../../../../static/js/node_ajax';


export default class ForeignTableSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, getVariableSchema, getColumns, fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      owner: undefined,
      basensp: undefined,
      is_sys_obj: undefined,
      description: undefined,
      ftsrvname: undefined,
      strftoptions: undefined,
      inherits: [],
      columns: [],
      ftoptions: [],
      relacl: [],
      seclabels: [],
      ...initValues
    });

    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.getVariableSchema = getVariableSchema;
    this.getColumns = getColumns;
    this.inheritedTableList = [];
    this.fieldOptions = {
      role: [],
      schema: [],
      foreignServers: [],
      tables: [],
      nodeInfo: null,
      ...fieldOptions,
    };

    this.columnsObj = getNodeColumnSchema(this.fieldOptions.nodeInfo, this.fieldOptions.nodeData, this.fieldOptions.pgBrowser);
  }

  get idAttribute() {
    return 'oid';
  }

  canEditDeleteRowColumns(colstate) {
    return isEmptyString(colstate.inheritedfrom);
  }

  getTableOid(tabId) {
    // Here we will fetch the table oid from table name
    // iterate over list to find table oid
    for(const t of this.inheritedTableList) {
      if(t.value === tabId) {
        return t.value;
      }
    }
  }


  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', mode: ['properties', 'create', 'edit'],
        noEmpty: true
      },{
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text' , mode: ['properties'],
      },{
        id: 'owner', label: gettext('Owner'), cell: 'text',
        type: 'select', controlProps: { allowClear: false },
        options: obj.fieldOptions.role
      },{
        id: 'basensp', label: gettext('Schema'), cell: 'text',
        type: 'select', mode:['create', 'edit'],
        options: obj.fieldOptions.schema
      },{
        id: 'is_sys_obj', label: gettext('System foreign table?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      },{
        id: 'description', label: gettext('Comment'), cell: 'text',
        type: 'multiline',
      },{
        id: 'ftsrvname', label: gettext('Foreign server'), cell: 'text',
        type: 'select', group: gettext('Definition'),
        options: obj.fieldOptions.foreignServers,
        readonly: (state) => { return !obj.isNew(state); },
      },{
        id: 'inherits', label: gettext('Inherits'), group: gettext('Definition'),
        type: 'select', min_version: 90500, controlProps: {multiple: true},
        options: obj.fieldOptions.tables,
        optionsLoaded: (res)=>obj.inheritedTableList=res,
        deferredDepChange: (state, source, topState, actionObj)=>{
          return new Promise((resolve)=>{
            // current table list and previous table list
            let newColInherits = state.inherits || [];
            let oldColInherits = actionObj.oldState.inherits || [];

            let tabName = undefined;
            let tabColsResponse;

            // Add columns logic
            // If new table is added in list
            if(newColInherits.length > 1 && newColInherits.length > oldColInherits.length) {
              // Find newly added table from current list
              tabName = _.difference(newColInherits, oldColInherits);
              tabColsResponse = obj.getColumns({attrelid: this.getTableOid(tabName[0])});
            } else if (newColInherits.length == 1) {
              // First table added
              tabColsResponse = obj.getColumns({attrelid: this.getTableOid(newColInherits[0])});
            }

            if(tabColsResponse) {
              tabColsResponse.then((res)=>{
                resolve((tmpstate)=>{
                  let finalCols = res.map((col)=>obj.columnsObj.getNewData(col));
                  finalCols = [...tmpstate.columns, ...finalCols];
                  return {
                    adding_inherit_cols: false,
                    columns: finalCols,
                  };
                });
              });
            }

            // Remove columns logic
            let removeOid;
            if(newColInherits.length > 0 && newColInherits.length < oldColInherits.length) {
              // Find deleted table from previous list
              tabName = _.difference(oldColInherits, newColInherits);
              removeOid = this.getTableOid(tabName[0]);
            } else if (oldColInherits.length === 1 && newColInherits.length < 1) {
              // We got last table from list
              tabName = oldColInherits[0];
              removeOid = this.getTableOid(tabName);
            }
            if(removeOid) {
              resolve((tmpstate)=>{
                let finalCols = tmpstate.columns;
                _.remove(tmpstate.columns, (col)=>col.inheritedid==removeOid);
                return {
                  adding_inherit_cols: false,
                  columns: finalCols
                };
              });
            }
          });
        },
      },
      {
        id: 'columns', label: gettext('Columns'), cell: 'text',
        type: 'collection', group: gettext('Columns'), mode: ['edit', 'create'],
        schema: this.columnsObj,
        canAdd: true, canDelete: true, canEdit: true, columns: ['attname', 'datatype', 'inheritedfrom'],
        // For each row edit/delete button enable/disable
        canEditRow: this.canEditDeleteRowColumns,
        canDeleteRow: this.canEditDeleteRowColumns,
      },
      {
        id: 'constraints', label: gettext('Constraints'), cell: 'text',
        type: 'collection', group: gettext('Constraints'), mode: ['edit', 'create'],
        schema: new CheckConstraintSchema(),
        canAdd: true, canDelete: true, columns: ['conname','consrc', 'connoinherit', 'convalidated'],
        canEdit: true,
        canDeleteRow: function(state) {
          return (state.conislocal || _.isUndefined(state.conislocal)) ? true : false;
        },
        canEditRow: function(state) {
          return obj.isNew(state);
        }
      },
      {
        id: 'strftoptions', label: gettext('Options'), cell: 'text',
        type: 'text', group: gettext('Definition'), mode: ['properties'],
      },
      {
        id: 'ftoptions', label: gettext('Options'), type: 'collection',
        schema: new OptionsSchema('option', 'value'),
        group: gettext('Options'),
        mode: ['edit', 'create'],
        canAdd: true, canDelete: true, uniqueCol : ['option'],
      },
      {
        id: 'acl', label: gettext('Privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'], min_version: 90200,
      },
      {
        id: 'relacl', label: gettext('Privileges'), type: 'collection',
        schema: this.getPrivilegeRoleSchema(['a','r','w','x']),
        uniqueCol : ['grantee', 'grantor'],
        editable: false,
        group: gettext('Security'), mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
        min_version: 90200
      },
      {
        id: 'seclabels', label: gettext('Security labels'), type: 'collection',
        schema: new SecLabelSchema(),
        editable: false, group: gettext('Security'),
        mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
        uniqueCol : ['provider'],
        min_version: 90100,
        disabled: obj.inCatalog()
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;

    if (isEmptyString(state.service)) {

      /* code validation*/
      if (isEmptyString(state.ftsrvname)) {
        errmsg = gettext('Foreign server cannot be empty.');
        setError('ftsrvname', errmsg);
        return true;
      } else {
        setError('ftsrvname', null);
      }

    }
  }
}


export function getNodeColumnSchema(treeNodeInfo, itemNodeData, pgBrowser) {
  return new ColumnSchema(
    {},
    (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
    treeNodeInfo,
    ()=>getNodeAjaxOptions('get_types', pgBrowser.Nodes['table'], treeNodeInfo, itemNodeData, {
      cacheLevel: 'table',
    }),
    ()=>getNodeAjaxOptions('get_collations', pgBrowser.Nodes['collation'], treeNodeInfo, itemNodeData),
  );
}

export class ColumnSchema extends BaseUISchema {
  constructor(initValues, getPrivilegeRoleSchema, nodeInfo, datatypeOptions, collspcnameOptions) {
    super({
      attname: undefined,
      datatype: undefined,
      typlen: undefined,
      precision: undefined,
      typdefault: undefined,
      attnotnull: undefined,
      collname: undefined,
      attnum: undefined,
      inheritedfrom: undefined,
      inheritedid: undefined,
      attstattarget: undefined,
      coloptions: [],
    });

    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.nodeInfo = nodeInfo;
    this.datatypeOptions = datatypeOptions;
    this.collspcnameOptions = collspcnameOptions;

    this.datatypes = [];

  }

  get idAttribute() {
    return 'attnum';
  }

  editable_check_for_column(state) {
    return (_.isUndefined(state.inheritedid) || _.isNull(state.inheritedid) || _.isUndefined(state.inheritedfrom) || _.isNull(state.inheritedfrom)) ? true : false;
  }

  get baseFields() {
    let obj = this;

    return [
      {
        id: 'attname', label: gettext('Name'), cell: 'text',
        type: 'text', editable: obj.editable_check_for_column, noEmpty: true,
        minWidth: 115,
      },
      {
        id: 'datatype', label: gettext('Data type'), minWidth: 150,
        group: gettext('Definition'), noEmpty: true,
        editable: obj.editable_check_for_column,
        options: obj.datatypeOptions,
        optionsLoaded: (options)=>{
          obj.datatypes = options;
          obj.type_options = options;
        },
        cell: 'select',
        controlProps: {
          allowClear: false,
        },
        type: 'select'
      },
      {
        id: 'inheritedfrom', label: gettext('Inherited From'), cell: 'label',
        type: 'label', readonly: true, editable: false, mode: ['properties', 'edit'],
      },
      {
        id: 'attnum', label: gettext('Position'), cell: 'text',
        type: 'text', disabled: obj.inCatalog(), mode: ['properties'],
      },
      {
        id: 'typlen', label: gettext('Length'), cell: 'int',
        deps: ['datatype'], type: 'int', group: gettext('Definition'), width: 120, minWidth: 120,
        disabled: (state) => {
          let val = state.typlen;
          // We will store type from selected from combobox
          if(!(_.isUndefined(state.inheritedid)
            || _.isNull(state.inheritedid)
            || _.isUndefined(state.inheritedfrom)
            || _.isNull(state.inheritedfrom))) {

            if (!_.isUndefined(val)) {
              state.typlen = undefined;
            }
            return true;
          }

          let of_type = state.datatype,
            has_length = false;
          if(obj.type_options) {
            state.is_tlength = false;

            // iterating over all the types
            _.each(obj.type_options, function(o) {
            // if type from selected from combobox matches in options
              if ( of_type == o.value ) {
              // if length is allowed for selected type
                if(o.length)
                {
                // set the values in model
                  has_length = true;
                  state.is_tlength = true;
                  state.min_val = o.min_val;
                  state.max_val = o.max_val;
                }
              }
            });

            if (!has_length && !_.isUndefined(val)) {
              state.typlen = undefined;
            }

            return !(state.is_tlength);
          }
          if (!has_length && !_.isUndefined(val)) {
            state.typlen = undefined;
          }
          return true;
        },
      },
      {
        id: 'precision', label: gettext('Precision'), cell: 'int', minWidth: 60,
        deps: ['datatype'], type: 'int', group: gettext('Definition'),
        disabled: (state) => {
          let val = state.precision;
          if(!(_.isUndefined(state.inheritedid)
            || _.isNull(state.inheritedid)
            || _.isUndefined(state.inheritedfrom)
            || _.isNull(state.inheritedfrom))) {

            if (!_.isUndefined(val)) {
              state.precision = undefined;
            }
            return true;
          }

          let of_type = state.datatype,
            has_precision = false;

          if(obj.type_options) {
            state.is_precision = false;
            // iterating over all the types
            _.each(obj.type_options, function(o) {
            // if type from selected from combobox matches in options
              if ( of_type == o.value ) {
              // if precession is allowed for selected type
                if(o.precision)
                {
                  has_precision = true;
                  // set the values in model
                  state.is_precision = true;
                  state.min_val = o.min_val;
                  state.max_val = o.max_val;
                }
              }
            });
            if (!has_precision && !_.isUndefined(val)) {
              state.precision = undefined;
            }
            return !(state.is_precision);
          }
          if (!has_precision && !_.isUndefined(val)) {
            state.precision = undefined;
          }
          return true;
        },
      },
      {
        id: 'typdefault', label: gettext('Default'), cell: 'text',
        type: 'text', group: gettext('Definition'),
        controlProps: {placeholder: gettext('Enter an expression or a value.')},
        editable: (state) => {
          if(!(_.isUndefined(state.inheritedid)
            || _.isNull(state.inheritedid)
            || _.isUndefined(state.inheritedfrom)
            || _.isNull(state.inheritedfrom))) { return false; }

          return obj.nodeInfo.server.version >= 90300;
        },
      },
      {
        id: 'attnotnull', label: gettext('Not NULL?'), cell: 'switch',
        type: 'switch', minWidth: 80,
        group: gettext('Definition'), editable: obj.editable_check_for_column,
      },
      {
        id: 'attstattarget', label: gettext('Statistics'), cell: 'text',
        type: 'text', disabled: (state) => {
          if (obj.isNew()) {
            return false;
          }

          if (obj.nodeInfo.server.version < 90200) {
            return false;
          }

          return (_.isUndefined(state.inheritedid) || _.isNull(state.inheritedid) ||
        _.isUndefined(state.inheritedfrom) || _.isNull(state.inheritedfrom)) ? true : false;
        }, mode: ['properties', 'edit'],
        group: gettext('Definition'),
      },
      {
        id: 'collname', label: gettext('Collation'), cell: 'select',
        type: 'select', group: gettext('Definition'),
        deps: ['datatype'], options: obj.collspcnameOptions,
        disabled: (state)=>{
          if (!(_.isUndefined(obj.isNew)) && !obj.isNew(state)) { return false; }

          return (_.isUndefined(state.inheritedid) || _.isNull(state.inheritedid) ||
          _.isUndefined(state.inheritedfrom) || _.isNull(state.inheritedfrom)) ? true : false;
        }
      },
      {
        id: 'coloptions', label: gettext('Options'), type: 'collection',
        group: gettext('Options'),
        schema: new OptionsSchema('option', 'value'),
        uniqueCol : ['option'], mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
      }
    ];
  }
}


export class CheckConstraintSchema extends BaseUISchema {
  constructor() {
    super({
      name: undefined,
      oid: undefined,
      description: undefined,
      consrc: undefined,
      connoinherit: undefined,
      convalidated: true,
    });

    this.convalidated_default = true;

  }

  get idAttribute() {
    return 'conoid';
  }

  isReadonly(state) {
    return !this.isNew(state);
  }

  get baseFields() {
    let obj = this;

    return [{
      id: 'conname', label: gettext('Name'), type:'text', cell:'text',
      mode: ['properties', 'create', 'edit'],
      editable: (state) => {
        return _.isUndefined(obj.isNew) ? true : obj.isNew(state);
      }, noEmpty: true, readonly: obj.isReadonly
    },{
      id: 'consrc', label: gettext('Check'), type: 'multiline', cell: 'text',
      mode: ['properties', 'create', 'edit'],
      editable: (state) => {
        return _.isUndefined(obj.isNew) ? true : obj.isNew(state);
      }, noEmpty: true, readonly: obj.isReadonly
    },{
      id: 'connoinherit', label: gettext('No inherit?'), type: 'switch', cell: 'switch',
      mode: ['properties', 'create', 'edit'],
      deps: [['is_partitioned']],
      editable: (state) => {
        return _.isUndefined(obj.isNew) ? true : obj.isNew(state);
      }, readonly: obj.isReadonly
    },{
      id: 'convalidated', label: gettext('Validate?'), type: 'switch', cell: 'switch',
      readonly: obj.isReadonly,
      editable: (state) => {
        if (_.isUndefined(obj.isNew)) { return true; }
        if (!obj.isNew(state)) {
          return !(state.convalidated && obj.convalidated_default);
        }
        return true;
      },
      mode: ['properties', 'create', 'edit'],
    }];
  }
}
