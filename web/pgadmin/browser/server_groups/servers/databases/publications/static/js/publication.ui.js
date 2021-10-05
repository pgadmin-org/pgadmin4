/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
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
      visible: function() {
        if(!_.isUndefined(this.node_info['node_info']) && !_.isUndefined(this.node_info['node_info'])
          && !_.isUndefined(this.node_info['node_info'].version) &&
            this.node_info['node_info'].version >= 110000)
          return true;
        return false;
      },

    },{
      id: 'publish_via_partition_root', label: gettext('Publish via root?'),
      type: 'switch', group: gettext('With'),
      visible: function() {
        if(!_.isUndefined(this.node_info['node_info']) && !_.isUndefined(this.node_info['node_info'])
          && !_.isUndefined(this.node_info['node_info'].version) &&
            this.node_info['node_info'].version >= 130000)
          return true;
        return false;
      },
    }];
  }
}

export default class PublicationSchema extends BaseUISchema {
  constructor(fieldOptions={}, node_info, initValues) {
    super({
      name: undefined,
      pubowner: (node_info) ? node_info['node_info'].user.name: undefined,
      pubtable: undefined,
      all_table: undefined,
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
      publicationTable: [],
      ...fieldOptions,
    };
    this.node_info = node_info;
  }
  get idAttribute() {
    return 'oid';
  }

  isAllTable(state) {
    var allTable = state.all_table;
    if(allTable){
      state.pubtable = '';
      return true;
    }
    return false;
  }

  isTable(state) {
    var allTable = state.all_table,
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

  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), type: 'text',
      mode: ['properties', 'create', 'edit'], noEmpty: true,
      visible: function() {
        if(!_.isUndefined(this.node_info['node_info'])
            && !_.isUndefined(this.node_info['node_info'].version)
            && this.node_info['node_info'].version >= 100000) {
          return true;
        }
        return false;
      },
    },{
      id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
      type: 'text',
    },{
      id: 'pubowner', label: gettext('Owner'), type: 'select',
      options: this.fieldOptions.role,
      disabled: ()  => {
        if (obj.isNew())
          return true;
        return false;
      },
      mode: ['edit', 'properties', 'create'], controlProps: { allowClear: false},
    },{
      id: 'all_table', label: gettext('All tables?'), type: 'switch',
      group: gettext('Definition'), mode: ['edit', 'properties', 'create'], deps: ['name'],
      readonly: (state)  => {return !obj.isNew(state);},
    },{
      id: 'only_table', label: gettext('Only table?'), type: 'switch',
      group: gettext('Definition'), mode: ['edit', 'create'],
      deps: ['name', 'pubtable', 'all_table'], readonly: obj.isTable,
      helpMessageMode: ['edit', 'create'],
      helpMessage: gettext('If ONLY is specified before the table name, only that table is added to the publication. If ONLY is not specified, the table and all its descendant tables (if any) are added.'),
    },{
      id: 'pubtable', label: gettext('Tables'), type: 'select',
      controlProps: { allowClear: true, multiple: true, creatable: true },
      options: this.fieldOptions.publicationTable,
      group: gettext('Definition'), mode: ['edit', 'create'],
      deps: ['all_table'], disabled: obj.isAllTable,
    },{
      id: 'pubtable', label: gettext('Tables'), type: 'text', group: gettext('Definition'),
      mode: ['properties'],
    },{
      type: 'nested-fieldset', mode: ['create','edit', 'properties'],
      label: gettext('With'), group: gettext('Definition'),
      schema : new DefaultWithSchema(this.node_info),
    },
    ];
  }
}

