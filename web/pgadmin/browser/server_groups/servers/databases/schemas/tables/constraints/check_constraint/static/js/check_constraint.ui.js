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
import { isEmptyString } from 'sources/validators';
export default class CheckConstraintSchema extends BaseUISchema {
  constructor() {
    super({
      name: undefined,
      oid: undefined,
      description: undefined,
      consrc: undefined,
      connoinherit: undefined,
      convalidated: true,
    });
  }

  get idAttribute() {
    return 'oid';
  }

  get inTable() {
    if(_.isUndefined(this.nodeInfo)) {
      return true;
    }
    return _.isUndefined(this.nodeInfo['check_constraint']);
  }

  isReadonly(state) {
    // If we are in table edit mode then
    if(this.top) {
      return !_.isUndefined(state.oid);
    }
    return !this.isNew(state);
  }

  get baseFields() {
    let obj = this;

    return [{
      id: 'name', label: gettext('Name'), type:'text', cell:'text',
      mode: ['properties', 'create', 'edit'], editable:true,
    },{
      id: 'oid', label: gettext('OID'), cell: 'text',
      type: 'text' , mode: ['properties'],
    },{
      id: 'is_sys_obj', label: gettext('System check constraint?'),
      cell:'boolean', type: 'switch', mode: ['properties'],
    },{
      id: 'comment', label: gettext('Comment'), type: 'multiline', cell: 'text',
      mode: ['properties', 'create', 'edit'],
      deps:['name'], disabled: function(state) {
        return isEmptyString(state.name);
      },
      depChange: (state)=>{
        if(isEmptyString(state.name)) {
          return {comment: ''};
        }
      },
    },{
      id: 'consrc', label: gettext('Check'), type: 'multiline', cell: 'text',
      group: gettext('Definition'), mode: ['properties', 'create', 'edit'],
      readonly: obj.isReadonly, editable: true, noEmpty: true,
    },{
      id: 'connoinherit', label: gettext('No inherit?'), type: 'switch', cell: 'switch',
      group: gettext('Definition'), mode: ['properties', 'create', 'edit'], min_version: 90200,
      deps: [['is_partitioned']],
      disabled: function() {
        // Disabled if table is a partitioned table.
        return obj.inTable && obj.top?.sessData.is_partitioned;
      },
      depChange: ()=>{
        if(obj.inTable && obj.top?.sessData.is_partitioned) {
          return {connoinherit: false};
        }
      },
      readonly: obj.isReadonly,
    },{
      id: 'convalidated', label: gettext('Don\'t validate?'), type: 'switch', cell: 'switch',
      group: gettext('Definition'), min_version: 90200,
      readonly: (state)=>{
        // If we are in table edit mode then
        if(obj.inTable && obj.top && !obj.top.isNew()) {
          return !(_.isUndefined(state.oid) || state.convalidated);
        }
        return !obj.isNew(state) && !obj.origData.convalidated;
      },
      mode: ['properties', 'create', 'edit'],
    }];
  }

  validate() {
    return false;
  }
}
