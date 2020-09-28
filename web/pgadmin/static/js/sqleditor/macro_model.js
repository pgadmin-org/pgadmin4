/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import Backform from 'pgadmin.backform';
import Backgrid from 'pgadmin.backgrid';
import url_for from 'sources/url_for';
import $ from 'jquery';
import _ from 'underscore';
import Alertify from 'pgadmin.alertifyjs';

export default function macroModel(transId) {

  let MacroModel = pgAdmin.Browser.DataModel.extend({
    idAttribute: 'id',
    defaults: {
      id: undefined,
      key: undefined,
      name: undefined,
      sql: undefined,
      key_label: undefined,
    },
    schema: [{
      id: 'key_label',
      name: 'key_label',
      label: gettext('Key'),
      type: 'text',
      cell: 'string',
      editable: false,
      cellHeaderClasses: 'width_percent_10',
      headerCell: Backgrid.Extension.CustomHeaderCell,
      disabled: false,
    }, {
      id: 'name',
      name: 'name',
      label: gettext('Name'),
      cell: 'string',
      type: 'text',
      editable: true,
      cellHeaderClasses: 'width_percent_20',
      headerCell: Backgrid.Extension.CustomHeaderCell,
      disabled: false,
    }, {
      id: 'sql',
      name: 'sql',
      label: gettext('SQL'),
      cell: Backgrid.Extension.SqlCell,
      type: 'multiline',
      control: Backform.SqlCodeControl,
      editable: true,
      cellHeaderClasses: 'width_percent_70',
      headerCell: Backgrid.Extension.CustomHeaderCell,
      disabled: false,
    },
    ],
    validate: function() {
      let msg = null;
      this.errorModel.clear();
      if (_.isEmpty(this.get('name')) &&  !(_.isEmpty(this.get('sql')))) {
        msg = gettext('Please enter macro name.');
        this.errorModel.set('name', msg);
        return msg;
      } else if (_.isEmpty(this.get('sql')) &&  !(_.isEmpty(this.get('name')))) {
        msg = gettext('Please enter macro sql.');
        this.errorModel.set('sql', msg);
        return msg;
      }
      return null;
    },
  });

  let MacroCollectionModel = pgAdmin.Browser.DataModel.extend({
    defaults: {
      macro: undefined,
    },
    urlRoot: url_for('sqleditor.get_macros', {'trans_id': transId}),
    schema: [{
      id: 'macro',
      name: 'macro',
      label: gettext('Macros'),
      model: MacroModel,
      editable: true,
      type: 'collection',
      control: Backform.SubNodeCollectionControl.extend({
        showGridControl: function(data) {
          var self = this,
            gridBody = $('<div class=\'pgadmin-control-group backgrid form-group pg-el-12 object subnode\'></div>');

          var subnode = data.subnode.schema ? data.subnode : data.subnode.prototype,
            gridSchema = Backform.generateGridColumnsFromModel(
              data.node_info, subnode, this.field.get('mode'), data.columns, data.schema_node
            );

          // Clean up existing grid if any (in case of re-render)
          if (self.grid) {
            self.grid.remove();
          }

          // Set visibility of Add button
          if (data.disabled || data.canAdd == false) {
            $(gridBody).find('button.add').remove();
          }

          // Insert Clear Cell into Grid
          gridSchema.columns.unshift({
            name: 'pg-backform-clear',
            label: '<i aria-label="' + gettext('Clear row') + '" class="fa fa-eraser" title="' + gettext('Clear row') + '"></i>',
            cell: Backgrid.Extension.ClearCell,
            editable: false,
            cell_priority: -1,
            sortable: false,
            headerCell: Backgrid.Extension.CustomHeaderCell.extend({
              className: 'header-icon-cell',
              events: {
                'click': 'clearrAll',
              },
              clearrAll: function(e) {
                e.preventDefault();
                var that = this;
                // We will check if row is deletable or not

                Alertify.confirm(
                  gettext('Clear All Rows'),
                  gettext('Are you sure you wish to clear all rows?'),
                  function() {
                    _.each(that.collection.toJSON(), function(m) {
                      that.collection.get(m.id).set({'name': null, 'sql': null});
                    });
                  },
                  function() {
                    return true;
                  }
                );
              },
              render: function() {
                this.$el.empty();
                var column = this.column;
                var label = $('<button type="button" title="' + gettext('Clear row') + '" aria-label="Clear row" aria-expanded="false" tabindex="0">').html(column.get('label')).append('<span class=\'sort-caret\' aria-hidden=\'true\'></span>');

                this.$el.append(label);
                this.$el.addClass(column.get('name'));
                this.$el.addClass(column.get('direction'));
                this.$el.attr('role', 'columnheader');
                this.$el.attr('aria-label', 'columnheader');
                this.$el.attr('alt', 'columnheader');
                this.delegateEvents();
                return this;

              },
            }),
          });


          var collection = self.model.get(data.name);

          if (!collection) {
            collection = new(pgAdmin.Browser.Node.Collection)(null, {
              handler: self.model.handler || self.model,
              model: data.model,
              top: self.model.top || self.model,
              silent: true,
            });
            self.model.set(data.name, collection, {
              silent: true,
            });
          }

          var cellEditing = function(args) {
            var ctx = this,
              cell = args[0];
            // Search for any other rows which are open.
            this.each(function(m) {
              // Check if row which we are about to close is not current row.
              if (cell.model != m) {
                var idx = ctx.indexOf(m);
                if (idx > -1) {
                  var row = grid.body.rows[idx],
                    rowEditCell = row.$el.find('.subnode-edit-in-process').parent();
                  // Only close row if it's open.
                  if (rowEditCell.length > 0) {
                    var event = new Event('click');
                    rowEditCell[0].dispatchEvent(event);
                  }
                }
              }
            });
          };
          // Listen for any row which is about to enter in edit mode.
          collection.on('enteringEditMode', cellEditing, collection);

          // Initialize a new Grid instance
          var grid = self.grid = new Backgrid.Grid({
            columns: gridSchema.columns,
            collection: collection,
            row: this.row,
            className: 'backgrid table presentation table-bordered table-noouter-border table-hover',
          });

          // Render subNode grid
          var subNodeGrid = grid.render().$el;

          var $dialog = gridBody.append(subNodeGrid);

          return $dialog;
        },
      }),
      columns: ['key_label', 'name', 'sql'],
      visible: true,
    }],
    validate: function() {
      return null;
    },
  });

  let model = new MacroCollectionModel();
  return model;
}
