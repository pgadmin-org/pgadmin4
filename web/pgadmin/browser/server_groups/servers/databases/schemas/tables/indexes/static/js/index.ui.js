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
import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../../static/js/node_ajax';
import _ from 'lodash';
import { isEmptyString } from 'sources/validators';
import Notify from '../../../../../../../../../static/js/helpers/Notifier';

export function getColumnSchema(nodeObj, treeNodeInfo, itemNodeData) {
  return new ColumnSchema(
    {
      columnList: ()=>getNodeListByName('column', treeNodeInfo, itemNodeData, {}),
      collationList: ()=>getNodeAjaxOptions('get_collations', nodeObj, treeNodeInfo, itemNodeData, {jumpAfterNode: 'schema'}),
      opClassList: ()=>getNodeAjaxOptions('get_op_class', nodeObj, treeNodeInfo, itemNodeData, {jumpAfterNode: 'schema'})
    }, {
      node_info: treeNodeInfo
    }
  );
}

export class ColumnSchema extends BaseUISchema {
  constructor(fieldOptions = {}, nodeData = [], initValues={}) {
    super({
      name: null,
      oid: undefined,
      description: '',
      is_sys_obj: false,
      colname: undefined,
      collspcname: undefined,
      op_class: undefined,
      sort_order: false,
      nulls: false,
      is_sort_nulls_applicable: true,
      ...initValues
    });
    this.fieldOptions = {
      columnList: [],
      collationList: [],
      opClassList: [],
      ...fieldOptions
    };
    this.node_info = {
      ...nodeData.node_info
    };
    this.op_class_types = [];
  }

  get idAttribute() {
    return 'oid';
  }

  // We will check if we are under schema node & in 'create' mode
  inSchemaWithModelCheck(state) {
    if(this.node_info &&  'schema' in this.node_info) {
      // We will disable control if it's in 'edit' mode
      return !this.isNew(state);
    }
    return true;
  }

  setOpClassTypes(options) {

    if(!options || (_.isArray(options) && options.length == 0))
      return this.op_class_types;

    if(this.op_class_types.length == 0)
      this.op_class_types = options;
  }

  isEditable(state) {
    let topObj = this._top;
    if(this.inSchemaWithModelCheck(state)) {
      return false;
    } else if (topObj._sessData && topObj._sessData.amname === 'btree') {
      state.is_sort_nulls_applicable = true;
      return true;
    } else {
      state.is_sort_nulls_applicable = false;
    }
    return false;
  }

  get baseFields() {
    let columnSchemaObj = this;
    return [
      {
        id: 'colname', label: gettext('Column'),
        type: 'select', cell: 'select', noEmpty: true,
        disabled: () => inSchema(columnSchemaObj.node_info),
        editable: function (state) {
          return !columnSchemaObj.inSchemaWithModelCheck(state);
        },
        options: columnSchemaObj.fieldOptions.columnList,
        node: 'column',
      },{
        id: 'collspcname', label: gettext('Collation'),
        type: 'select',
        cell: 'select',
        disabled: () => inSchema(columnSchemaObj.node_info),
        editable: function (state) {
          return !columnSchemaObj.inSchemaWithModelCheck(state);
        },
        options: columnSchemaObj.fieldOptions.collationList,
        node: 'index',
        url_jump_after_node: 'schema',
      },{
        id: 'op_class', label: gettext('Operator class'),
        tags: true, type: 'select',
        cell: () => {
          return {
            cell: 'select',
            options: columnSchemaObj.fieldOptions.opClassList,
            optionsLoaded: (options)=>{columnSchemaObj.setOpClassTypes(options);},
            controlProps: {
              allowClear: true,
              filter: (options) => {
                /* We need to extract data from collection according
                  * to access method selected by user if not selected
                  * send btree related op_class options
                  */
                let amname = columnSchemaObj._top?._sessData ? columnSchemaObj._top?._sessData.amname : columnSchemaObj._top?._origData.amname;

                if(_.isUndefined(amname))
                  return options;

                _.each(this.op_class_types, function(v, k) {
                  if(amname === k) {
                    options = v;
                  }
                });
                return options;
              }
            }
          };
        },
        editable: function (state) {
          return !columnSchemaObj.inSchemaWithModelCheck(state);
        },
        node: 'index',
        url_jump_after_node: 'schema',
        deps: ['amname'],
      },{
        id: 'sort_order', label: gettext('Sort order'),
        type: 'select', cell: 'select',
        options: [
          {label: 'ASC', value: false},
          {label: 'DESC', value: true},
        ],
        width: 110, disableResizing: true,
        controlProps: {
          allowClear: false,
        },
        depChange: (state, source, topState, actionObj) => {
          //Access method is empty or btree then do not disable field
          if(isEmptyString(topState.amname) || topState.amname === 'btree') {
            // We need to set nulls to true if sort_order is set to desc
            // nulls first is default for desc
            if(state.sort_order && !actionObj.oldState.sort_order) {
              setTimeout(function() {
                state.nulls = true;
              }, 10);
            }
          }
          else {
            state.is_sort_nulls_applicable = false;
          }
        },
        editable: function(state) {
          return columnSchemaObj.isEditable(state);
        },
        deps: ['amname'],
      },{
        id: 'nulls', label: gettext('NULLs'),
        editable: function(state) {
          return columnSchemaObj.isEditable(state);
        },
        deps: ['amname', 'sort_order'],
        type:'select', cell: 'select',
        options: [
          {label: 'FIRST', value: true},
          {label: 'LAST', value: false},
        ], controlProps: {allowClear: false},
        width: 110, disableResizing: true,
      },
    ];
  }
}

