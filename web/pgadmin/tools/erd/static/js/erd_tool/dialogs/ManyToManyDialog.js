/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import Alertify from 'pgadmin.alertifyjs';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';

import DialogWrapper from './DialogWrapper';
import _ from 'lodash';

class ManyToManySchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      left_table_uid: undefined,
      left_table_column_attnum: undefined,
      right_table_uid: undefined,
      right_table_column_attnum: undefined,
      ...initValues,
    });
    this.fieldOptions = fieldOptions;
  }
  get baseFields() {
    return [{
      id: 'left_table_uid', label: gettext('Local Table'),
      type: 'select', readonly: true, controlProps: {allowClear: false},
      options: this.fieldOptions.left_table_uid,
    }, {
      id: 'left_table_column_attnum', label: gettext('Local Column'),
      type: 'select', options: this.fieldOptions.left_table_column_attnum,
      controlProps: {allowClear: false}, noEmpty: true,
    },{
      id: 'right_table_uid', label: gettext('Referenced Table'),
      type: 'select', options: this.fieldOptions.right_table_uid,
      controlProps: {allowClear: false}, noEmpty: true,
    },{
      id: 'right_table_column_attnum', label: gettext('Referenced Column'),
      controlProps: {allowClear: false}, deps: ['right_table_uid'],
      type: (state)=>({
        type: 'select',
        options: state.right_table_uid ? ()=>this.fieldOptions.getRefColumns(state.right_table_uid) : [],
        optionsReloadBasis: state.right_table_uid,
      }),
    }];
  }
}

export default class ManyToManyDialog {
  constructor(pgBrowser) {
    this.pgBrowser = pgBrowser;
  }

  dialogName() {
    return 'manytomany_dialog';
  }

  getUISchema(attributes, tableNodesDict) {
    let tablesData = [];
    _.forEach(tableNodesDict, (node, uid)=>{
      let [schema, name] = node.getSchemaTableName();
      tablesData.push({value: uid, label: `(${schema}) ${name}`, image: 'icon-table'});
    });

    return new ManyToManySchema({
      left_table_uid: tablesData,
      left_table_column_attnum: tableNodesDict[attributes.left_table_uid].getColumns().map((col)=>{
        return {
          value: col.attnum, label: col.name, 'image': 'icon-column',
        };
      }),
      right_table_uid: tablesData,
      getRefColumns: (uid)=>{
        return tableNodesDict[uid].getColumns().map((col)=>{
          return {
            value: col.attnum, label: col.name, 'image': 'icon-column',
          };
        });
      },
    }, attributes);
  }

  createOrGetDialog(title) {
    const dialogName = this.dialogName();

    if (!Alertify[dialogName]) {
      Alertify.dialog(dialogName, () => {
        return new DialogWrapper(
          `<div class="${dialogName}"></div>`,
          title,
          null,
          Alertify,
        );
      });
    }
    return Alertify[dialogName];
  }

  show(title, attributes, tablesData, serverInfo, callback) {
    let dialogTitle = title || gettext('Unknown');
    const dialog = this.createOrGetDialog('manytomany_dialog', serverInfo);
    dialog(dialogTitle, this.getUISchema(attributes, tablesData), callback).resizeTo(this.pgBrowser.stdW.sm, this.pgBrowser.stdH.md);
  }
}
