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

export default class ManyToManyDialog {
  constructor(pgBrowser) {
    this.pgBrowser = pgBrowser;
  }

  dialogName() {
    return 'manytomany_dialog';
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
        left_table_uid: undefined,
        left_table_column_attnum: undefined,
        right_table_uid: undefined,
        right_table_column_attnum: undefined,
      },
      schema: [{
        id: 'left_table_uid', label: gettext('Left Table'),
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
        id: 'left_table_column_attnum', label: gettext('Left table Column'),
        type: 'select2', disabled: false, first_empty: false,
        editable: true, options: (view)=>{
          return parseColumns(tableNodesDict[view.model.get('left_table_uid')].getColumns());
        },
      },{
        id: 'right_table_uid', label: gettext('Right Table'),
        type: 'select2', disabled: false,
        editable: true, options: (view)=>{
          let retOpts = [];
          _.forEach(tableNodesDict, (node, uid)=>{
            if(uid === view.model.get('left_table_uid')) {
              return;
            }
            let [schema, name] = node.getSchemaTableName();
            retOpts.push({value: uid, label: `(${schema}) ${name}`});
          });
          return retOpts;
        },
      },{
        id: 'right_table_column_attnum', label: gettext('Right table Column'),
        type: 'select2', disabled: false, deps: ['right_table_uid'],
        editable: true, options: (view)=>{
          if(view.model.get('right_table_uid')) {
            return parseColumns(tableNodesDict[view.model.get('right_table_uid')].getColumns());
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

        if (_.isUndefined(this.get('left_table_column_attnum')) || this.get('left_table_column_attnum') == '') {
          msg = gettext('Select the left table column.');
          this.errorModel.set('left_table_column_attnum', msg);
          return msg;
        }
        if (_.isUndefined(this.get('right_table_uid')) || this.get('right_table_uid') == '') {
          msg = gettext('Select the right table.');
          this.errorModel.set('right_table_uid', msg);
          return msg;
        }
        if (_.isUndefined(this.get('right_table_column_attnum')) || this.get('right_table_column_attnum') == '') {
          msg = gettext('Select the right table column.');
          this.errorModel.set('right_table_column_attnum', msg);
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
    const dialog = this.createOrGetDialog('manytomany_dialog');
    dialog(dialogTitle, this.getDataModel(attributes, tablesData), callback).resizeTo(this.pgBrowser.stdW.sm, this.pgBrowser.stdH.md);
  }
}
