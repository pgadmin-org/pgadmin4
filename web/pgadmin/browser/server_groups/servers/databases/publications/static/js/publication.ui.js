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
import _ from 'lodash';

export class DefaultWithSchema extends BaseUISchema {
  constructor(node_info) {
    super();
    this.node_info = node_info;
  }

  get baseFields() {
    return[{
      id: 'evnt_insert', label: gettext('INSERT'),
      type: 'switch', mode: ['create','edit', 'properties'],
      group: gettext('With'),
    },{
      id: 'evnt_update', label: gettext('UPDATE'),
      type: 'switch', mode: ['create','edit', 'properties'],
      group: gettext('With'),
    },{
      id: 'evnt_delete', label: gettext('DELETE'),
      type: 'switch', mode: ['create','edit', 'properties'],
      group: gettext('With'),
    },{
      id: 'evnt_truncate', label: gettext('TRUNCATE'),
      type: 'switch', group: gettext('With'),
      min_version: 110000,
    },{
      id: 'publish_via_partition_root', label: gettext('Publish via root?'),
      type: 'switch', group: gettext('With'),
      min_version: 130000,
    },
    ];
  }
}

export class PublicationTableSchema extends BaseUISchema {
  constructor(allTables,getColumns) {
    super({
      table_name: undefined,
      where: undefined,
      columns:undefined,
    });
    this.allTables = allTables;
    this.getColumns=getColumns;
    this.allTablesOptions = [];
    this.varTypes = {};
    this.allReadOnly = false;
  }

  isConnected(state) {
    return Boolean(state.connected);
  }

  getPlaceHolderMsg(variable) {
    let msg = '';
    if (variable?.min_server_version && variable?.max_server_version) {
      msg = gettext('%s <= Supported version >= %s', variable?.max_server_version, variable?.min_server_version);
    } else if (variable?.min_server_version) {
      msg = gettext('Supported version >= %s', variable?.min_server_version);
    } else if (variable?.max_server_version) {
      msg = gettext('Supported version <= %s', variable?.max_server_version);
    }
    return msg;
  }

  getTableOid(tabName) {
    // Here we will fetch the table oid from table name
    // iterate over list to find table oid
    for(const t of this.allTablesOptions) {
      if(t.label === tabName) {
        return t.tid;
      }
    }
  }

  isTableName(state){
    return Boolean(state.table_name);
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'table_name',
        label: gettext('Table Name'),
        type: 'select',
        noEmpty: true,
        disabled:function (state) {
          return !obj.isNew(state);
        },
        editable: function (state) {
          return obj.isNew(state) || !obj.allReadOnly;
        },
        cell: () => ({
          cell: 'select',
          options: this.allTables,
          optionsLoaded: (options) => {
            obj.allTablesOptions=options;
          },
          controlProps: { allowClear: false },
        }),
      },
      {
        id: 'columns',
        label: gettext('Columns'),
        type: 'select',
        deps:['table_name'],
        disabled: (state) => !obj.isTableName(state),
        depChange: (state) => {
          if(!state.table_name) {
            return {
              columns: null,
            };
          }
        },
        editable: function (state) {
          return obj.isNew(state) || !obj.allReadOnly;
        },
        cell: (state) => {
          let tid = obj.getTableOid(state.table_name);
          return{
            cell: 'select',
            options: (state.table_name && tid) ? ()=>obj.getColumns({tid: tid}) : [],
            optionsReloadBasis: tid,
            controlProps: { allowClear: true, multiple: true},
          };
        },
      },
      {
        id: 'where',
        label: gettext('Where'),
        type: 'sql',
        deps: ['table_name'],
        disabled: (state) => !obj.isTableName(state),
        editable: function (state) {
          return obj.isNew(state) || !obj.allReadOnly;
        },
        cell: () => ({
          cell: 'sql',
          controlProps: {
            lineWrapping: true,
          }
        }),
      },
    ];
  }
}

export default class PublicationSchema extends BaseUISchema {
  constructor(fieldOptions={}, node_info={}, initValues={}) {
    super({
      name: undefined,
      pubowner: (node_info) ? node_info['node_info']?.user.name: undefined,
      pubtable: [],
      pubtable_names: [],
      pubschema: undefined,
      all_table: false,
      evnt_insert:true,
      evnt_delete:true,
      evnt_update:true,
      evnt_truncate:true,
      only_table: undefined,
      publish_via_partition_root: false,
      ...initValues,
    });

    this.fieldOptions = {
      role: [],
      allTables: [],
      allSchemas:[],
      ...fieldOptions,
    };
    this.node_info = node_info;
    this.paramSchema = new PublicationTableSchema(this.fieldOptions.allTables, this.fieldOptions.getColumns);
    this.version=!_.isUndefined(this.node_info['node_info']) && !_.isUndefined(this.node_info['node_info'].version) && this.node_info['node_info'].version;

  }
 
