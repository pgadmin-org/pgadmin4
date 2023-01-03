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
import _ from 'lodash';
import { isEmptyString } from 'sources/validators';
import { SCHEMA_STATE_ACTIONS } from '../../../../../../../../../../static/js/SchemaView';
import TableSchema from '../../../../static/js/table.ui';
export default class PrimaryKeySchema extends BaseUISchema {
  constructor(fieldOptions={}, nodeInfo={}) {
    super({
      name: undefined,
      oid: undefined,
      is_sys_obj: undefined,
      comment: undefined,
      spcname: undefined,
      index: undefined,
      fillfactor: undefined,
      condeferrable: undefined,
      condeferred: undefined,
      columns: [],
      include: [],
    });

    this.fieldOptions = fieldOptions;
    this.nodeInfo = nodeInfo;
  }

  get idAttribute() {
    return 'oid';
  }

  get inTable() {
    return this.top && this.top instanceof TableSchema;
  }

  changeColumnOptions(columns) {
    this.fieldOptions.columns = columns;
  }

  get baseFields() {
    let obj = this;

    return [{
      id: 'name', label: gettext('Name'), type: 'text',
      mode: ['properties', 'create', 'edit'], editable:true,
      cell: 'text',
    },{
      id: 'oid', label: gettext('OID'), cell: 'text',
      type: 'text' , mode: ['properties'], editable: false,
    },{
      id: 'is_sys_obj', label: gettext('System primary key?'),
      cell:'switch', type: 'switch', mode: ['properties'],
    },{
      id: 'comment', label: gettext('Comment'), cell: 'multiline',
      type: 'multiline', mode: ['properties', 'create', 'edit'],
      deps:['name'], disabled: (state)=>{
        return isEmptyString(state.name);
      }, depChange: (state)=>{
        if(isEmptyString(state.name)){
          return {comment: ''};
        }
      }
    },{
      id: 'columns', label: gettext('Columns'),
      deps: ()=>{
        let ret = ['index'];
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
            currColumns = _.filter(currColumns, (cc)=>cc.column != oldColumn.name);
          } else if(actionObj.type == SCHEMA_STATE_ACTIONS.SET_VALUE) {
            let tabColPath = _.slice(actionObj.path, 0, -1);
            let oldColName = _.get(actionObj.oldState, tabColPath).name;
            let idx = _.findIndex(currColumns, (cc)=>cc.column == oldColName);
            if(idx > -1) {
              currColumns[idx].column = _.get(topState, tabColPath).name;
            }
          }
        }
        return {columns: currColumns};
      },
      cell: ()=>({
        cell: '',
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=>{
              /* remove the column key and pass as array */
              return _.join((backendVal||[]).map((singleVal)=>singleVal.column));
            },
          },
        }
      }),
      type: ()=>({
        type: 'select',
        optionsReloadBasis: obj.fieldOptions.columns?.map ? _.join(obj.fieldOptions.columns.map((c)=>c.label), ',') : null,
        options: obj.fieldOptions.columns,
        controlProps: {
          allowClear:false,
          multiple: true,
          formatter: {
            fromRaw: (backendVal, allOptions)=>{
              /* remove the column key and pass as array */
              let optValues = (backendVal||[]).map((singleVal)=>singleVal.column);
              return _.filter(allOptions, (opt)=>optValues.indexOf(opt.value)>-1);
            },
            toRaw: (value)=>{
              /* take the array and convert to column key collection */
              return (value||[]).map((singleVal)=>({column: singleVal.value}));
            },
          },
        },
      }), group: gettext('Definition'),
      editable: false,
      readonly: function(state) {
        if(!obj.isNew(state)) {
          return true;
        }
      },
      disabled: function(state) {
        // Disable if index is selected.
        return !(_.isUndefined(state.index) || state.index == '');
      },
    },{
      id: 'include', label: gettext('Include columns'),
      type: ()=>({
        type: 'select',
        options: this.fieldOptions.columns,
        controlProps: {
          multiple: true,
        },
      }), group: gettext('Definition'),
      editable: false,
      canDelete: true, canAdd: true,
      mode: ['properties', 'create', 'edit'],
      visible: function() {
        /* In table properties, nodeInfo is not available */
        return this.getServerVersion() >= 110000;
      },
      deps: ['index'],
      readonly: function(state) {
        return obj.isReadOnly(state);
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
    },{
      id: 'spcname', label: gettext('Tablespace'),
      type: 'select', group: gettext('Definition'),
      options: this.fieldOptions.spcname,
      deps: ['index'],
      controlProps:{allowClear:false},
      disabled: function(state) {
        // Disable if index is selected.
        return !(_.isUndefined(state.index) || state.index == '');
      },
      depChange: (state)=>{
        if(_.isUndefined(state.index) || state.index == '') {
          return {};
        } else {
          return {spcname: ''};
        }
      }
    },{
      id: 'index', label: gettext('Index'),
      mode: ['create'],
      type: 'select', group: gettext('Definition'),
      options: this.fieldOptions.index,
      controlProps:{
        allowClear:true,
      },
      readonly: function() {
        if(!obj.isNew()) {
          return true;
        }
      },
      // We will not show this field in Create Table mode
      visible: function() {
        return !obj.inTable;
      },
    },{
      id: 'fillfactor', label: gettext('Fill factor'), deps: ['index'],
      type: 'int', group: gettext('Definition'), min: 10, max: 100,
      disabled: function(state) {
        // Disable if index is selected.
        return !(_.isUndefined(state.index) || state.index == '');
      },
      depChange: (state)=>{
        if(_.isUndefined(state.index) || state.index == '') {
          return {};
        } else {
          return {fillfactor: null};
        }
      }
    },{
      id: 'condeferrable', label: gettext('Deferrable?'),
      type: 'switch', group: gettext('Definition'), deps: ['index'],
      readonly: function(state) {
        return obj.isReadOnly(state);
      },
      disabled: function(state) {
        // Disable if index is selected.
        return !(_.isUndefined(state.index) || state.index == '');
      },
      depChange: (state)=>{
        if(_.isUndefined(state.index) || state.index == '') {
          return {};
        } else {
          return {condeferrable: false};
        }
      }
    },{
      id: 'condeferred', label: gettext('Deferred?'),
      type: 'switch', group: gettext('Definition'),
      deps: ['condeferrable'],
      readonly: function(state) {
        return obj.isReadOnly(state);
      },
      disabled: function(state) {
        // Disable if index is selected.
        return !(_.isUndefined(state.index) || state.index == '') || !state.condeferrable;
      },
      depChange: (state)=>{
        if(!state.condeferrable) {
          return {condeferred: false};
        } else if(_.isUndefined(state.index) || state.index == '') {
          return {};
        } else {
          return {condeferred: false};
        }
      }
    }];
  }

  validate(state, setError) {
    if(isEmptyString(state.index)
      && (_.isUndefined(state.columns) || _.isNull(state.columns) || state.columns.length < 1)) {
      setError('columns', gettext('Please specify columns for %s.', gettext('Primary key')));
      return true;
    }
    return false;
  }
}
