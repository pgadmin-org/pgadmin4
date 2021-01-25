/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import Backgrid from 'sources/backgrid.pgadmin';
import Backform from 'sources/backform.pgadmin';
import Alertify from 'pgadmin.alertifyjs';
import $ from 'jquery';
import _ from 'lodash';

import DialogWrapper from './DialogWrapper';

export function transformToSupported(data) {
  /* Table fields */
  data = _.pick(data, ['oid', 'name', 'schema', 'description', 'columns', 'primary_key', 'foreign_key']);

  /* Columns */
  data['columns'] = data['columns'].map((column)=>{
    return _.pick(column,[
      'name','description','attowner','attnum','cltype','min_val_attlen','min_val_attprecision','max_val_attlen',
      'max_val_attprecision', 'is_primary_key','attnotnull','attlen','attprecision','attidentity','colconstype',
      'seqincrement','seqstart','seqmin','seqmax','seqcache','seqcycle',
    ]);
  });

  /* Primary key */
  data['primary_key'] = data['primary_key'].map((primary_key)=>{
    primary_key = _.pick(primary_key, ['columns']);
    primary_key['columns'] = primary_key['columns'].map((column)=>{
      return _.pick(column, ['column']);
    });
    return primary_key;
  });

  return data;
}

export default class TableDialog {
  constructor(pgBrowser) {
    this.pgBrowser = pgBrowser;
  }

  dialogName() {
    return 'entity_dialog';
  }