function inSchema(node_info) {
  return node_info && 'catalog' in node_info;
}

export default class IndexSchema extends BaseUISchema {
  constructor(columnSchema, fieldOptions = {}, nodeData = [], initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      description: '',
      is_sys_obj: false,
      nspname: undefined,
      tabname: undefined,
      spcname: undefined,
      amname: undefined,
      columns: [],
      ...initValues
    });
    this.fieldOptions = {
      tablespaceList: [],
      amnameList: [],
      columnList: [],
      ...fieldOptions
    };
    this.node_info = {
      ...nodeData.node_info
    };
    this.getColumnSchema = columnSchema;
  }

  get idAttribute() {
    return 'oid';
  }

  getColumns() {
    return {
      type: 'select',
      options: this.fieldOptions.columnList,
      optionsLoaded: (options) => { this.fieldOptions.columnList = options; },
      controlProps: {
        allowClear: false,
        multiple: true,
        placeholder: gettext('Select the column(s)'),
        width: 'style',
        filter: (options) => {
          let res = [];
          if (options && _.isArray(options)) {
            _.each(options, function(d) {
              if(d.label != '')
                res.push({label: d.label, value: d.value, image:'icon-column'});
            });
          }
          return res;
        }
      }
    };
  }

  isVisible() {
    return (!_.isUndefined(this.node_info) && !_.isUndefined(this.node_info.server)
      && !_.isUndefined(this.node_info.server.version) &&
      this.node_info.server.version >= 110000);
  }

  get baseFields() {
    let indexSchemaObj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'string',
        type: 'text',
        disabled: () => inSchema(indexSchemaObj.node_info),
      },{
        id: 'oid', label: gettext('OID'), cell: 'string',
        type: 'int', readonly: true, mode: ['properties'],
      },{
        id: 'spcname', label: gettext('Tablespace'), cell: 'string',
        node: 'tablespace',
        mode: ['properties', 'create', 'edit'],
        disabled: () => inSchema(indexSchemaObj.node_info),
        type: 'select',
        options: indexSchemaObj.fieldOptions.tablespaceList,
        controlProps: { allowClear: true },
      },{
        id: 'amname', label: gettext('Access Method'), cell: 'string',
        mode: ['properties', 'create', 'edit'], noEmpty: true,
        disabled: () => inSchema(indexSchemaObj.node_info),
        readonly: function (state) {
          return !indexSchemaObj.isNew(state);
        },
        group: gettext('Definition'),
        type: () => {
          return {
            type: 'select',
            options: indexSchemaObj.fieldOptions.amnameList,
            optionsLoaded: (options) => { indexSchemaObj.fieldOptions.amnameList = options; },
            controlProps: {
              allowClear: true,
              filter: (options) => {
                let res = [];
                if (options && _.isArray(options)) {
                  _.each(options, function(d) {
                    if(d.label != '')
                      res.push({label: d.label, value: d.value, data:d});
                  });
                }
                return res;
              }
            }
          };
        },
        deferredDepChange: (state, source, topState, actionObj) => {

          const setColumns = (resolve)=>{
            resolve(()=>{
              state.columns.splice(0, state.columns.length);
              return {
                columns: state.columns,
              };
            });
          };
          if((state.amname != actionObj.oldState.amname) && state.columns.length > 0) {
            return new Promise((resolve)=>{
              Notify.confirm(
                gettext('Warning'),
                gettext('Changing access method will clear columns collection. Do you want to continue?'),
                function () {
                  setColumns(resolve);
                },
                function() {
                  resolve(()=>{
                    state.amname = actionObj.oldState.amname;
                    return {
                      amname: state.amname,
                    };
                  });
                }
              );
            });
          } else {
            return Promise.resolve(()=>{/*This is intentional (SonarQube)*/});
          }
        },
      },
      {
        id: 'include', label: gettext('Include columns'),
        group: gettext('Definition'),
        editable: false, canDelete: true, canAdd: true, mode: ['properties'],
        disabled: () => inSchema(indexSchemaObj.node_info),
        readonly: function (state) {
          return !indexSchemaObj.isNew(state);
        },
        type: () => {
          return indexSchemaObj.getColumns();
        },
        visible: function() {
          return indexSchemaObj.isVisible();
        },
        node:'column',
      },{
        id: 'fillfactor', label: gettext('Fill factor'), cell: 'string',
        type: 'int', disabled: () => inSchema(indexSchemaObj.node_info),
        mode: ['create', 'edit', 'properties'],
        min: 10, max:100, group: gettext('Definition'),
      },{
        id: 'indisunique', label: gettext('Unique?'), cell: 'string',
        type: 'switch', disabled: () => inSchema(indexSchemaObj.node_info),
        readonly: function (state) {
          return !indexSchemaObj.isNew(state);
        },
        group: gettext('Definition'),
      },{
        id: 'indisclustered', label: gettext('Clustered?'), cell: 'string',
        type: 'switch', group: gettext('Definition'), deps: ['name'],
        disabled: function (state) {
          return isEmptyString(state.name) || inSchema(indexSchemaObj.node_info);
        },
        depChange: (state)=>{
          if(isEmptyString(state.name)) {
            return {indisclustered: false};
          }
        }
      },{
        id: 'indisvalid', label: gettext('Valid?'), cell: 'string',
        type: 'switch', mode: ['properties'],
        group: gettext('Definition'),
      },{
        id: 'indisprimary', label: gettext('Primary?'), cell: 'string',
        type: 'switch', mode: ['properties'],
        group: gettext('Definition'),
      },{
        id: 'is_sys_idx', label: gettext('System index?'), cell: 'string',
        type: 'switch', mode: ['properties'],
      },{
        id: 'isconcurrent', label: gettext('Concurrent build?'), cell: 'string',
        type: 'switch', disabled: () => inSchema(indexSchemaObj.node_info),
        readonly: function (state) {
          return !indexSchemaObj.isNew(state);
        },
        mode: ['create'], group: gettext('Definition'),
      },{
        id: 'indconstraint', label: gettext('Constraint'), cell: 'string',
        type: 'sql', controlProps: {className:['custom_height_css_class']},
        disabled: () => inSchema(indexSchemaObj.node_info),
        readonly: function (state) {
          return !indexSchemaObj.isNew(state);
        },
        mode: ['create', 'edit'],
        control: 'sql-field', visible: true, group: gettext('Definition'),
      }, {
        id: 'columns', label: gettext('Columns'), type: 'collection', deps: ['amname'],
        group: gettext('Definition'), schema: indexSchemaObj.getColumnSchema(),
        mode: ['edit', 'create', 'properties'],
        canAdd: function(state) {
          // We will disable it if it's in 'edit' mode
          return indexSchemaObj.isNew(state);
        },
        canEdit: false,
        canDelete: function(state) {
          // We will disable it if it's in 'edit' mode
          return indexSchemaObj.isNew(state);
        },
        uniqueCol : ['colname'],
        columns: ['colname', 'op_class', 'sort_order', 'nulls', 'collspcname']
      }, {
        id: 'include', label: gettext('Include columns'),
        type: () => {
          return indexSchemaObj.getColumns();
        },
        group: gettext('Definition'),
        editable: false,
        canDelete: true, canAdd: true, mode: ['edit', 'create'],
        disabled: () => inSchema(indexSchemaObj.node_info),
        readonly: function (state) {
          return !indexSchemaObj.isNew(state);
        },
        visible: function() {
          return indexSchemaObj.isVisible();
        },
        node:'column',
      },{
        id: 'description', label: gettext('Comment'), cell: 'string',
        type: 'multiline', mode: ['properties', 'create', 'edit'],
        deps: ['name'],
        disabled: function (state) {
          return isEmptyString(state.name) || inSchema(indexSchemaObj.node_info);
        },
        depChange: (state)=>{
          if(isEmptyString(state.name)) {
            return {comment: ''};
          }
        }
      },
    ];
  }

  validate(state, setError) {
    let msg;

    // Checks if columns is empty
    let cols = state.columns;
    if(_.isArray(cols) && cols.length == 0){
      msg = gettext('You must specify at least one column.');
      setError('columns', msg);
      return true;
    }
    return null;
  }
}
