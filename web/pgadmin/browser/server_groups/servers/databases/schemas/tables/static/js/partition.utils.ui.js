/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { emptyValidator, isEmptyString } from '../../../../../../../../static/js/validators';

export class PartitionKeysSchema extends BaseUISchema {
  constructor(columns=[], getCollations=[], getOperatorClass=[]) {
    super({
      key_type: 'column',
    });
    this.columns = columns;
    this.columnsReloadBasis = false;
    this.getCollations = getCollations;
    this.getOperatorClass = getOperatorClass;
  }

  changeColumnOptions(columns) {
    this.columns = columns;
  }

  isEditable(state) {
    return state.key_type != 'expression';
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'key_type', label: gettext('Key type'), type:'select', editable: true,
      cell:'select', controlProps: {allowClear: false}, noEmpty: true,
      options:[{
        label: gettext('Column'), value: 'column',
      },{
        label: gettext('Expression'), value: 'expression',
      }],
    },{
      id: 'pt_column', label: gettext('Column'), type:'select',
      deps: ['key_type', ['columns']],
      depChange: (state, source)=>{
        if(state.key_type == 'expression' || source[0] == 'columns') {
          return {
            pt_column: undefined,
          };
        }
      },
      cell: ()=>({
        cell: 'select',
        optionsReloadBasis: _.join(obj.columns.map((c)=>c.label), ','),//obj.columnsReloadBasis,
        options: obj.columns,
        controlProps: {
          allowClear: false,
        }
      }),
      editable: function(state) {
        return obj.isEditable(state);
      },
    },{
      id: 'expression', label: gettext('Expression'), type:'text',
      cell: 'text', deps: ['key_type'],
      depChange: (state)=>{
        if(state.key_type == 'column') {
          return {
            expression: undefined,
          };
        }
      },
      editable: function(state) {
        return state.key_type == 'expression';
      },
    },{
      id: 'collationame', label: gettext('Collation'), cell: 'select',
      type: 'select', group: gettext('partition'), deps:['key_type'],
      options: obj.getCollations, mode: ['create', 'properties', 'edit'],
      editable: function(state) {
        return obj.isEditable(state);
      },
      disabled: ()=>{return !(obj.isNew()); },
    },
    {
      id: 'op_class', label: gettext('Operator class'), cell: 'select',
      type: 'select', group: gettext('partition'),  deps:['key_type'],
      editable: function(state) {
        return obj.isEditable(state);
      },
      disabled: ()=>{return !(obj.isNew()); },
      options: obj.getOperatorClass, mode: ['create', 'properties', 'edit'],
    }];
  }

  validate(state, setError) {
    let errmsg;
    if(state.key_type == 'column') {
      errmsg = emptyValidator('Partition key column', state.pt_column);
      if(errmsg) {
        setError('pt_column', errmsg);
        return true;
      }
    } else {
      errmsg = emptyValidator('Partition key expression', state.expression);
      if(errmsg) {
        setError('expression', errmsg);
        return true;
      }
    }
    return false;
  }
}
export class PartitionsSchema extends BaseUISchema {
  constructor(nodeInfo, getCollations, getOperatorClass, getAttachTables=()=>[]) {
    super({
      oid: undefined,
      is_attach: false,
      partition_name: undefined,
      is_default: undefined,
      values_from: undefined,
      values_to: undefined,
      values_in: undefined,
      values_modulus: undefined,
      values_remainder: undefined,
      is_sub_partitioned: false,
      sub_partition_type: 'range',
    });

    this.subPartitionsObj = new PartitionKeysSchema([], getCollations, getOperatorClass);
    this.getAttachTables = getAttachTables;
    this.nodeInfo = nodeInfo;
  }

  changeColumnOptions(columns) {
    this.subPartitionsObj.changeColumnOptions(columns);
  }

  isEditable(state, type) {
    return (this.top && this.top.sessData.partition_type == type && this.isNew(state)
        && state.is_default !== true);
  }

