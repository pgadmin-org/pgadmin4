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
import SecLabelSchema from 'top/browser/server_groups/servers/static/js/sec_label.ui';
import _ from 'lodash';
import { ConstraintsSchema } from '../../../static/js/table.ui';
import { PartitionKeysSchema, PartitionsSchema } from '../../../static/js/partition.utils.ui';
import { getNodePrivilegeRoleSchema } from '../../../../../../static/js/privilege.ui';
import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../../static/js/node_ajax';
import { getNodeForeignKeySchema } from '../../../constraints/foreign_key/static/js/foreign_key.ui';
import { getNodeExclusionConstraintSchema } from '../../../constraints/exclusion_constraint/static/js/exclusion_constraint.ui';
import * as pgadminUtils from 'sources/utils';

export function getNodePartitionTableSchema(treeNodeInfo, itemNodeData, pgBrowser) {
  const spcname = ()=>getNodeListByName('tablespace', treeNodeInfo, itemNodeData, {}, (m)=>{
    return (m.label != 'pg_global');
  });

  let partNode = pgBrowser.Nodes['partition'];

  return new PartitionTableSchema(
    {
      relowner: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
      schema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {
        cacheLevel: 'database',
        cacheNode: 'database',
      }, (d)=>{
        // If schema name start with pg_* then we need to exclude them
        return !(d && d.label.match(/^pg_/));
      }),
      spcname: spcname,
      coll_inherits: ()=>getNodeAjaxOptions('get_inherits', partNode, treeNodeInfo, itemNodeData),
      typname: ()=>getNodeAjaxOptions('get_oftype', partNode, treeNodeInfo, itemNodeData),
      like_relation: ()=>getNodeAjaxOptions('get_relations', partNode, treeNodeInfo, itemNodeData),
      table_amname_list: ()=>getNodeAjaxOptions('get_table_access_methods', partNode, treeNodeInfo, itemNodeData),
    },
    treeNodeInfo,
    {
      constraints: ()=>new ConstraintsSchema(
        treeNodeInfo,
        ()=>getNodeForeignKeySchema(treeNodeInfo, itemNodeData, pgBrowser, true),
        ()=>getNodeExclusionConstraintSchema(treeNodeInfo, itemNodeData, pgBrowser, true),
        {spcname: spcname},
      ),
    },
    (privileges)=>getNodePrivilegeRoleSchema(partNode, treeNodeInfo, itemNodeData, privileges),
    (params)=>{
      return getNodeAjaxOptions('get_columns', partNode, treeNodeInfo, itemNodeData, {urlParams: params, useCache:false});
    },
    ()=>getNodeAjaxOptions('get_collations', pgBrowser.Nodes['collation'], treeNodeInfo, itemNodeData),
    ()=>getNodeAjaxOptions('get_op_class', pgBrowser.Nodes['table'], treeNodeInfo, itemNodeData),
    ()=>{
      return getNodeAjaxOptions('get_attach_tables', partNode, treeNodeInfo, itemNodeData, {
        useCache:false,
        customGenerateUrl: (trNodeInfo, actionType)=>{
          return pgadminUtils.sprintf('table/%s/%s/%s/%s/%s/%s',
            encodeURIComponent(actionType), encodeURIComponent(trNodeInfo['server_group']._id),
            encodeURIComponent(trNodeInfo['server']._id),
            encodeURIComponent(trNodeInfo['database']._id),
            encodeURIComponent(trNodeInfo['partition'].schema_id),
            encodeURIComponent(trNodeInfo['partition']._id)
          );
        }});
    },
    {
      relowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
      schema: treeNodeInfo.schema._label,
    }
  );
}

