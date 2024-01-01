/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import _ from 'lodash';
import { isEmptyString } from 'sources/validators';
import { SCHEMA_STATE_ACTIONS } from '../../../../../../../../../../static/js/SchemaView';
import DataGridViewWithHeaderForm from '../../../../../../../../../../static/js/helpers/DataGridViewWithHeaderForm';
import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../../../static/js/node_ajax';
import TableSchema from '../../../../static/js/table.ui';
import pgAdmin from 'sources/pgadmin';

function getData(data) {
  let res = [];
  if (data && _.isArray(data)) {
    _.each(data, function(d) {
      res.push({label: d[0], value: d[1]});
    });
  }
  return res;
}

export function getNodeExclusionConstraintSchema(treeNodeInfo, itemNodeData, pgBrowser, noColumns=false) {
  let tableNode = pgBrowser.Nodes['table'];
  return new ExclusionConstraintSchema({
    columns: noColumns ? [] : ()=>getNodeListByName('column', treeNodeInfo, itemNodeData, {includeItemKeys: ['datatype']}),
    amname: ()=>getNodeAjaxOptions('get_access_methods', tableNode, treeNodeInfo, itemNodeData),
    spcname: ()=>getNodeListByName('tablespace', treeNodeInfo, itemNodeData, {}, (m)=>{
      return (m.label != 'pg_global');
    }),
    getOperClass: (urlParams)=>getNodeAjaxOptions('get_oper_class', tableNode, treeNodeInfo, itemNodeData, {urlParams: urlParams, useCache:false}, (data)=>{
      return getData(data);
    }),
    getOperator: (urlParams)=>getNodeAjaxOptions('get_operator', tableNode, treeNodeInfo, itemNodeData, {urlParams: urlParams, useCache:false}, (data)=>{
      return getData(data);
    }),
  }, treeNodeInfo);
}

class ExclusionColHeaderSchema extends BaseUISchema {
  constructor(columns) {
    super({
      is_exp: undefined,
      column: undefined,
      expression: undefined,
    });

    this.columns = columns;
  }

  changeColumnOptions(columns) {
    this.columns = columns;
  }

  addDisabled(state) {
    return !(state.is_exp ? state.expression : state.column);
  }

  /* Data to ExclusionColumnSchema will added using the header form */
  getNewData(data) {
    let colType = data.is_exp ? null : _.find(this.columnOptions, (col)=>col.value==data.column)?.datatype;
    return this.exColumnSchema.getNewData({
      is_exp: data.is_exp,
      column: data.is_exp ? data.expression : data.column,
      col_type: colType,
    });
  }

  get baseFields() {
    return [{
      id: 'is_exp', label: gettext('Is expression'), type:'switch', editable: false,
    },{
      id: 'column', label: gettext('Column'), type: 'select', editable: false,
      options: this.columns, deps: ['is_exp'],
      optionsReloadBasis: this.columns?.map ? _.join(this.columns.map((c)=>c.label), ',') : null,
      optionsLoaded: (res)=>this.columnOptions=res,
      disabled: (state)=>state.is_exp,
    },{
      id: 'expression', label: gettext('Expression'), editable: false, deps: ['is_exp'],
      type: 'text', disabled: (state)=>!state.is_exp,
    }];
  }
}

class ExclusionColumnSchema extends BaseUISchema {
  constructor(getOperator) {
    super({
      column: undefined,
      is_exp: false,
      oper_class: undefined,
      order: false,
      nulls_order: false,
      operator:undefined,
      col_type:undefined,
      is_sort_nulls_applicable: false,
    });

    this.operClassOptions = [];
    this.operatorOptions = [];
    this.getOperator = getOperator;
    this.isNewExCons = true;
    this.amname = null;
  }

  isEditable() {
    if(!this.isNewExCons) {
      return false;
    } else if(this.amname === 'btree') {
      return true;
    }
    return false;
  }

  setOperClassOptions(options) {
    this.operClassOptions = options;
  }

  changeDefaults(data) {
    this.defaultColVals = data;
  }

  getNewData(data) {
    return {
      ...super.getNewData(data),
      ...this.defaultColVals,
    };
  }

