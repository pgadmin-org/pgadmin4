/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
/////////////////////////////////////////////////////////////

import * as Node from 'pgbrowser/node';
import {
  isTreeItemOfChildOfSchema, childCreateMenuEnabled,
} from './schema_child_tree_node';

let SchemaChildNode = Node.extend({
  parent_type: ['schema', 'catalog'],
  canDrop: isTreeItemOfChildOfSchema,
  canDropCascade: isTreeItemOfChildOfSchema,
  canCreate: childCreateMenuEnabled,
}, false);

export {SchemaChildNode};
