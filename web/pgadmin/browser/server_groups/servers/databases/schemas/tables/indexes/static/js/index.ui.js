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
import DataGridViewWithHeaderForm from '../../../../../../../../../static/js/helpers/DataGridViewWithHeaderForm';
import _ from 'lodash';
import { isEmptyString } from 'sources/validators';
import pgAdmin from 'sources/pgadmin';


function inSchema(node_info) {
  return node_info && 'catalog' in node_info;
}

class IndexColHeaderSchema extends BaseUISchema {
  constructor(columns) {
    super({
      is_exp: true,
      colname: undefined,
      expression: undefined,
    });

    this.columns = columns;
  }

  changeColumnOptions(columns) {
    this.columns = columns;
  }

  addDisabled(state) {
    return !(state.is_exp ? state.expression : state.colname);
  }

  /* Data to IndexColumnSchema will be added using the header form */
  getNewData(data) {
    return this.indexColumnSchema.getNewData({
      is_exp: data.is_exp,
      colname: data.is_exp ? data.expression : data.colname,
    });
  }

  get baseFields() {
    return [{
      id: 'is_exp', label: gettext('Is expression'), type:'switch', editable: false,
    },{
      id: 'colname', label: gettext('Column'), type: 'select', editable: false,
      options: this.columns, deps: ['is_exp'],
      optionsReloadBasis: this.columns?.map ? _.join(this.columns.map((c)=>c.label), ',') : null,
      optionsLoaded: (res)=>this.columnOptions=res,
      disabled: (state)=>state.is_exp, node: 'column',
    },{
      id: 'expression', label: gettext('Expression'), editable: false, deps: ['is_exp'],
      type: 'sql', disabled: (state)=>!state.is_exp,
    }];
  }
}