  getDataModel(attributes, isNew, allTables, colTypes, schemas, sVersion) {
    let dialogObj = this;
    let columnsModel = this.pgBrowser.DataModel.extend({
      idAttribute: 'attnum',
      defaults: {
        name: undefined,
        description: undefined,
        attowner: undefined,
        attnum: undefined,
        cltype: undefined,
        min_val_attlen: undefined,
        min_val_attprecision: undefined,
        max_val_attlen: undefined,
        max_val_attprecision: undefined,
        is_primary_key: false,
        attnotnull: false,
        attlen: null,
        attprecision: null,
        attidentity: 'a',
        colconstype: 'n',
        seqincrement: undefined,
        seqstart: undefined,
        seqmin: undefined,
        seqmax: undefined,
        seqcache: undefined,
        seqcycle: undefined,
      },
      initialize: function(attrs) {
        if (_.size(attrs) !== 0) {
          this.set({
            'old_attidentity': this.get('attidentity'),
          }, {silent: true});
        }
        dialogObj.pgBrowser.DataModel.prototype.initialize.apply(this, arguments);

        if(!this.get('cltype') && colTypes.length > 0) {
          this.set({
            'cltype': colTypes[0]['value'],
          }, {silent: true});
        }
      },
      schema: [{
        id: 'name', label: gettext('Name'), cell: 'string',
        type: 'text', disabled: false,
        cellHeaderClasses: 'width_percent_30',
        editable: true,
      }, {
        // Need to show this field only when creating new table
        // [in SubNode control]
        id: 'is_primary_key', label: gettext('Primary key?'),
        cell: Backgrid.Extension.TableChildSwitchCell, type: 'switch',
        deps: ['name'], cellHeaderClasses: 'width_percent_5',
        options: {
          onText: gettext('Yes'), offText: gettext('No'),
          onColor: 'success', offColor: 'ternary',
        },
        visible: function () {
          return true;
        },
        disabled: false,
        editable: true,
      }, {
        id: 'description', label: gettext('Comment'), cell: 'string', type: 'multiline',
      }, {
        id: 'cltype', label: gettext('Data type'),
        cell: 'select2',
        type: 'select2', disabled: false,
        control: 'select2',
        cellHeaderClasses: 'width_percent_30',
        select2: { allowClear: false, first_empty: false }, group: gettext('Definition'),
        options: function () {
          return colTypes;
        },
      }, {
        id: 'attlen', label: gettext('Length/Precision'), cell: Backgrid.Extension.IntegerDepCell,
        deps: ['cltype'], type: 'int', group: gettext('Definition'), cellHeaderClasses: 'width_percent_20',
        disabled: function (m) {
          var of_type = m.get('cltype'),
            flag = true;
          _.each(colTypes, function (o) {
            if (of_type == o.value) {
              if (o.length) {
                m.set('min_val_attlen', o.min_val, { silent: true });
                m.set('max_val_attlen', o.max_val, { silent: true });
                flag = false;
              }
            }
          });

          flag && setTimeout(function () {
            if (m.get('attlen')) {
              m.set('attlen', null);
            }
          }, 10);

          return flag;
        },
        editable: function (m) {
          var of_type = m.get('cltype'),
            flag = false;
          _.each(colTypes, function (o) {
            if (of_type == o.value) {
              if (o.length) {
                m.set('min_val_attlen', o.min_val, { silent: true });
                m.set('max_val_attlen', o.max_val, { silent: true });
                flag = true;
              }
            }
          });

          !flag && setTimeout(function () {
            if (m.get('attlen')) {
              m.set('attlen', null);
            }
          }, 10);

          return flag;
        },
      }, {
        id: 'attprecision', label: gettext('Scale'), cell: Backgrid.Extension.IntegerDepCell,
        deps: ['cltype'], type: 'int', group: gettext('Definition'), cellHeaderClasses: 'width_percent_20',
        disabled: function (m) {
          var of_type = m.get('cltype'),
            flag = true;
          _.each(colTypes, function (o) {
            if (of_type == o.value) {
              if (o.precision) {
                m.set('min_val_attprecision', 0, { silent: true });
                m.set('max_val_attprecision', o.max_val, { silent: true });
                flag = false;
              }
            }
          });

          flag && setTimeout(function () {
            if (m.get('attprecision')) {
              m.set('attprecision', null);
            }
          }, 10);
          return flag;
        },
        editable: function (m) {
          if (!colTypes) {
            // datatypes not loaded yet, may be this call is from CallByNeed from backgrid cell initialize.
            return true;
          }

          var of_type = m.get('cltype'),
            flag = false;
          _.each(colTypes, function (o) {
            if (of_type == o.value) {
              if (o.precision) {
                m.set('min_val_attprecision', 0, { silent: true });
                m.set('max_val_attprecision', o.max_val, { silent: true });
                flag = true;
              }
            }
          });

          !flag && setTimeout(function () {
            if (m.get('attprecision')) {
              m.set('attprecision', null);
            }
          }, 10);

          return flag;
        },
      }, {
        id: 'attnotnull', label: gettext('Not NULL?'), cell: 'switch',
        type: 'switch', cellHeaderClasses: 'width_percent_20',
        group: gettext('Constraints'),
        options: { onText: gettext('Yes'), offText: gettext('No'), onColor: 'success', offColor: 'ternary' },
        disabled: function(m) {
          if (m.get('colconstype') == 'i') {
            setTimeout(function () {
              m.set('attnotnull', true);
            }, 10);
          }
          return false;
        },
      }, {
        id: 'colconstype',
        label: gettext('Type'),
        cell: 'string',
        type: 'radioModern',
        controlsClassName: 'pgadmin-controls col-12 col-sm-9',
        controlLabelClassName: 'control-label col-sm-3 col-12',
        group: gettext('Constraints'),
        options: function() {
          var opt_array = [
            {'label': gettext('NONE'), 'value': 'n'},
            {'label': gettext('IDENTITY'), 'value': 'i'},
          ];

          if (sVersion >= 120000) {
            opt_array.push({
              'label': gettext('GENERATED'),
              'value': 'g',
            });
          }

          return opt_array;
        },
        disabled: false,
        visible: function() {
          if (sVersion >= 100000) {
            return true;
          }
          return false;
        },
      }, {
        id: 'attidentity', label: gettext('Identity'), control: 'select2',
        cell: 'select2',
        select2: {placeholder: 'Select identity', allowClear: false, width: '100%'},
        group: gettext('Constraints'),
        'options': [
          {label: gettext('ALWAYS'), value: 'a'},
          {label: gettext('BY DEFAULT'), value: 'd'},
        ],
        deps: ['colconstype'],
        visible: function(m) {
          if (sVersion >= 100000 && m.isTypeIdentity(m)) {
            return true;
          }
          return false;
        },
        disabled: function() {
          return false;
        },
      }, {
        id: 'seqincrement', label: gettext('Increment'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
        min: 1, deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
        visible: 'isTypeIdentity',
      },{
        id: 'seqstart', label: gettext('Start'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
        disabled: function(m) {
          let isIdentity = m.get('attidentity');
          if(!_.isUndefined(isIdentity) && !_.isNull(isIdentity) && !_.isEmpty(isIdentity))
            return false;
          return true;
        }, deps: ['attidentity', 'colconstype'],
        visible: 'isTypeIdentity',
      },{
        id: 'seqmin', label: gettext('Minimum'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
        deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
        visible: 'isTypeIdentity',
      },{
        id: 'seqmax', label: gettext('Maximum'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
        deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
        visible: 'isTypeIdentity',
      },{
        id: 'seqcache', label: gettext('Cache'), type: 'int',
        mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
        min: 1, deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
        visible: 'isTypeIdentity',
      },{
        id: 'seqcycle', label: gettext('Cycled'), type: 'switch',
        mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
        deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
        visible: 'isTypeIdentity',
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

        if (_.isUndefined(this.get('name'))
            || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
          msg = gettext('Column name cannot be empty.');
          this.errorModel.set('name', msg);
          return msg;
        }

        if (_.isUndefined(this.get('cltype'))
            || String(this.get('cltype')).replace(/^\s+|\s+$/g, '') == '') {
          msg = gettext('Column type cannot be empty.');
          this.errorModel.set('cltype', msg);
          return msg;
        }

        if (!_.isUndefined(this.get('cltype'))
              && !_.isUndefined(this.get('attlen'))
              && !_.isNull(this.get('attlen'))
              && this.get('attlen') !== '') {
          // Validation for Length field
          if (this.get('attlen') < this.get('min_val_attlen'))
            msg = gettext('Length/Precision should not be less than: ') + this.get('min_val_attlen');
          if (this.get('attlen') > this.get('max_val_attlen'))
            msg = gettext('Length/Precision should not be greater than: ') + this.get('max_val_attlen');
          // If we have any error set then throw it to user
          if(msg) {
            this.errorModel.set('attlen', msg);
            return msg;
          }
        }

        if (!_.isUndefined(this.get('cltype'))
              && !_.isUndefined(this.get('attprecision'))
              && !_.isNull(this.get('attprecision'))
              && this.get('attprecision') !== '') {
          // Validation for precision field
          if (this.get('attprecision') < this.get('min_val_attprecision'))
            msg = gettext('Scale should not be less than: ') + this.get('min_val_attprecision');
          if (this.get('attprecision') > this.get('max_val_attprecision'))
            msg = gettext('Scale should not be greater than: ') + this.get('max_val_attprecision');
          // If we have any error set then throw it to user
          if(msg) {
            this.errorModel.set('attprecision', msg);
            return msg;
          }
        }

        var minimum = this.get('seqmin'),
          maximum = this.get('seqmax'),
          start = this.get('seqstart');

        if (!this.isNew() && this.get('colconstype') == 'i' &&
          (this.get('old_attidentity') == 'a' || this.get('old_attidentity') == 'd') &&
          (this.get('attidentity') == 'a' || this.get('attidentity') == 'd')) {
          if (_.isUndefined(this.get('seqincrement'))
            || String(this.get('seqincrement')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Increment value cannot be empty.');
            this.errorModel.set('seqincrement', msg);
            return msg;
          } else {
            this.errorModel.unset('seqincrement');
          }

          if (_.isUndefined(this.get('seqmin'))
            || String(this.get('seqmin')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Minimum value cannot be empty.');
            this.errorModel.set('seqmin', msg);
            return msg;
          } else {
            this.errorModel.unset('seqmin');
          }

          if (_.isUndefined(this.get('seqmax'))
            || String(this.get('seqmax')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Maximum value cannot be empty.');
            this.errorModel.set('seqmax', msg);
            return msg;
          } else {
            this.errorModel.unset('seqmax');
          }

          if (_.isUndefined(this.get('seqcache'))
            || String(this.get('seqcache')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Cache value cannot be empty.');
            this.errorModel.set('seqcache', msg);
            return msg;
          } else {
            this.errorModel.unset('seqcache');
          }
        }
        var min_lt = gettext('Minimum value must be less than maximum value.'),
          start_lt = gettext('Start value cannot be less than minimum value.'),
          start_gt = gettext('Start value cannot be greater than maximum value.');

        if (_.isEmpty(minimum) || _.isEmpty(maximum))
          return null;

        if ((minimum == 0 && maximum == 0) ||
            (parseInt(minimum, 10) >= parseInt(maximum, 10))) {
          this.errorModel.set('seqmin', min_lt);
          return min_lt;
        } else {
          this.errorModel.unset('seqmin');
        }

        if (start && minimum && parseInt(start) < parseInt(minimum)) {
          this.errorModel.set('seqstart', start_lt);
          return start_lt;
        } else {
          this.errorModel.unset('seqstart');
        }

        if (start && maximum && parseInt(start) > parseInt(maximum)) {
          this.errorModel.set('seqstart', start_gt);
          return start_gt;
        } else {
          this.errorModel.unset('seqstart');
        }

        return null;
      },
      // Check whether the column is identity column or not
      isIdentityColumn: function(m) {
        let isIdentity = m.get('attidentity');
        if(!_.isUndefined(isIdentity) && !_.isNull(isIdentity) && !_.isEmpty(isIdentity))
          return false;
        return true;
      },
      // Check whether the column is a identity column
      isTypeIdentity: function(m) {
        let colconstype = m.get('colconstype');
        if (!_.isUndefined(colconstype) && !_.isNull(colconstype) && colconstype == 'i') {
          return true;
        }
        return false;
      },
      // Check whether the column is a generated column
      isTypeGenerated: function(m) {
        let colconstype = m.get('colconstype');
        if (!_.isUndefined(colconstype) && !_.isNull(colconstype) && colconstype == 'g') {
          return true;
        }
        return false;
      },
    });

    const formatSchemaItem = function(opt) {
      if (!opt.id) {
        return opt.text;
      }

      var optimage = $(opt.element).data('image');

      if (!optimage) {
        return opt.text;
      } else {
        return $('<span></span>').append(
          $('<span></span>', {
            class: 'wcTabIcon ' + optimage,
          })
        ).append($('<span></span>').text(opt.text));
      }
    };

    let dialogModel = this.pgBrowser.DataModel.extend({
      defaults: {
        name: undefined,
        schema: undefined,
        description: undefined,
        columns: [],
        primary_key: [],
      },
      initialize: function() {
        dialogObj.pgBrowser.DataModel.prototype.initialize.apply(this, arguments);

        if(!this.get('schema') && schemas.length > 0) {
          this.set({
            'schema': schemas[0]['name'],
          }, {silent: true});
        }
      },
      schema: [{
        id: 'name', label: gettext('Name'), type: 'text', disabled: false,
      },{
        id: 'schema', label: gettext('Schema'), type: 'text',
        control: 'select2', select2: {
          allowClear: false, first_empty: false,
          templateResult: formatSchemaItem,
          templateSelection: formatSchemaItem,
        },
        options: function () {
          return schemas.map((schema)=>{
            return {
              'value': schema['name'],
              'image': 'icon-schema',
              'label': schema['name'],
            };
          });
        },
        filter: function(d) {
          // If schema name start with pg_* then we need to exclude them
          if(d && d.label.match(/^pg_/))
          {
            return false;
          }
          return true;
        },
      },{
        id: 'description', label: gettext('Comment'), type: 'multiline',
      },{
        id: 'columns', label: gettext('Columns'), type: 'collection', mode: ['create'],
        group: gettext('Columns'),
        model: columnsModel,
        subnode: columnsModel,
        disabled: false,
        uniqueCol : ['name'],
        columns : ['name' , 'cltype', 'attlen', 'attprecision', 'attnotnull', 'is_primary_key'],
        control: Backform.UniqueColCollectionControl.extend({
          initialize: function() {

            Backform.UniqueColCollectionControl.prototype.initialize.apply(this, arguments);
            var self = this,
              collection = self.model.get(self.field.get('name'));

            if(collection.isEmpty()) {
              self.last_attnum = -1;
            } else {
              var lastCol = collection.max(function(col) {
                return col.get('attnum');
              });
              self.last_attnum = lastCol.get('attnum');
            }

            collection.on('change:is_primary_key', function(m) {
              var primary_key_coll = self.model.get('primary_key'),
                column_name = m.get('name'),
                primary_key, primary_key_column_coll;

              if(m.get('is_primary_key')) {
                // Add column to primary key.
                if (primary_key_coll.length < 1) {
                  primary_key = new (primary_key_coll.model)({}, {
                    top: self.model,
                    collection: primary_key_coll,
                    handler: primary_key_coll,
                  });
                  primary_key_coll.add(primary_key);
                } else {
                  primary_key = primary_key_coll.first();
                }

                primary_key_column_coll = primary_key.get('columns');
                var primary_key_column_exist = primary_key_column_coll.where({column:column_name});

                if (primary_key_column_exist.length == 0) {
                  var primary_key_column = new (
                    primary_key_column_coll.model
                  )({column: column_name}, {
                    silent: true,
                    top: self.model,
                    collection: primary_key_coll,
                    handler: primary_key_coll,
                  });

                  primary_key_column_coll.add(primary_key_column);
                }

                primary_key_column_coll.trigger(
                  'pgadmin:multicolumn:updated', primary_key_column_coll
                );
              } else {
                // remove column from primary key.
                if (primary_key_coll.length > 0) {
                  primary_key = primary_key_coll.first();
                  // Do not alter existing primary key columns.
                  if (!_.isUndefined(primary_key.get('oid'))) {
                    return;
                  }

                  primary_key_column_coll = primary_key.get('columns');
                  var removedCols = primary_key_column_coll.where({column:column_name});
                  if (removedCols.length > 0) {
                    primary_key_column_coll.remove(removedCols);
                    _.each(removedCols, function(local_model) {
                      local_model.destroy();
                    });
                    if (primary_key_column_coll.length == 0) {
                      /* Ideally above line of code should be "primary_key_coll.reset()".
                       * But our custom DataCollection (extended from Backbone collection in datamodel.js)
                       * does not respond to reset event, it only supports add, remove, change events.
                       * And hence no custom event listeners/validators get called for reset event.
                       */
                      primary_key_coll.remove(primary_key_coll.first());
                    }
                  }
                  primary_key_column_coll.trigger('pgadmin:multicolumn:updated', primary_key_column_coll);
                }
              }
            });

            collection.on('change:name', function(m) {
              let primary_key = self.model.get('primary_key').first();
              if(primary_key) {
                let updatedCols = primary_key.get('columns').where(
                  {column: m.previous('name')}
                );
                if (updatedCols.length > 0) {
                  /*
                  * Table column name has changed so update
                  * column name in primary key as well.
                  */
                  updatedCols[0].set(
                    {'column': m.get('name')},
                    {silent: true});
                }
              }
            });

            collection.on('remove', function(m) {
              let primary_key = self.model.get('primary_key').first();
              if(primary_key) {
                let removedCols = primary_key.get('columns').where(
                  {column: m.get('name')}
                );

                primary_key.get('columns').remove(removedCols);
              }
            });
          },
        }),
        canAdd: true,
        canEdit: true, canDelete: true,
        // For each row edit/delete button enable/disable
        canEditRow: true,
        canDeleteRow: true,
        allowMultipleEmptyRow: false,
        beforeAdd: function(newModel) {
          this.last_attnum++;
          newModel.set('attnum', this.last_attnum);
          return newModel;
        },
      },{
        // Here we will create tab control for constraints
        // We will hide the tab for ERD
        type: 'nested', control: 'tab', group: gettext('Constraints'), mode: ['properties'],
        schema: [{
          id: 'primary_key', label: '',
          model: this.pgBrowser.Nodes['primary_key'].model.extend({
            validate: ()=>{},
          }),
          subnode: this.pgBrowser.Nodes['primary_key'].model.extend({
            validate: ()=>{},
          }),
          editable: false, type: 'collection',
        },
        ],
      }],
      validate: function() {
        var msg,
          name = this.get('name'),
          schema = this.get('schema');

        if (
          _.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == ''
        ) {
          msg = gettext('Table name cannot be empty.');
          this.errorModel.set('name', msg);
          return msg;
        }

        /* Check existing table names */
        let sameNameCount = _.filter(allTables, (table)=>table[0]==schema&&table[1]==name).length;
        if(isNew && this.sessAttrs['name'] && sameNameCount > 0 || isNew && sameNameCount > 0) {
          msg = gettext('Table name already exists.');
          this.errorModel.set('name', msg);
          return msg;
        }
        this.errorModel.unset('name');
        if (
          _.isUndefined(schema) || _.isNull(schema) ||
            String(schema).replace(/^\s+|\s+$/g, '') == ''
        ) {
          msg = gettext('Table schema cannot be empty.');
          this.errorModel.set('schema', msg);
          return msg;
        }
        this.errorModel.unset('schema');


        return null;
      },
    });

    return new dialogModel(attributes);
  }

  createOrGetDialog(type) {
    const dialogName = this.dialogName();

    if (!Alertify[dialogName]) {
      Alertify.dialog(dialogName, () => {
        return new DialogWrapper(
          `<div class="${dialogName}"></div>`,
          null,
          type,
          $,
          this.pgBrowser,
          Alertify,
          Backform
        );
      });
    }
    return Alertify[dialogName];
  }

  show(title, attributes, isNew, allTables, colTypes, schemas, sVersion, callback) {
    let dialogTitle = title || gettext('Unknown');
    const dialog = this.createOrGetDialog('table_dialog');
    dialog(dialogTitle, this.getDataModel(attributes, isNew, allTables, colTypes, schemas, sVersion), callback).resizeTo(this.pgBrowser.stdW.md, this.pgBrowser.stdH.md);
  }
}
