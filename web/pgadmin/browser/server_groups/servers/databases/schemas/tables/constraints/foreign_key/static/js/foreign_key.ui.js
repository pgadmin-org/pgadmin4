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
import DataGridViewWithHeaderForm from '../../../../../../../../../../static/js/helpers/DataGridViewWithHeaderForm';
import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../../../static/js/node_ajax';
import TableSchema from '../../../../static/js/table.ui';

export function getNodeForeignKeySchema(treeNodeInfo, itemNodeData, pgBrowser, noColumns=false, initData={}) {
  return new ForeignKeySchema({
    local_column: noColumns ? [] : ()=>getNodeListByName('column', treeNodeInfo, itemNodeData),
    references: ()=>getNodeAjaxOptions('all_tables', pgBrowser.Nodes['table'], treeNodeInfo, itemNodeData, {cacheLevel: 'server'}, (rows)=>{
      return rows.map((r)=>({
        'value': r.value,
        'image': 'icon-table',
        'label': r.label,
        oid: r.oid,
      }));
    }),
  },
  treeNodeInfo,
  (params)=>{
    return getNodeAjaxOptions('get_columns', pgBrowser.Nodes['table'], treeNodeInfo, itemNodeData, {urlParams: params, useCache:false}, (rows)=>{
      return rows.map((r)=>({
        'value': r.name,
        'image': 'icon-column',
        'label': r.name,
      }));
    });
  }, initData);
}

class ForeignKeyHeaderSchema extends BaseUISchema {
  constructor(fieldOptions, getColumns) {
    super({
      local_column: undefined,
      references: undefined,
      referenced: undefined,
      _disable_references: false,
    });

    this.fieldOptions = fieldOptions;
    this.getColumns = getColumns;
  }

  changeColumnOptions(columns) {
    this.fieldOptions.local_column = columns;
  }

  addDisabled(state) {
    return !(state.local_column && (state.references || this.origData.references) && state.referenced);
  }

  /* Data to ForeignKeyColumnSchema will added using the header form */
  getNewData(data) {
    let references_table_name = _.find(this.refTables, (t)=>t.value==data.references || t.value == this.origData.references)?.label;
    return {
      local_column: data.local_column,
      referenced: data.referenced,
      references: data.references,
      references_table_name: references_table_name,
    };
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'local_column', label: gettext('Local column'), type:'select', editable: false,
      options: this.fieldOptions.local_column,
      optionsReloadBasis: this.fieldOptions.local_column?.map ? _.join(this.fieldOptions.local_column.map((c)=>c.label), ',') : null,
    },{
      id: 'references', label: gettext('References'), type: 'select', editable: false,
      options: this.fieldOptions.references,
      optionsReloadBasis: this.fieldOptions.references?.map ? _.join(this.fieldOptions.references.map((c)=>c.label), ',') : null,
      optionsLoaded: (rows)=>obj.refTables=rows,
      disabled: (state) => {
        return state._disable_references ? true : false;
      }
    },{
      id: 'referenced', label: gettext('Referencing'), editable: false, deps: ['references'],
      type: (state)=>{
        return {
          type: 'select',
          options: state.references ? ()=>this.getColumns({tid: state.references}) : [],
          optionsReloadBasis: state.references,
        };
      },
    },
    {
      id: '_disable_references', label: '', type: 'switch', visible: false
    }];
  }
}

export class ForeignKeyColumnSchema extends BaseUISchema {
  constructor() {
    super({
      local_column: undefined,
      referenced: undefined,
      references: undefined,
      references_table_name: undefined,
    });
  }

  get baseFields() {
    return [{
      id: 'local_column', label: gettext('Local'), type:'text', editable: false,
      cell:'',
    },{
      id: 'referenced', label: gettext('Referenced'), type: 'text', editable: false,
      cell:'',
    },{
      id: 'references_table_name', label: gettext('Referenced Table'), type: 'text', editable: false,
      cell:'',
    }];
  }
}

export default class ForeignKeySchema extends BaseUISchema {
  constructor(fieldOptions={}, nodeInfo={}, getColumns=()=>[], initValues={}, inErd=false) {
    super({
      name: undefined,
      reftab: undefined,
      oid: undefined,
      is_sys_obj: undefined,
      comment: undefined,
      condeferrable: undefined,
      condeferred: undefined,
      confmatchtype: false,
      convalidated: undefined,
      columns: undefined,
      confupdtype: 'a',
      confdeltype: 'a',
      autoindex: true,
      coveringindex: undefined,
      hasindex:undefined,
      ...initValues,
    });

    this.nodeInfo = nodeInfo;

    this.fkHeaderSchema = new ForeignKeyHeaderSchema(fieldOptions, getColumns);
    this.fkHeaderSchema.fkObj = this;
    this.fkColumnSchema = new ForeignKeyColumnSchema();
    this.inErd = inErd;
  }

  get idAttribute() {
    return 'oid';
  }

  get inTable() {
    return this.top && this.top instanceof TableSchema;
  }