  get baseFields() {
    let obj = this;
    return [{
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
      id: 'column', label: gettext('Col/Exp'), type:'', editable: false,
      cell:'', width: 125,
    },{
      id: 'oper_class', label: gettext('Operator class'), cell:'select',
      options: this.operClassOptions,
      width: 185,
      editable: obj.isEditable,
      controlProps: {
        allowClear: true, placeholder: gettext('Select the operator class'),
      },
    },{
      id: 'order', label: gettext('Order'), type: 'select', cell: 'select',
      options: [
        {label: 'ASC', value: true},
        {label: 'DESC', value: false},
      ],
      editable: obj.isEditable, width: 110, disableResizing: true,
      controlProps: {
        allowClear: false,
      },
    },{
      id: 'nulls_order', label: gettext('NULLs order'), type:'select', cell: 'select',
      options: [
        {label: 'FIRST', value: true},
        {label: 'LAST', value: false},
      ], controlProps: {allowClear: false},
      editable: obj.isEditable, width: 110, disableResizing: true,
    },{
      id: 'operator', label: gettext('Operator'), type: 'select',
      width: 95,
      editable: function() {
        return obj.isNewExCons;
      },
      cell: (state)=>{
        return {
          cell: 'select',
          options: ()=>obj.getOperator({col_type: state.col_type}),
          controlProps: {
            allowClear: false,
          },
        };
      },
    }];
  }
}

export default class ExclusionConstraintSchema extends BaseUISchema {
  constructor(fieldOptions={}, nodeInfo={}) {
    super({
      name: undefined,
      oid: undefined,
      is_sys_obj: undefined,
      comment: undefined,
      spcname: undefined,
      amname: 'gist',
      fillfactor: undefined,
      condeferrable: undefined,
      condeferred: undefined,
      columns: [],
      include: [],
    });

    this.nodeInfo = nodeInfo;
    this.fieldOptions = fieldOptions;
    this.exHeaderSchema = new ExclusionColHeaderSchema(fieldOptions.columns);
    this.exColumnSchema = new ExclusionColumnSchema(fieldOptions.getOperator);
    this.exHeaderSchema.exColumnSchema = this.exColumnSchema;
  }

  get idAttribute() {
    return 'oid';
  }

  get inTable() {
    return this.top && this.top instanceof TableSchema;
  }

  initialise(data) {
    this.exColumnSchema.isNewExCons = this.isNew(data);
    this.amname = data.amname;
    if(data.amname === 'btree') {
      this.exColumnSchema.setOperClassOptions(this.fieldOptions.getOperClass({indextype: data.amname}));
    }
  }