  isDisable(state, type) {
    return !(this.top && this.top.sessData.partition_type == type && this.isNew(state)
        && state.is_default !== true);
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'oid', label: gettext('OID'), type: 'text',
      mode: ['properties'],
    },{
      id: 'is_attach', label:gettext('Operation'), cell: 'select', type: 'select',
      width: 120, disableResizing: true, options: [
        {label: gettext('Attach'), value: true},
        {label: gettext('Create'), value: false},
      ], controlProps: {allowClear: false},
      editable: function(state) {
        return obj.isNew(state) && !obj.top.isNew();
      },
      readonly: function(state) {
        return !(obj.isNew(state) && !obj.top.isNew());
      },
    },{
      id: 'partition_name', label: gettext('Name'), deps: ['is_attach'],
      type: (state)=>{
        if(state.is_attach) {
          return {
            type: 'select',
            options: this.getAttachTables,
            controlProps: {allowClear: false},
          };
        } else {
          return {
            type: 'text',
          };
        }
      },
      cell: (state)=>{
        if(state.is_attach) {
          return {
            cell: 'select',
            options: this.getAttachTables,
            controlProps: {allowClear: false},
          };
        } else {
          return {
            cell: 'text',
          };
        }
      },
      editable: function(state) {
        return obj.isNew(state);
      },
      readonly: function(state) {
        return !obj.isNew(state);
      }, noEmpty: true,
    },{
      id: 'is_default', label: gettext('Default'), type: 'switch', cell:'switch',
      width: 55, disableResizing: true, min_version: 110000,
      editable: function(state) {
        return (obj.top && (obj.top.sessData.partition_type == 'range' ||
            obj.top.sessData.partition_type == 'list') && obj.isNew(state)
            && obj.getServerVersion() >= 110000);
      },
      readonly: function(state) {
        return !(obj.top && (obj.top.sessData.partition_type == 'range' ||
            obj.top.sessData.partition_type == 'list') && obj.isNew(state)
            && obj.getServerVersion() >= 110000);
      },
    },{
      id: 'values_from', label: gettext('From'), type:'text', cell: 'text',
      deps: ['is_default'],
      editable: function(state) {
        return obj.isEditable(state, 'range');
      },
      disabled: function(state) {
        return obj.isDisable(state, 'range');
      }
    },
    {
      id: 'values_to', label: gettext('To'), type:'text', cell: 'text',
      deps: ['is_default'],
      editable: function(state) {
        return obj.isEditable(state, 'range');
      },
      disabled: function(state) {
        return obj.isDisable(state, 'range');
      },
    },{
      id: 'values_in', label: gettext('In'), type:'text', cell: 'text',
      deps: ['is_default'],
      editable: function(state) {
        return obj.isEditable(state, 'list');
      },
      readonly: function(state) {
        return obj.isDisable(state, 'list');
      },
    },{
      id: 'values_modulus', label: gettext('Modulus'), type:'int', cell: 'int',
      editable: function(state) {
        return obj.isEditable(state, 'hash');
      },
      disabled: function(state) {
        return obj.isDisable(state, 'hash');
      },
    },{
      id: 'values_remainder', label: gettext('Remainder'), type:'int', cell: 'int',
      editable: function(state) {
        return obj.top && obj.top.sessData.partition_type == 'hash' && obj.isNew(state);
      },
      disabled: function(state) {
        return !(obj.top && obj.top.sessData.partition_type == 'hash' && obj.isNew(state)
            && state.is_default !== true);
      },
    },{
      id: 'is_sub_partitioned', label:gettext('Partitioned table?'), cell: 'switch',
      group: 'Partition', type: 'switch', mode: ['properties', 'create', 'edit'],
      deps: ['is_attach'], readonly: (state)=>{
        if(!obj.isNew(state)) {
          return true;
        }
        return state.is_attach;
      },
      depChange: (state)=>{
        if(state.is_attach) {
          return {is_sub_partitioned: false};
        }
      },
    },{
      id: 'sub_partition_type', label:gettext('Partition Type'),
      editable: false, type: 'select', controlProps: {allowClear: false},
      group: 'Partition', deps: ['is_sub_partitioned'],
      options: function() {
        let options = [{
          label: gettext('Range'), value: 'range',
        },{
          label: gettext('List'), value: 'list',
        }];

        if(obj.getServerVersion() >= 110000) {
          options.push({
            label: gettext('Hash'), value: 'hash',
          });
        }
        return Promise.resolve(options);
      },
      visible: (state)=>obj.isNew(state),
      readonly: (state)=>!obj.isNew(state),
      disabled: (state)=>!state.is_sub_partitioned,
    },{
      id: 'sub_partition_keys', label:gettext('Partition Keys'),
      schema: this.subPartitionsObj,
      editable: true, type: 'collection',
      group: 'Partition', mode: ['properties', 'create', 'edit'],
      deps: ['is_sub_partitioned', 'sub_partition_type', ['typname']],
      canEdit: false, canDelete: true,
      canAdd: function(state) {
        return obj.isNew(state) && state.is_sub_partitioned;
      },
      canAddRow: function(state) {
        let columnsExist = false;
        let columns = obj.top.sessData.columns;

        let maxRowCount = 1000;
        if (state.sub_partition_type && state.sub_partition_type == 'list')
          maxRowCount = 1;

        if (columns?.length > 0) {
          columnsExist = _.some(_.map(columns, 'name'));
        }

        if(state.sub_partition_keys) {
          return state.sub_partition_keys.length < maxRowCount && columnsExist;
        }

        return true;
      },
      depChange: (state, source, topState, actionObj)=>{
        if(topState.typname != actionObj.oldState.typname) {
          return {
            sub_partition_keys: [],
          };
        }
      },
      visible: (state)=>obj.isNew(state),
    },{
      id: 'sub_partition_scheme', label: gettext('Partition Scheme'),
      group: 'Partition', mode: ['edit'],
      type: (state)=>({
        type: 'note',
        text: state.sub_partition_scheme,
      }),
      visible: function(state) {
        return obj.isNew(state) && !isEmptyString(state.sub_partition_scheme);
      },
    }];
  }

  validate(state, setError) {
    let msg;
    if (state.is_sub_partitioned && this.isNew(state) &&
        (!state.sub_partition_keys || state.sub_partition_keys && state.sub_partition_keys.length <= 0)) {
      msg = gettext('Please specify at least one key for partitioned table.');
      setError('sub_partition_keys', msg);
      return true;
    }

    let partitionType = this.top.sessData.partition_type;
    if (partitionType === 'range') {
      if (!state.is_default && isEmptyString(state.values_from)) {
        msg = gettext('For range partition From field cannot be empty.');
        setError('values_from', msg);
        return true;
      } else if (!state.is_default && isEmptyString(state.values_to)) {
        msg = gettext('For range partition To field cannot be empty.');
        setError('values_to', msg);
        return true;
      }
    } else if (partitionType === 'list') {
      if (!state.is_default && isEmptyString(state.values_in)) {
        msg = gettext('For list partition In field cannot be empty.');
        setError('values_in', msg);
        return true;
      }
    } else if (partitionType === 'hash') {
      if(isEmptyString(state.values_modulus)) {
        msg = gettext('For hash partition Modulus field cannot be empty.');
        setError('values_modulus', msg);
        return true;
      }

      if(isEmptyString(state.values_remainder)) {
        msg = gettext('For hash partition Remainder field cannot be empty.');
        setError('values_remainder', msg);
        return true;
      }
    }

    return false;
  }
}
