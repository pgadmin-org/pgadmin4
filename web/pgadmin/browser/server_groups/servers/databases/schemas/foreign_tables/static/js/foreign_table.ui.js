/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import SecLabelSchema from '../../../../../static/js/sec_label.ui';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import OptionsSchema from '../../../../../static/js/options.ui';
import { isEmptyString } from 'sources/validators';
import VariableSchema from 'top/browser/server_groups/servers/static/js/variable.ui';

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

  inSchemaWithColumnCheck(state) {
    if(this.nodeInfo &&  ('schema' in this.nodeInfo)) {
      if(this.isNew(state)) {
        return false;
      }

      // We will disable control if it's system columns
      // inheritedfrom check is useful when we use this schema in table node
      // inheritedfrom has value then we should disable it
      if (!isEmptyString(state.inheritedfrom)){
        return true;
      }

      // ie: it's position is less than 1
      return !(!_.isUndefined(state.attnum) && state.attnum > 0);
    }
    return false;
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
        canAdd: true, canDelete: true, canEdit: true, columns: ['name', 'cltype', 'attprecision', 'attlen', 'inheritedfrom'],
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
      name: undefined,
      description: undefined,
      atttypid: undefined,
      cltype: undefined,
      edit_types: undefined,
      attlen: undefined,
      attprecision: undefined,
      defval: undefined,
      attnotnull: false,
      collspcname: undefined,
      attstattarget:undefined,
      attnum: undefined,
      inheritedfrom: undefined,
      inheritedid: undefined,
      coloptions: [],
      colconstype: 'n',
    });

    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.nodeInfo = nodeInfo;
    this.cltypeOptions = datatypeOptions;
    this.collspcnameOptions = collspcnameOptions;

    this.datatypes = [];
  }

  get idAttribute() {
    return 'attnum';
  }

  editable_check_for_column(state) {
    return (_.isUndefined(state.inheritedid) || _.isNull(state.inheritedid) || _.isUndefined(state.inheritedfrom) || _.isNull(state.inheritedfrom)) ? true : false;
  }

  // Check whether the column is a generated column
  isTypeGenerated(state) {
    let colconstype = state.colconstype;
    return (!_.isUndefined(colconstype) && !_.isNull(colconstype) && colconstype == 'g');
  }

  attlenRange(state) {
    for(let o of this.datatypes) {
      if ( state.cltype == o.value ) {
        if(o.length) return {min: o.min_val || 0, max: o.max_val};
      }
    }
    return null;
  }

  attprecisionRange(state) {
    for(let o of this.datatypes) {
      if ( state.cltype == o.value ) {
        if(o.precision) return {min: o.min_val || 0, max: o.max_val};
      }
    }
    return null;
  }

  attCell(state) {
    return { cell: this.attlenRange(state) ? 'int' : '' };
  }

  get baseFields() {
    let obj = this;

    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', editable: obj.editable_check_for_column, noEmpty: true,
        minWidth: 115,
        disabled: (state)=>{
          return state.is_inherited;
        },
      },
      {
        id: 'description', label: gettext('Comment'), cell: 'text',
        type: 'multiline', mode: ['properties', 'create', 'edit'],
      },
      {
        id: 'cltype', 
        label: gettext('Data type'), 
        minWidth: 150,
        group: gettext('Definition'), 
        noEmpty: true,
        editable: obj.editable_check_for_column,
        disabled: (state)=>{
          return state.is_inherited;
        },
        options: obj.cltypeOptions,
        optionsLoaded: (options)=>{
          obj.datatypes = options;
        },
        cell: (row)=>{
          return {
            cell: 'select',
            options: this.cltypeOptions,
            controlProps: {
              allowClear: false,
              filter: (options)=>{
                let result = options;
                let edit_types = row?.edit_types || [];
                if(!obj.isNew(row) && !this.inErd) {
                  result = _.filter(options, (o)=>edit_types.indexOf(o.value) > -1);
                }
                return result;
              },
            }
          };
        },
        type: (state)=>{
          return {
            type: 'select',
            options: this.cltypeOptions,
            controlProps: {
              allowClear: false,
              filter: (options)=>{
                let result = options;
                let edit_types = state?.edit_types || [];
                if(!obj.isNew(state) && !this.inErd) {
                  result = _.filter(options, (o)=>edit_types.indexOf(o.value) > -1);
                }
                return result;
              },
            }
          };
        },
        controlProps: {
          allowClear: false,
        }
      },
      {
        id: 'inheritedfrom', label: gettext('Inherited from'), cell: 'label', type: 'text',
        readonly: true, editable: false, mode: ['create','properties', 'edit'],
      },
      {
        id: 'attnum', label: gettext('Position'), cell: 'text',
        type: 'text', disabled: obj.inCatalog(), mode: ['properties'],
      },
      {
        id: 'attlen',
        label: gettext('Length'), 
        group: gettext('Definition'),
        deps: ['cltype'],
        type: 'int',
        minWidth: 60,
        cell: (state)=>{
          return obj.attCell(state);
        },
        depChange: (state)=>{
          let range = this.attlenRange(state);
          if(range) {
            return {
              ...state, min_val_attlen: range.min, max_val_attlen: range.max,
            };
          } else {
            return {
              ...state, attlen: null,
            };
          }
        },
        disabled: function(state) {
          return !obj.attlenRange(state);
        },
        editable: function(state) {
          // inheritedfrom has value then we should disable it
          if (!isEmptyString(state.inheritedfrom)) {
            return false;
          }
          return Boolean(obj.attlenRange(state));
        },


      },{
        id: 'min_val_attlen', skipChange: true, visible: false, type: '',
      },{
        id: 'max_val_attlen', skipChange: true, visible: false, type: '',
      },{
        id: 'attprecision', label: gettext('Scale'), width: 60, disableResizing: true,
        deps: ['cltype'], type: 'int', group: gettext('Definition'),
        cell: (state)=>{
          return obj.attCell(state);
        },
        depChange: (state)=>{
          let range = this.attprecisionRange(state);
          if(range) {
            return {
              ...state, min_val_attprecision: range.min, max_val_attprecision: range.max,
            };
          } else {
            return {
              ...state, attprecision: null,
            };
          }
        },
        disabled: function(state) {
          return !this.attprecisionRange(state);
        },
        editable: function(state) {
          // inheritedfrom has value then we should disable it
          if (!isEmptyString(state.inheritedfrom)) {
            return false;
          }
          return Boolean(this.attprecisionRange(state));
        },
      },{
        id: 'min_val_attprecision', skipChange: true, visible: false, type: '',
      },{
        id: 'max_val_attprecision', skipChange: true, visible: false, type: '',
      },
      {
        id: 'attstattarget', 
        label: gettext('Statistics'), 
        cell: 'text',
        type: 'text', 
        readonly: obj.inSchemaWithColumnCheck,
        mode: ['properties', 'edit'],
        group: gettext('Definition'),
      },
      {
        id: 'attstorage', label: gettext('Storage'), group: gettext('Definition'),
        type: 'select', mode: ['properties', 'edit'],
        cell: 'select', readonly: obj.inSchemaWithColumnCheck,
        controlProps: { placeholder: gettext('Select storage'),
          allowClear: false,
        },
        options: [
          {label: 'PLAIN', value: 'p'},
          {label: 'MAIN', value: 'm'},
          {label: 'EXTERNAL', value: 'e'},
          {label: 'EXTENDED', value: 'x'},
        ],
      },
      {
        id: 'defval',
        label: gettext('Default'),
        cell: 'text',
        type: 'text',
        group: gettext('Constraints'),
        editable: (state) => {
          if(!(_.isUndefined(state.inheritedid)
            || _.isNull(state.inheritedid)
            || _.isUndefined(state.inheritedfrom)
            || _.isNull(state.inheritedfrom))) { return false; }

          return obj.nodeInfo.server.version >= 90300;
        },
      },
      {
        id: 'attnotnull', 
        label: gettext('Not NULL?'), 
        cell: 'switch',
        type: 'switch', 
        minWidth: 80,
        group: gettext('Constraints'), 
        editable: obj.editable_check_for_column,
      },
      {
        id: 'colconstype',
        label: gettext('Type'),
        cell: 'text',
        group: gettext('Constraints'),
        type: (state)=>{
          let options = [
            { 'label': gettext('NONE'), 'value': 'n'},
          ];           
          // You can't change the existing column to Generated column.
          if (this.isNew(state)) {
            options.push({
              'label': gettext('GENERATED'),
              'value': 'g',
            });
          } else {
            options.push({
              'label': gettext('GENERATED'),
              'value': 'g',
              'disabled': true,
            });
          }  
          return {
            type: 'toggle',
            options: options,
          };
        },
        disabled: function(state) {
          return (!this.isNew(state) && state.colconstype == 'g');
        }, 
        min_version: 120000,
      },
      {
        id: 'genexpr', 
        label: gettext('Expression'), 
        type: 'text',
        mode: ['properties', 'create', 'edit'], 
        group: gettext('Constraints'),
        min_version: 120000, 
        deps: ['colconstype'], 
        visible: this.isTypeGenerated,
        readonly: function(state) {
          return !this.isNew(state);
        },
      },
      {
        id: 'attoptions', label: gettext('Variables'), type: 'collection',
        group: gettext('Variables'),
        schema: new VariableSchema([
          {label: 'n_distinct', value: 'n_distinct', vartype: 'string'},
          {label: 'n_distinct_inherited', value: 'n_distinct_inherited', vartype: 'string'}
        ], null, null, ['name', 'value']),
        uniqueCol : ['name'], mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
      },
      {
        id: 'collspcname', label: gettext('Collation'), cell: 'select',
        type: 'select', group: gettext('Definition'),
        deps: ['cltype'], options: obj.collspcnameOptions,
        disabled: (state)=>{
          if (!(_.isUndefined(obj.isNew)) && !obj.isNew(state)) { return false; }

          return (_.isUndefined(state.inheritedid)
                || _.isNull(state.inheritedid) ||
                  _.isUndefined(state.inheritedfrom) || 
                  _.isNull(state.inheritedfrom));
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