  changeColumnOptions(columns) {
    this.exHeaderSchema.changeColumnOptions(columns);
    this.fieldOptions.columns = columns;
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
      id: 'name', label: gettext('Name'), type: 'text', cell: 'text',
      mode: ['properties', 'create', 'edit'], editable:true,
    },{
      id: 'oid', label: gettext('OID'), cell: 'string',
      type: 'text' , mode: ['properties'],
    },{
      id: 'is_sys_obj', label: gettext('System exclusion constraint?'),
      type: 'switch', mode: ['properties'],
    },{
      id: 'comment', label: gettext('Comment'), cell: 'text',
      type: 'multiline', mode: ['properties', 'create', 'edit'],
      deps:['name'], disabled:function(state) {
        return isEmptyString(state.name);
      }, depChange: (state)=>{
        if(isEmptyString(state.name)) {
          return {comment: ''};
        }
      }
    },{
      id: 'spcname', label: gettext('Tablespace'),
      type: 'select', group: gettext('Definition'),
      controlProps: {allowClear:false}, options: this.fieldOptions.spcname,
    },{
      id: 'amname', label: gettext('Access method'),
      type: 'select', group: gettext('Definition'),
      options: this.fieldOptions.amname,
      deferredDepChange: (state, source, topState, actionObj)=>{
        return new Promise((resolve)=>{
          pgAdmin.Browser.notifier.confirm(
            gettext('Change access method?'),
            gettext('Changing access method will clear columns collection'),
            function () {
              if(state.amname == 'btree' || isEmptyString(state.amname)) {
                let indextype = 'btree';
                obj.exColumnSchema.setOperClassOptions(obj.fieldOptions.getOperClass({indextype:indextype}));
                obj.exColumnSchema.changeDefaults({
                  order: true,
                  nulls_order: true,
                  is_sort_nulls_applicable: true,
                });
              } else {
                obj.exColumnSchema.setOperClassOptions([]);
                obj.exColumnSchema.changeDefaults({
                  order: false,
                  nulls_order: false,
                  is_sort_nulls_applicable: false,
                });
              }
              obj.exColumnSchema.amname = state.amname;
              resolve(()=>({
                columns: [],
              }));
            },
            function() {
              resolve(()=>{
                return {
                  amname: actionObj.oldState.amname,
                };
              });
            }
          );
        });
      },
      controlProps: {allowClear:true},
      readonly: obj.isReadonly,
    },{
      id: 'fillfactor', label: gettext('Fill factor'),
      type: 'int', group: gettext('Definition'), allowNull: true,
    },{
      id: 'condeferrable', label: gettext('Deferrable?'),
      type: 'switch', group: gettext('Definition'),
      readonly: obj.isReadonly,
    },{
      id: 'condeferred', label: gettext('Deferred?'),
      type: 'switch', group: gettext('Definition'),
      deps: ['condeferrable'],
      disabled: function(state) {
        // Disable if condeferred is false or unselected.
        return !state.condeferrable;
      },
      readonly: obj.isReadonly,
      depChange: (state)=>{
        if(!state.condeferrable) {
          return {condeferred: false};
        }
      }
    },{
      id: 'indconstraint', label: gettext('Constraint'), cell: 'text',
      type: 'multiline', mode: ['create', 'edit', 'properties'], editable: false,
      group: gettext('Definition'), readonly: obj.isReadonly,
    },{
      id: 'columns', label: gettext('Columns/Expressions'),
      group: gettext('Columns'), type: 'collection',
      mode: ['create', 'edit', 'properties'],
      editable: false, schema: this.exColumnSchema,
      headerSchema: this.exHeaderSchema, headerVisible: (state)=>obj.isNew(state),
      CustomControl: DataGridViewWithHeaderForm,
      uniqueCol: ['column'],
      canAdd: false, canDelete: function(state) {
        // We can't update columns of existing
        return obj.isNew(state);
      },
      readonly: obj.isReadonly, cell: ()=>({
        cell: '',
        controlProps: {
          formatter: {
            fromRaw: (rawValue)=>{
              return _.map(rawValue || [], 'column').join(', ');
            },
          }
        },
        width: 245,
      }),
      deps: ()=>{
        let ret = [];
        if(obj.inTable) {
          ret.push(['columns']);
        }
        return ret;
      },
      depChange: (state, source, topState, actionObj)=>{
        /* If in table, sync up value with columns in table */
        if(obj.inTable && !state) {
          /* the FK is removed by some other dep, this can be a no-op */
          return;
        }
        let currColumns = state.columns || [];
        if(obj.inTable && source[0] == 'columns') {
          if(actionObj.type == SCHEMA_STATE_ACTIONS.DELETE_ROW) {
            let oldColumn = _.get(actionObj.oldState, actionObj.path.concat(actionObj.value));
            currColumns = _.filter(currColumns, (cc)=>cc.local_column != oldColumn.name);
          } else if(actionObj.type == SCHEMA_STATE_ACTIONS.SET_VALUE) {
            let tabColPath = _.slice(actionObj.path, 0, -1);
            let oldColName = _.get(actionObj.oldState, tabColPath).name;
            let idx = _.findIndex(currColumns, (cc)=>cc.local_column == oldColName);
            if(idx > -1) {
              currColumns[idx].local_column = _.get(topState, tabColPath).name;
            }
          }
        }
        return {columns: currColumns};
      },
    },
    {
      id: 'include', label: gettext('Include columns'), group: gettext('Columns'),
      type: ()=>({
        type: 'select',
        options: this.fieldOptions.columns,
        optionsReloadBasis: this.fieldOptions.columns?.map ? _.join(this.fieldOptions.columns.map((c)=>c.label), ',') : null,
        controlProps: {
          multiple: true,
        },
      }),
      editable: false,
      canDelete: true, canAdd: true,
      mode: ['properties', 'create', 'edit'], min_version: 110000,
      deps: ['index'],
      readonly: function() {
        if(!obj.isNew()) {
          return true;
        }
      },
      disabled: function(state) {
        // Disable if index is selected.
        return !(_.isUndefined(state.index) || state.index == '');
      },
      depChange: (state)=>{
        if(_.isUndefined(state.index) || state.index == '') {
          return {};
        } else {
          return {include: []};
        }
      }
    }];
  }

  validate(state, setError) {
    if ((_.isUndefined(state.columns) || _.isNull(state.columns) || state.columns.length < 1)) {
      setError('columns', gettext('Please specify columns for exclusion constraint.'));
      return true;
    }

    if (this.isNew(state)){
      if (state.autoindex && isEmptyString(state.coveringindex)) {
        setError('coveringindex', gettext('Please specify covering index name.'));
        return true;
      }
    }

    return false;
  }
}
