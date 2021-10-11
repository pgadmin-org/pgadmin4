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

class OneToManySchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      local_table_uid: undefined,
      local_column_attnum: undefined,
      referenced_table_uid: undefined,
      referenced_column_attnum: undefined,
      ...initValues,
    });
    this.fieldOptions = fieldOptions;
  }
  get baseFields() {
    return [{
      id: 'local_table_uid', label: gettext('Local Table'),
      type: 'select', readonly: true, controlProps: {allowClear: false},
      options: this.fieldOptions.local_table_uid,
    }, {
      id: 'local_column_attnum', label: gettext('Local Column'),
      type: 'select', options: this.fieldOptions.local_column_attnum,
      controlProps: {allowClear: false}, noEmpty: true,
    },{
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
}

export default class OneToManyDialog {
  constructor(pgBrowser) {
    this.pgBrowser = pgBrowser;
  }

  dialogName() {
    return 'onetomany_dialog';
  }

  getUISchema(attributes, tableNodesDict) {
    let tablesData = [];
    _.forEach(tableNodesDict, (node, uid)=>{
      let [schema, name] = node.getSchemaTableName();
      tablesData.push({value: uid, label: `(${schema}) ${name}`, image: 'icon-table'});
    });

    return new OneToManySchema({
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
    }, attributes);
  }

  createOrGetDialog(title, sVersion) {
    const dialogName = this.dialogName();

    if (!Alertify[dialogName]) {
      Alertify.dialog(dialogName, () => {
        return new DialogWrapper(
          `<div class="${dialogName}"></div>`,
          title,
          null,
          Alertify,
          sVersion
        );
      });
    }
    return Alertify[dialogName];
  }

  show(title, attributes, tablesData, serverInfo, callback) {
    let dialogTitle = title || gettext('Unknown');
    const dialog = this.createOrGetDialog('onetomany_dialog', serverInfo);
    dialog(dialogTitle, this.getUISchema(attributes, tablesData), callback).resizeTo(this.pgBrowser.stdW.sm, this.pgBrowser.stdH.md);
  }
}
