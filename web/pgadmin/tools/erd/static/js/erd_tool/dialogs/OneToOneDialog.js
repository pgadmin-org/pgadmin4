/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import { isEmptyString } from 'sources/validators';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import _ from 'lodash';

class OneToOneSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}, localTableData={}) {
    super({
      local_table_uid: undefined,
      local_column_attnum: undefined,
      referenced_table_uid: undefined,
      referenced_column_attnum: undefined,
      constraint_type: undefined,
      ...initValues,
    });
    this.fieldOptions = fieldOptions;
    this.localTableData = localTableData;
  }

  isVisible (state) {
    let colName = _.find(this.localTableData.getData().columns, col => col.attnum === state.local_column_attnum)?.name;
    let {pkCols, ukCols} = this.localTableData.getConstraintCols();
    return !((pkCols.includes(colName) || ukCols.includes(colName)) || isEmptyString(state.local_column_attnum));
  }
  get baseFields() {
    return [{
      id: 'local_table_uid', label: gettext('Local Table'),
      type: 'select', readonly: true, controlProps: {allowClear: false},
      options: this.fieldOptions.local_table_uid,
    },{
      id: 'local_column_attnum', label: gettext('Local Column'),
      type: 'select', options: this.fieldOptions.local_column_attnum,
      controlProps: {allowClear: false}, noEmpty: true,
    },{
      id: 'constraint_type', label: gettext('Select constraint'),
      type: 'toggle', deps: ['local_column_attnum'],
      options: [
        {label: 'Primary Key', value: 'primary_key'},
        {label: 'Unique', value: 'unique'},
      ],
      visible: this.isVisible,
      depChange: (state, source)=>{
        if (source[0] === 'local_column_attnum' && this.isVisible(state)) {
          return {constraint_type: 'unique'};
        } else if (source[0] === 'local_column_attnum') {
          return {constraint_type: ''};
        }
      }, helpMessage: gettext('A constraint is required to implement One to One relationship.')
    }, {
      id: 'referenced_table_uid', label: gettext('Referenced Table'),
      type: 'select', options: this.fieldOptions.referenced_table_uid,
      controlProps: {allowClear: false}, noEmpty: true,
    },{
      id: 'referenced_column_attnum', label: gettext('Referenced Column'),
      controlProps: {allowClear: false}, deps: ['referenced_table_uid'], noEmpty: true,
      type: (state)=>({
        type: 'select',
        options: state.referenced_table_uid ? ()=>this.fieldOptions.getRefColumns(state.referenced_table_uid) : [],
        optionsReloadBasis: state.referenced_table_uid,
      }),
    }];
  }

  validate(state, setError) {
    let tableData = this.localTableData.getData();
    if (tableData.primary_key.length && state.constraint_type === 'primary_key') {
      setError('constraint_type', gettext('Primary key already exists, please select different constraint.'));
      return true;
    }
    return false;
  }
}

export function getOneToOneDialogSchema(attributes, tableNodesDict) {
  let tablesData = [];
  _.forEach(tableNodesDict, (node, uid)=>{
    let [schema, name] = node.getSchemaTableName();
    tablesData.push({value: uid, label: `(${schema}) ${name}`, image: 'icon-table'});
  });

  return new OneToOneSchema({
    local_table_uid: tablesData,
    local_column_attnum: tableNodesDict[attributes.local_table_uid].getColumns().map((col)=>{
      return {
        value: col.attnum, label: col.name, 'image': 'icon-column',
      };
    }),
    referenced_table_uid: tablesData,
    getRefColumns: (uid)=>{
      return tableNodesDict[uid].getColumns().map((col)=>{
        return {
          value: col.attnum, label: col.name, 'image': 'icon-column',
        };
      });
    },
  }, attributes, tableNodesDict[attributes.local_table_uid]);
}
