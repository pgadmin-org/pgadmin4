/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { generateNodeUrl, generateCollectionURL } from '../../../../pgadmin/browser/static/js/node_ajax';
import { sprintf } from 'sources/utils';

export function getURL(
  nodeData,
  with_id,
  getTreeNodeHierarchy,
  node,
  item,
  panelType
) {
  if (nodeData.is_collection && panelType === 'stats') {
    return generateCollectionURL.call(node, item, panelType);
  }
  if (_.indexOf(['partition'], nodeData._type) == -1) {
    return generateNodeUrl.call(
      node,
      getTreeNodeHierarchy,
      panelType,
      nodeData,
      with_id,
      node.url_jump_after_node
    );
  }

  return sprintf(
    'table/%s/%s/%s/%s/%s/%s',
    encodeURIComponent(panelType),
    encodeURIComponent(getTreeNodeHierarchy['server_group']._id),
    encodeURIComponent(getTreeNodeHierarchy['server']._id),
    encodeURIComponent(getTreeNodeHierarchy['database']._id),
    encodeURIComponent(getTreeNodeHierarchy['partition'].schema_id),
    encodeURIComponent(getTreeNodeHierarchy['partition']._id)
  );
}