export default class PartitionTableSchema extends BaseUISchema {
  constructor(fieldOptions={}, nodeInfo={}, schemas={}, getPrivilegeRoleSchema={}, getColumns=()=>[],
    getCollations=()=>[], getOperatorClass=()=>[], getAttachTables=()=>[], initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      spcoid: undefined,
      spcname: undefined,
      relowner: undefined,
      relacl: undefined,
      relhasoids: undefined,
      relhassubclass: undefined,
      reltuples: undefined,
      description: undefined,
      conname: undefined,
      conkey: undefined,
      isrepl: undefined,
      triggercount: undefined,
      relpersistence: undefined,
      fillfactor: undefined,
      reloftype: undefined,
      typname: undefined,
      labels: undefined,
      providers: undefined,
      is_sys_table: undefined,
      coll_inherits: [],
      hastoasttable: true,
      toast_autovacuum_enabled: 'x',
      autovacuum_enabled: 'x',
      primary_key: [],
      partitions: [],
      partition_type: 'range',
      is_partitioned: false,
      partition_value: undefined,
      amname: undefined,
      ...initValues,
    });

    this.fieldOptions = fieldOptions;
    this.schemas = schemas;
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.nodeInfo = nodeInfo;
    this.getColumns = getColumns;
    this.getAttachTables = getAttachTables;

    this.partitionKeysObj = new PartitionKeysSchema([], getCollations, getOperatorClass);
    this.partitionsObj = new PartitionsSchema(this.nodeInfo, getCollations, getOperatorClass, getAttachTables, fieldOptions.table_amname_list);
    this.constraintsObj = this.schemas.constraints();
  }

  get idAttribute() {
    return 'oid';
  }

  initialise(state) {
    this.changeColumnOptions(state.columns);
  }

  inSchemaWithModelCheck(state) {
    if(this.nodeInfo && 'schema' in this.nodeInfo) {
      return !this.isNew(state);
    }
    return false;
  }

  isPartitioned(state) {
    if(state.is_partitioned) {
      return true;
    }
    return this.inCatalog();
  }

  changeColumnOptions(columns) {
    let colOptions = (columns||[]).map((c)=>({label: c.name, value: c.name, image:'icon-column'}));
    this.constraintsObj.changeColumnOptions(colOptions);
    this.partitionKeysObj.changeColumnOptions(colOptions);
    this.partitionsObj.changeColumnOptions(colOptions);
  }

  get baseFields() {
    let obj = this;

    return [{
      id: 'name', label: gettext('Name'), type: 'text', noEmpty: true,
      mode: ['properties', 'create', 'edit'], readonly: this.inCatalog,
    },{
      id: 'oid', label: gettext('OID'), type: 'text', mode: ['properties'],
    },{
      id: 'relowner', label: gettext('Owner'), type: 'select',
      options: this.fieldOptions.relowner, noEmpty: true,
      mode: ['properties', 'create', 'edit'], controlProps: {allowClear: false},
      readonly: this.inCatalog,
    },{
      id: 'schema', label: gettext('Schema'), type: 'select',
      options: this.fieldOptions.schema, noEmpty: true,
      mode: ['create', 'edit'],
      readonly: this.inCatalog,
    },{
      id: 'spcname', label: gettext('Tablespace'),
      type: 'select', options: this.fieldOptions.spcname,
      mode: ['properties', 'create', 'edit'], deps: ['is_partitioned'],
      readonly: this.inCatalog,
    },{
      id: 'partition', type: 'group', label: gettext('Partitions'),
      mode: ['edit', 'create'], min_version: 100000,
      visible: function(state) {
        // Always show in case of create mode
        return obj.isNew(state) || state.is_partitioned;
      },
    },{
      id: 'is_partitioned', label:gettext('Partitioned table?'), cell: 'switch',
      type: 'switch', mode: ['properties', 'create', 'edit'],
      min_version: 100000,
      readonly: function(state) {
        return !obj.isNew(state);
      },
    },{
      id: 'is_sys_table', label: gettext('System table?'), cell: 'switch',
      type: 'switch', mode: ['properties'],
      disabled: this.inCatalog,
    },{
      id: 'description', label: gettext('Comment'), type: 'multiline',
      mode: ['properties', 'create', 'edit'], disabled: this.inCatalog,
    },{
      id: 'advanced', label: gettext('Advanced'), type: 'group',
      visible: true,
    },{
      id: 'coll_inherits', label: gettext('Inherited from table(s)'),
      type: 'text', group: gettext('Advanced'), mode: ['properties'],
    },
    {
      id: 'inherited_tables_cnt', label: gettext('Inherited tables count'),
      type: 'text', mode: ['properties'], group: 'advanced',
      disabled: this.inCatalog,
    },{
      // Here we will create tab control for constraints
      type: 'nested-tab', group: gettext('Constraints'),
      mode: ['edit', 'create'],
      schema: obj.constraintsObj,
    },{
      id: 'fillfactor', label: gettext('Fill factor'), type: 'int',
      mode: ['create', 'edit'], min: 10, max: 100,
      group: 'advanced',
      disabled: obj.isPartitioned,
    },{
      id: 'toast_tuple_target', label: gettext('Toast tuple target'), type: 'int',
      mode: ['create', 'edit'], min: 128, min_version: 110000,
      group: 'advanced',
      disabled: obj.isPartitioned,
    },{
      id: 'parallel_workers', label: gettext('Parallel workers'), type: 'int',
      mode: ['create', 'edit'], group: 'advanced', min_version: 90600,
      disabled: obj.isPartitioned,
    },
    {
      id: 'amname', label: gettext('Access Method'), group: 'advanced',
      type: (state)=>{
        return {
          type: 'select', options: this.fieldOptions.table_amname_list,
          controlProps: {
            allowClear: obj.isNew(state) ? true : false,
          }
        };
      }, mode: ['create', 'properties', 'edit'], min_version: 120000,
      disabled: (state) => {
        if (obj.getServerVersion() < 150000 && !obj.isNew(state)) {
          return true;
        }
        return obj.isPartitioned(state);
      },
    },
    {
      id: 'relhasoids', label: gettext('Has OIDs?'), cell: 'switch',
      type: 'switch', mode: ['properties', 'create', 'edit'],
      group: 'advanced', readonly: true,
      disabled: function() {
        if(obj.getServerVersion() >= 120000) {
          return true;
        }
        return obj.inCatalog();
      },
    },{
      id: 'relpersistence', label: gettext('Unlogged?'), cell: 'switch',
      type: 'switch', mode: ['properties', 'create', 'edit'],
      disabled: obj.inSchemaWithModelCheck,
      group: 'advanced',
    },{
      id: 'conname', label: gettext('Primary key'), cell: 'text',
      type: 'text', mode: ['properties'], group: 'advanced',
      disabled: this.inCatalog,
    },{
      id: 'reltuples', label: gettext('Rows (estimated)'), cell: 'text',
      type: 'text', mode: ['properties'], group: 'advanced',
      disabled: this.inCatalog,
    },{
      id: 'rows_cnt', label: gettext('Rows (counted)'), cell: 'text',
      type: 'text', mode: ['properties'], group: 'advanced',
      disabled: this.inCatalog,
      formatter: {
        fromRaw: ()=>{
          return 0;
        },
        toRaw: (backendVal)=>{
          return backendVal;
        },
      },
    },{
      id: 'relhassubclass', label: gettext('Is inherited?'), cell: 'switch',
      type: 'switch', mode: ['properties'], group: 'advanced',
      disabled: this.inCatalog,
    },{
      id: 'partition_type', label:gettext('Partition Type'),
      editable: false, type: 'select', controlProps: {allowClear: false},
      group: 'partition', deps: ['is_partitioned'],
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
      mode:['create'],
      min_version: 100000,
      disabled: function(state) {
        return !state.is_partitioned;
      },
      readonly: function(state) {return !obj.isNew(state);},
    },
    {
      id: 'partition_keys', label:gettext('Partition Keys'),
      schema: obj.partitionKeysObj,
      editable: true, type: 'collection',
      group: 'partition', mode: ['create'],
      deps: ['is_partitioned', 'partition_type', 'typname'],
      canEdit: false, canDelete: true,
      canAdd: function(state) {
        return obj.isNew(state) && state.is_partitioned;
      },
      canAddRow: function(state) {
        let columnsExist = false;

        let maxRowCount = 1000;
        if (state.partition_type && state.partition_type == 'list')
          maxRowCount = 1;

        if (state.columns?.length > 0) {
          columnsExist = _.some(_.map(state.columns, 'name'));
        }

        if(state.partition_keys) {
          return state.partition_keys.length < maxRowCount && columnsExist;
        }

        return true;
      }, min_version: 100000,
      depChange: (state, source, topState, actionObj)=>{
        if(state.typname != actionObj.oldState.typname) {
          return {
            partition_keys: [],
          };
        }
      }
    },
    {
      id: 'partition_scheme', label: gettext('Partition Scheme'),
      group: 'partition', mode: ['edit'],
      type: (state)=>({
        type: 'note',
        text: state.partition_scheme || '',
      }),
      min_version: 100000,
    },
    {
      id: 'partition_key_note', label: gettext('Partition Keys'),
      type: 'note', group: 'partition', mode: ['create'],
      text: [
        '<ul><li>',
        gettext('Partition table supports two types of keys:'),
        '</li><li>',
        '<strong>', gettext('Column: '), '</strong>',
        gettext('User can select any column from the list of available columns.'),
        '</li><li>',
        '<strong>', gettext('Expression: '), '</strong>',
        gettext('User can specify expression to create partition key.'),
        '</li><li>',
        '<strong>', gettext('Example: '), '</strong>',
        gettext('Let\'s say, we want to create a partition table based per year for the column \'saledate\', having datatype \'date/timestamp\', then we need to specify the expression as \'extract(YEAR from saledate)\' as partition key.'),
        '</li></ul>',
      ].join(''),
      min_version: 100000,
    },
    {
      id: 'partitions', label: gettext('Partitions'),
      schema: this.partitionsObj,
      editable: true, type: 'collection',
      group: 'partition', mode: ['edit', 'create'],
      deps: ['is_partitioned', 'partition_type', 'typname'],
      depChange: (state, source)=>{
        if(['is_partitioned', 'partition_type', 'typname'].indexOf(source[0]) >= 0 && obj.isNew(state)){
          return {'partitions': []};
        }
      },
      canEdit: true, canDelete: true,
      customDeleteTitle: gettext('Detach Partition'),
      customDeleteMsg: gettext('Are you sure you wish to detach this partition?'),
      columns:['is_attach', 'partition_name', 'is_default', 'values_from', 'values_to', 'values_in', 'values_modulus', 'values_remainder'],
      canAdd: function(state) {
        return state.is_partitioned;
      },
      min_version: 100000,
    },
    {
      id: 'partition_note', label: gettext('Partitions'),
      type: 'note', group: 'partition', mode: ['create'],
      text: [
        '<ul><li>',
        '<strong>', gettext('Create a table: '), '</strong>',
        gettext('User can create multiple partitions while creating new partitioned table. Operation switch is disabled in this scenario.'),
        '</li><li>',
        '<strong>', gettext('Edit existing table: '), '</strong>',
        gettext('User can create/attach/detach multiple partitions. In attach operation user can select table from the list of suitable tables to be attached.'),
        '</li><li>',
        '<strong>', gettext('Default: '), '</strong>',
        gettext('The default partition can store rows that do not fall into any existing partition’s range or list.'),
        '</li><li>',
        '<strong>', gettext('From/To/In input: '), '</strong>',
        gettext('From/To/In input: Values for these fields must be quoted with single quote. For more than one partition key values must be comma(,) separated.'),
        '</li><li>',
        '<strong>', gettext('Example: From/To: '), '</strong>',
        gettext('Enabled for range partition. Consider partitioned table with multiple keys of type Integer, then values should be specified like \'100\',\'200\'.'),
        '</li><li>',
        '<strong>', gettext('In: '), '</strong>',
        gettext('Enabled for list partition. Values must be comma(,) separated and quoted with single quote.'),
        '</li><li>',
        '<strong>', gettext('Modulus/Remainder: '), '</strong>',
        gettext('Enabled for hash partition.'),
        '</li></ul>',
      ].join(''),
      min_version: 100000,
    },
    {
      id: 'relacl_str', label: gettext('Privileges'), disabled: this.inCatalog,
      type: 'text', mode: ['properties'], group: gettext('Security'),
    },
    {
      id: 'relacl', label: gettext('Privileges'), type: 'collection',
      group: gettext('Security'), schema: this.getPrivilegeRoleSchema(['a','r','w','d','D','x','t']),
      mode: ['edit', 'create'], canAdd: true, canDelete: true,
      uniqueCol : ['grantee'],
    },{
      id: 'seclabels', label: gettext('Security labels'), canEdit: false,
      schema: new SecLabelSchema(), editable: false, canAdd: true,
      type: 'collection', min_version: 90100, mode: ['edit', 'create'],
      group: gettext('Security'), canDelete: true, control: 'unique-col-collection',
    },{
      id: 'vacuum_settings_str', label: gettext('Storage settings'),
      type: 'multiline', group: 'advanced', mode: ['properties'],
    }];
  }

  validate(state, setError) {
    if (state.is_partitioned && this.isNew(state) &&
        (!state.partition_keys || state.partition_keys && state.partition_keys.length <= 0)) {
      setError('partition_keys', gettext('Please specify at least one key for partitioned table.'));
      return true;
    }
    return false;
  }
}
