/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
/////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';

let pgBrowser = pgAdmin.Browser;

export function childCreateMenuEnabled(itemData, item, data) {
  // If check is false then , we will allow create menu
  if (data && !data.check) {
    return true;
  }

  let node = pgBrowser.tree.findNodeByDomElement(item);

  if (node)
    return node.anyFamilyMember(
      (parentNode) => (parentNode.getData()._type === 'schema')
    );

  return false;
}

export function isTreeItemOfChildOfSchema(itemData, item) {
  let node = pgBrowser.tree.findNodeByDomElement(item);

  if (node)
    return isTreeNodeOfSchemaChild(node);

  return false;
}

export function isTreeNodeOfSchemaChild(node) {
  return node.anyParent(
    (parentNode) => (parentNode.getData()._type === 'schema')
  );
}
