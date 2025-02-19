/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
/////////////////////////////////////////////////////////////

import * as Node from 'pgbrowser/node';
import * as SchemaTreeNode from './schema_child_tree_node';

const SchemaChildNode = Node.extend({
  parent_type: ['schema', 'catalog'],
  canDrop: SchemaTreeNode.isTreeItemOfChildOfSchema,
  canDropCascade: SchemaTreeNode.isTreeItemOfChildOfSchema,
  canCreate: SchemaTreeNode.childCreateMenuEnabled,
}, false);

export {SchemaChildNode};