class IndexColumnSchema extends BaseUISchema {
  constructor(nodeData = {}) {
    super({
      colname: undefined,
      is_exp: false,
      op_class: undefined,
      sort_order: false,
      nulls: false,
      is_sort_nulls_applicable: false,
      collspcname:undefined
    });
    this.node_info = {
      ...nodeData
    };
    this.operClassOptions = [];
    this.collationOptions = [];
    this.op_class_types = [];
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

  setOperClassOptions(options) {
    this.operClassOptions = options;
  }

  setCollationOptions(options) {
    this.collationOptions = options;
  }

  getNewData(data) {
    return {
      ...super.getNewData(data),
    };
  }

  // We will check if we are under schema node & in 'create' mode
  inSchemaWithModelCheck(state) {
    if(this.node_info &&  'schema' in this.node_info) {
      // We will disable control if it's in 'edit' mode
      return !this.isNew(state);
    }
    return true;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'is_exp', label: '', type:'', cell: '', editable: false, width: 20,
        disableResizing: true,
        controlProps: {
          formatter: {
            fromRaw: function (rawValue) {
              return rawValue ? 'E' : 'C';
            },
          }
        }, visible: false,
      },{
        id: 'colname', label: gettext('Col/Exp'), type:'', editable: false,
        cell:'', width: 100,
      },{
        id: 'op_class', label: gettext('Operator class'), tags: true, type: 'select',
        cell: () => {
          return {
            cell: 'select',
            options: obj.operClassOptions,
            optionsLoaded: (options)=>{obj.setOpClassTypes(options);},
            controlProps: {
              allowClear: true,
              filter: (options) => {
                /* We need to extract data from collection according
                  * to access method selected by user if not selected
                  * send btree related op_class options
                  */
                let amname = obj._top?._sessData ? obj._top?._sessData.amname : obj._top?._origData.amname;

                if(_.isUndefined(amname))
                  return options;

                _.each(obj.op_class_types, function(v, k) {
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
          return !obj.inSchemaWithModelCheck(state);
        },
        node: 'index',
        url_jump_after_node: 'schema',
        deps: ['amname'],
      },{
        id: 'sort_order', label: gettext('Sort order'), type: 'select', cell: 'select',
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
          return obj.isEditable(state);
        },
        deps: ['amname'],
      },{
        id: 'nulls', label: gettext('NULLs'), type:'select', cell: 'select',
        options: [
          {label: 'FIRST', value: true},
          {label: 'LAST', value: false},
        ], controlProps: {allowClear: false},
        width: 110, disableResizing: true,
        editable: function(state) {
          return obj.isEditable(state);
        },
        deps: ['amname', 'sort_order'],
      },{
        id: 'collspcname', label: gettext('Collation'),
        type: 'select',
        cell: 'select',
        disabled: () => inSchema(obj.node_info),
        editable: function (state) {
          return !obj.inSchemaWithModelCheck(state);
        },
        options: obj.collationOptions,
        node: 'index',
        url_jump_after_node: 'schema',
      },{
        id: 'statistics', label: gettext('Statistics'),
        type: 'int', cell: 'int', disabled: (state)=> {
          return (!state.is_exp || obj.node_info.server.version < 110000);
        },
        min: -1, max: 10000, mode: ['edit','properties'],
      }
    ];
  }
}

export class WithSchema extends BaseUISchema {
  constructor(node_info) {
    super({});
    this.node_info = node_info;
  }
  
  get baseFields() {
    let withSchemaObj = this;
    return [
      {
        id: 'fillfactor', label: gettext('Fill factor'), deps: ['amname'], cell: 'string',
        type: 'int', disabled: (state) => {
          return !_.includes(['btree', 'hash', 'gist', 'spgist'], state.amname) || inSchema(withSchemaObj.node_info);
        },
        mode: ['create', 'edit', 'properties'],
        min: 10, max:100, group: gettext('Definition'),
        depChange: state => {
          if (!_.includes(['btree', 'hash', 'gist', 'spgist'], state.amname)) {
            return {fillfactor: ''};
          }
        }
      },{
        id: 'gin_pending_list_limit', label: gettext('Gin pending list limit'), cell: 'string',
        type: 'int', deps: ['amname'], disabled: state => state.amname !== 'gin' || inSchema(withSchemaObj.node_info),
        mode: ['create', 'edit', 'properties'],
        group: gettext('Definition'), min: 64, max: 2147483647,
        depChange: state => {
          if (state.amname !== 'gin') {
            return {gin_pending_list_limit: ''};
          }
        }, helpMessage: gettext('This value is specified in kilobytes.')
      },{
        id: 'pages_per_range', label: gettext('Pages per range'), cell: 'string',
        type: 'int', deps: ['amname'], disabled: state => state.amname !== 'brin' || inSchema(withSchemaObj.node_info),
        mode: ['create', 'edit', 'properties'],
        group: gettext('Definition'), depChange: state => {
          if (state.amname !== 'brin') {
            return {pages_per_range: ''};
          }
        }, helpMessage: gettext('Number of table blocks that make up one block range for each entry of a BRIN index.')
      },{
        id: 'buffering', label: gettext('Buffering'), cell: 'string', group: gettext('Definition'),
        type: 'select', deps: ['amname'], mode: ['create', 'edit', 'properties'], options: [
          {
            label: gettext('Auto'),
            value: 'auto',
          },
          {
            label: gettext('On'),
            value: 'on',
          },
          {
            label: gettext('Off'),
            value: 'off',
          }], disabled: state => state.amname !== 'gist' || inSchema(withSchemaObj.node_info),
        depChange: (state, source) => {
          if (state.amname !== 'gist') {
            return {buffering: ''};
          } else if (state.amname === 'gist' && source[0] !== 'buffering') {
            return {buffering: 'auto'};
          }
        }
      },{
        id: 'deduplicate_items', label: gettext('Deduplicate items?'), cell: 'string',
        type: 'switch', deps:['amname'], mode: ['create', 'edit', 'properties'], disabled: (state) => {
          return state.amname !== 'btree' || inSchema(withSchemaObj.node_info);
        },
        depChange: (state, source) => {
          if (state.amname !== 'btree') {
            return {deduplicate_items:undefined};
          } else if (state.amname === 'btree' && source[0] !== 'deduplicate_items' && 
            withSchemaObj.node_info.server.version >= 130000) {
            return {deduplicate_items: true};
          }
        }, min_version: 130000,
        group: gettext('Definition'),
      },{
        id: 'fastupdate', label: gettext('Fast update?'), cell: 'string',
        type: 'switch', deps:['amname'], mode: ['create', 'edit', 'properties'], disabled: (state) => {
          return state.amname !== 'gin' || inSchema(withSchemaObj.node_info);
        },
        depChange: (state, source) => {
          if (state.amname !== 'gin') {
            return {fastupdate:undefined};
          } else if (state.amname === 'gin' && source[0] !== 'fastupdate') {
            return {fastupdate: true};
          }
        },
        group: gettext('Definition'),
      },{
        id: 'autosummarize', label: gettext('Autosummarize?'), cell: 'string',
        type: 'switch', deps:['amname'], mode: ['create', 'edit', 'properties'], disabled: state => {
          return state.amname !== 'brin' || inSchema(withSchemaObj.node_info);
        }, group: gettext('Definition'),
        depChange: (state) => {
          if (state.amname !== 'brin') {
            return {autosummarize:undefined};
          }
        }
      }
    ];
  }
}

export default class IndexSchema extends BaseUISchema {
  constructor(fieldOptions = {}, nodeData = {}, initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      description: '',
      is_sys_obj: false,
      nspname: undefined,
      tabname: undefined,
      spcname: undefined,
      amname: undefined,
      fastupdate: false,
      autosummarize: false,
      columns: [],
      ...initValues
    });
    this.fieldOptions = {
      tablespaceList: [],
      amnameList: [],
      columnList: [],
      opClassList: [],
      collationList: [],
      ...fieldOptions
    };
    this.node_info = {
      ...nodeData.node_info
    };
    this.indexHeaderSchema = new IndexColHeaderSchema(this.fieldOptions.columnList);
    this.indexColumnSchema = new IndexColumnSchema(this.node_info);
    this.indexHeaderSchema.indexColumnSchema = this.indexColumnSchema;
    this.withSchema = new WithSchema(this.node_info);
  }

  get idAttribute() {
    return 'oid';
  }

  initialise() {
    this.indexColumnSchema.setOperClassOptions(this.fieldOptions.opClassList);
    this.indexColumnSchema.setCollationOptions(this.fieldOptions.collationList);
  }

  changeColumnOptions(columns) {
    this.indexHeaderSchema.changeColumnOptions(columns);
    this.fieldOptions.columns = columns;
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
              state.columns.splice(0, state.columns?.length);
              return {
                columns: state.columns,
              };
            });
          };
          if((state.amname != actionObj?.oldState.amname) && state.columns?.length > 0) {
            return new Promise((resolve)=>{
              pgAdmin.Browser.notifier.confirm(
                gettext('Warning'),
                gettext('Changing access method will clear columns collection. Do you want to continue?'),
                function () {
                  setColumns(resolve);
                },
                function() {
                  resolve(()=>{
                    state.amname = actionObj?.oldState.amname;
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
      },{
        type: 'nested-fieldset', label: gettext('With'), group: gettext('Definition'),
        schema: this.withSchema,
      },{
        id: 'indisunique', label: gettext('Unique?'), cell: 'string',
        type: 'switch', deps:['amname'], disabled: (state) => {
          return state.amname !== 'btree' || inSchema(indexSchemaObj.node_info);
        },
        readonly: function (state) {
          return !indexSchemaObj.isNew(state);
        },
        depChange: (state) => {
          if (state.amname !== 'btree') {
            return {indisunique:false};
          }
        },
        group: gettext('Definition'),
      },{
        id: 'indnullsnotdistinct', label: gettext('NULLs not distinct?'), cell: 'string',
        type: 'switch', deps:['indisunique', 'amname'], disabled: (state) => {
          return !state.indisunique || inSchema(indexSchemaObj.node_info);
        },
        readonly: function (state) {
          return !indexSchemaObj.isNew(state);
        },
        depChange: (state) => {
          if (!state.indisunique) {
            return {indnullsnotdistinct:false};
          }
        },
        min_version: 150000,
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
      },{
        id: 'columns', label: gettext('Columns/Expressions'),
        group: gettext('Columns'), type: 'collection',
        mode: ['create', 'edit', 'properties'],
        editable: false, schema: this.indexColumnSchema,
        headerSchema: this.indexHeaderSchema, headerVisible: (state)=>indexSchemaObj.isNew(state),
        CustomControl: DataGridViewWithHeaderForm,
        uniqueCol: ['colname'],
        canAdd: false, canDelete: function(state) {
          // We can't update columns of existing
          return indexSchemaObj.isNew(state);
        }, cell: ()=>({
          cell: '',
          controlProps: {
            formatter: {
              fromRaw: (rawValue)=>{
                return _.map(rawValue || [], 'colname').join(', ');
              },
            }
          },
          width: 245,
        })
      },{
        id: 'include', label: gettext('Include columns'),
        type: () => {
          return indexSchemaObj.getColumns();
        },
        group: gettext('Columns'),
        editable: false,
        canDelete: true, canAdd: true, mode: ['edit', 'create', 'properties'],
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

    if (!this.isNew(state) && isEmptyString(state.name)) {
      msg = gettext('Name cannot be empty in edit mode.');
      setError('name', msg);
      return true;
    } else {
      setError('name', null);
    }

    // Checks if columns is empty
    let cols = state.columns;
    if(_.isArray(cols) && cols.length == 0){
      msg = gettext('You must specify at least one column/expression.');
      setError('columns', msg);
      return true;
    }
    return null;
  }
}