  get idAttribute() {
    return 'oid';
  }

  isAllTable(state) {
    let allTable = state.all_table;
    if(allTable){
      state.pubtable = [];
      state.pubtable_names = '';
      state.pubschema = undefined;
      return true;
    }
    return false;
  }

  isTable(state) {
    let allTable = state.all_table,
      table = state.pubtable;
    if(allTable){
      state.only_table = false;
      return true;
    }
    if (!_.isUndefined(table) && table.length > 0 && !_.isEqual(this._origData.pubtable, state.pubtable)){
      return false;
    }
    state.only_table = false;
    return true;
  }

  isColumn(state){
    let table=state.pubtable, columnsList=[];
    if(!_.isUndefined(table) && table.length > 0){
      table?.forEach(i=>{
        if(i.columns!=undefined && i.columns.length!==0){
          columnsList.push(i.columns);
        }
      });
      if(columnsList?.length > 0){
        state.pubschema=undefined;
        return true;
      }
      return false;
    }
  }

  isConnected(state) {
    return Boolean(state.connected);
  }

  getVersion(){
    return (
      !_.isUndefined(this.node_info['node_info']) &&
      !_.isUndefined(this.node_info['node_info'].version) &&
      this.node_info['node_info'].version
    );
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), type: 'text',
      mode: ['properties', 'create', 'edit'], noEmpty: true,
      min_version: 100000,
    },{
      id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
      type: 'text',
    },{
      id: 'pubowner', label: gettext('Owner'), type: 'select',
      options: this.fieldOptions.role,
      disabled: ()  => {
        return obj.isNew();
      },
      mode: ['edit', 'properties', 'create'], controlProps: { allowClear: false},
    },{
      id: 'all_table', label: gettext('All tables?'), type: 'switch',
      group: gettext('Tables'), mode: ['edit', 'properties', 'create'], deps: ['name'],
      readonly: (state)  => {return !obj.isNew(state);},
    },{
      id: 'only_table', label: gettext('Only table?'), type: 'switch',
      group: gettext('Tables'), mode: ['edit', 'create'],
      deps: ['name', 'pubtable', 'all_table'], readonly: (state)  => {
        if(obj.isNew(state))
          return obj.isTable(state);
        else
          return true;
      },
      helpMessageMode: ['edit', 'create'],
      helpMessage: gettext('If ONLY is specified before the table name, only that table is added to the publication. If ONLY is not specified, the table and all its descendant tables (if any) are added.'),
    },{
      id: 'pubschema', label: gettext('Tables in Schema'), type: 'select',
      controlProps: { allowClear: true, multiple: true, creatable: true },
      options: this.fieldOptions.allSchemas, deps: ['all_table','pubtable'], 
      disabled: (state)=>{return obj.isColumn(state) || obj.isAllTable(state);},
      group: this.version < 150000 ? null : gettext('Tables'), mode: ['edit', 'create', 'properties'],
      min_version: 150000, 
    },
    {
      id: 'pubtable_names', label: gettext('Tables'), cell: 'string',
      type: (state)=>{
        let table= (!_.isUndefined(state?.pubtable_names) && state?.pubtable_names.length > 0) ? state?.pubtable_names : [];
        return {
          type: 'select',
          options: table,
          controlProps: { allowClear: true, multiple: true, creatable: true },
        };
      },  
      group: gettext('Tables'), mode: ['properties'],
      deps: ['all_table'], disabled: obj.isAllTable,
    },
    {
      id: 'pubtable', label: this.version < 150000 ? gettext('Tables') : gettext(''), 
      type: this.version < 150000 ? 'select' : 'collection',
      controlProps: this.version < 150000 ? { allowClear: true, multiple: true, creatable: true } : null,
      options: this.version < 150000 ? this.fieldOptions.allTables : [],
      group: gettext('Tables'), mode: ['edit', 'create'],
      deps: ['all_table'], disabled: obj.isAllTable, schema: this.version < 150000 ? null : this.paramSchema,
      uniqueCol: this.version < 150000 ? null : ['table_name'], 
      canAdd: this.version < 150000 ? null : (state)=> !obj.isConnected(state),
      canDelete: this.version<150000?null : (state)=> !obj.isConnected(state),
    },
    {
      type: 'nested-fieldset', mode: ['create','edit', 'properties'],
      label: gettext('With'), group: gettext('Options'),
      schema : new DefaultWithSchema(this.node_info),
    },
    ];
  }
}