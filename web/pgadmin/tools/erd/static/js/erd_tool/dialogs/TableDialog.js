/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';

import TableSchema, { ConstraintsSchema } from '../../../../../../browser/server_groups/servers/databases/schemas/tables/static/js/table.ui';
import ColumnSchema from '../../../../../../browser/server_groups/servers/databases/schemas/tables/columns/static/js/column.ui';
import ForeignKeySchema from '../../../../../../browser/server_groups/servers/databases/schemas/tables/constraints/foreign_key/static/js/foreign_key.ui';

class EmptySchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
  changeColumnOptions() {
    /*This is intentional (SonarQube)*/
  }
}

export function getTableDialogSchema(attributes, isNew, tableNodesDict, colTypes, schemas) {
  let treeNodeInfo = undefined;

  let columnSchema = new ColumnSchema(
    ()=>{/*This is intentional (SonarQube)*/},
    treeNodeInfo,
    ()=>colTypes,
    ()=>[],
    ()=>[],
    true,
  );

  return new TableSchema(
    {
      relowner: [],
      schema: schemas.map((schema)=>{
        return {
          'value': schema['name'],
          'image': 'icon-schema',
          'label': schema['name'],
        };
      }),
      spcname: [],
      coll_inherits: [],
      typname: [],
      like_relation: [],
    },
    treeNodeInfo,
    {
      columns: ()=>columnSchema,
      vacuum_settings: ()=>new EmptySchema(),
      constraints: ()=>new ConstraintsSchema(
        treeNodeInfo,
        ()=>new ForeignKeySchema({
          local_column: [],
          references: ()=>{
            let retOpts = [];
            _.forEach(tableNodesDict, (node, uid)=>{
              let [schema, name] = node.getSchemaTableName();
              retOpts.push({value: uid, label: `(${schema}) ${name}`});
            });
            return retOpts;
          }
        },
        treeNodeInfo,
        (params)=>{
          if(params.tid) {
            return tableNodesDict[params.tid].getColumns().map((col)=>{
              return {
                value: col.name, label: col.name, 'image': 'icon-column',
              };
            });
          }
        }, {autoindex: false}, true),
        ()=>new EmptySchema(),
        {spcname: []},
        true
      ),
    },
    ()=>new EmptySchema(),
    ()=>[],
    ()=>[],
    ()=>[],
    ()=>[],
    isNew ? {
      schema: schemas[0]?.name,
    } : attributes,
    true
  );
}