  changeColumnOptions(columns) {
    this.fkHeaderSchema.changeColumnOptions(columns);
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
      id: 'is_sys_obj', label: gettext('System foreign key?'),
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
      id: 'confmatchtype', label: gettext('Match type'),
      type: 'toggle', group: gettext('Definition'),
      options: [
        {label: 'FULL', value: true},
        {label: 'SIMPLE', value: false},
      ], readonly: obj.isReadonly,
    },{
      id: 'convalidated', label: gettext('Validated?'),
      type: 'switch', group: gettext('Definition'),
      readonly: (state)=>{
        if(!obj.isNew(state)) {
          let origData = {};
          if(obj.inTable && obj.top) {
            origData = _.find(obj.top.origData['foreign_key'], (r)=>r.cid == state.cid);
          } else {
            origData = obj.origData;
          }
          return origData.convalidated;
        }
        return false;
      },
    },{
      id: 'autoindex', label: gettext('Auto FK index?'),
      type: 'switch', group: gettext('Definition'),
      deps: ['name', 'hasindex'],
      readonly: (state)=>{
        if(!obj.isNew(state)) {
          return true;
        }
        // If we are in table edit mode then
        return state.hasindex;
      },
      depChange: (state, source, topState, actionObj)=>{
        if(!obj.isNew(state)) {
          return {};
        }
        // If we are in table edit mode
        if(obj.inTable && !this.inErd) {
          if(obj.isNew(state) && obj.top.isNew()) {
            return {autoindex: false, coveringindex: ''};
          }
        }

        let oldindex;
        if(obj.inTable) {
          let oldFk = _.get(actionObj.oldState, _.slice(actionObj.path, 0, -1));
          oldindex = 'fki_'+oldFk.name;
        } else {
          oldindex = 'fki_'+actionObj.oldState.name;
        }
        if(state.hasindex) {
          return {};
        } else if(!state.autoindex) {
          return {coveringindex: ''};
        } else if(state.autoindex && !isEmptyString(state.name) &&
            (isEmptyString(state.coveringindex) || oldindex == state.coveringindex)){
          return {coveringindex: 'fki_'+state.name};
        }
      },
    },{
      id: 'coveringindex', label: gettext('Covering index'), type: 'text',
      mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
      deps:['autoindex', 'hasindex'],
      disabled: (state)=>{
        return !state.autoindex && !state.hasindex;
      },
      readonly: this.isReadonly,
    },{
      id: 'references_table_name', label: gettext('Referenced Table'),
      type: 'text', group: gettext('Columns'), editable: false, visible:false, deps: ['columns'],
      cell: (state)=>({
        cell: '',
        controlProps: {
          formatter: {
            fromRaw: ()=>{
              if(state.columns?.length > 0) {
                return _.join(_.map(state.columns, 'references_table_name'), ',');
              }
              return '';
            }
          }
        }
      }),
    },{
      id: 'columns', label: gettext('Columns'),
      group: gettext('Columns'), type: 'collection',
      mode: ['create', 'edit', 'properties'],
      editable: false, schema: this.fkColumnSchema,
      headerSchema: this.fkHeaderSchema, headerVisible: (state)=>obj.isNew(state),
      CustomControl: DataGridViewWithHeaderForm,
      uniqueCol: ['local_column', 'references', 'referenced'],
      canAdd: false, canDelete: function(state) {
        // We can't update columns of existing foreign key.
        return obj.isNew(state);
      },
      readonly: obj.isReadonly, cell: ()=>({
        cell: '',
        controlProps: {
          formatter: {
            fromRaw: (rawValue)=>{
              let cols = [],
                remoteCols = [];
              if (rawValue?.length > 0) {
                rawValue.forEach((col)=>{
                  cols.push(col.local_column);
                  remoteCols.push(col.referenced);
                });
                return '('+cols.join(', ')+') -> ('+ remoteCols.join(', ')+')';
              }
              return '';
            },
          }
        },
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
        if(actionObj.type == SCHEMA_STATE_ACTIONS.ADD_ROW) {
          obj.fkHeaderSchema.origData.references = null;
          // Set references value.
          obj.fkHeaderSchema.origData.references = obj.fkHeaderSchema.sessData.references;
          obj.fkHeaderSchema.origData._disable_references = true;
        }
        return {columns: currColumns};
      },
    },{
      id: 'confupdtype', label: gettext('On update'),
      type:'select', group: gettext('Action'), mode: ['edit','create'],
      controlProps:{allowClear: false},
      options: [
        {label: 'NO ACTION', value: 'a'},
        {label: 'RESTRICT', value: 'r'},
        {label: 'CASCADE', value: 'c'},
        {label: 'SET NULL', value: 'n'},
        {label: 'SET DEFAULT', value: 'd'},
      ], readonly: obj.isReadonly,
    },{
      id: 'confdeltype', label: gettext('On delete'),
      type:'select', group: gettext('Action'), mode: ['edit','create'],
      select2:{allowClear: false},
      options: [
        {label: 'NO ACTION', value: 'a'},
        {label: 'RESTRICT', value: 'r'},
        {label: 'CASCADE', value: 'c'},
        {label: 'SET NULL', value: 'n'},
        {label: 'SET DEFAULT', value: 'd'},
      ], readonly: obj.isReadonly,
    }];
  }

  validate(state, setError) {
    if ((_.isUndefined(state.columns) || _.isNull(state.columns) || state.columns.length < 1)) {
      setError('columns', gettext('Please specify columns for Foreign key.'));
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
