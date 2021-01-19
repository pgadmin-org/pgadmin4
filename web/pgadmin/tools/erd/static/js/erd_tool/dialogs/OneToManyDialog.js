/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import Backform from 'sources/backform.pgadmin';
import Alertify from 'pgadmin.alertifyjs';
import $ from 'jquery';

import DialogWrapper from './DialogWrapper';
import _ from 'lodash';

export default class OneToManyDialog {
  constructor(pgBrowser) {
    this.pgBrowser = pgBrowser;
  }

  dialogName() {
    return 'onetomany_dialog';
  }

  getDataModel(attributes, tableNodesDict) {
    const parseColumns = (columns)=>{
      return columns.map((col)=>{
        return {
          value: col.attnum, label: col.name,
        };
      });
    };

    let dialogModel = this.pgBrowser.DataModel.extend({
      defaults: {
        local_table_uid: undefined,
        local_column_attnum: undefined,
        referenced_table_uid: undefined,
        referenced_column_attnum: undefined,
      },
      schema: [{
        id: 'local_table_uid', label: gettext('Local Table'),
        type: 'select2', readonly: true,
        options: ()=>{
          let retOpts = [];
          _.forEach(tableNodesDict, (node, uid)=>{
            let [schema, name] = node.getSchemaTableName();
            retOpts.push({value: uid, label: `(${schema}) ${name}`});
          });
          return retOpts;
        },
      }, {
        id: 'local_column_attnum', label: gettext('Local Column'),
        type: 'select2', disabled: false, first_empty: false,
        editable: true, options: (view)=>{
          return parseColumns(tableNodesDict[view.model.get('local_table_uid')].getColumns());
        },
      },{
        id: 'referenced_table_uid', label: gettext('Referenced Table'),
        type: 'select2', disabled: false,
        editable: true, options: (view)=>{
          let retOpts = [];
          _.forEach(tableNodesDict, (node, uid)=>{
            if(uid === view.model.get('local_table_uid')) {
              return;
            }
            let [schema, name] = node.getSchemaTableName();
            retOpts.push({value: uid, label: `(${schema}) ${name}`});
          });
          return retOpts;
        },
      },{
        id: 'referenced_column_attnum', label: gettext('Referenced Column'),
        type: 'select2', disabled: false, deps: ['referenced_table_uid'],
        editable: true, options: (view)=>{
          if(view.model.get('referenced_table_uid')) {
            return parseColumns(tableNodesDict[view.model.get('referenced_table_uid')].getColumns());
          }
          return [];
        },
      }],
      validate: function(keys) {
        var msg = undefined;

        // Nothing to validate
        if (keys && keys.length == 0) {
          this.errorModel.clear();
          return null;
        } else {
          this.errorModel.clear();
        }

        if (_.isUndefined(this.get('local_column_attnum')) || this.get('local_column_attnum') == '') {
          msg = gettext('Select the local column.');
          this.errorModel.set('local_column_attnum', msg);
          return msg;
        }
        if (_.isUndefined(this.get('referenced_table_uid')) || this.get('referenced_table_uid') == '') {
          msg = gettext('Select the referenced table.');
          this.errorModel.set('referenced_table_uid', msg);
          return msg;
        }
        if (_.isUndefined(this.get('referenced_column_attnum')) || this.get('referenced_column_attnum') == '') {
          msg = gettext('Select the referenced table column.');
          this.errorModel.set('referenced_column_attnum', msg);
          return msg;
        }
      },
    });

    return new dialogModel(attributes);
  }

  createOrGetDialog(title) {
    const dialogName = this.dialogName();

    if (!Alertify[dialogName]) {
      Alertify.dialog(dialogName, () => {
        return new DialogWrapper(
          `<div class="${dialogName}"></div>`,
          title,
          null,
          $,
          this.pgBrowser,
          Alertify,
          Backform
        );
      });
    }
    return Alertify[dialogName];
  }

  show(title, attributes, tablesData, sVersion, callback) {
    let dialogTitle = title || gettext('Unknown');
    const dialog = this.createOrGetDialog('onetomany_dialog');
    dialog(dialogTitle, this.getDataModel(attributes, tablesData), callback).resizeTo(this.pgBrowser.stdW.sm, this.pgBrowser.stdH.md);
  }
}
