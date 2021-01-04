/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import axios from 'axios';

export function disableTriggers(tree, alertify, generateUrl, args) {
  return setTriggers(tree, alertify, generateUrl, args, {is_enable_trigger: 'D' });
}
export function enableTriggers(tree, alertify, generateUrl, args) {
  return setTriggers(tree, alertify, generateUrl, args, {is_enable_trigger: 'O' });
}

function setTriggers(tree, alertify, generateUrl, args, params) {
  const treeNode = retrieveTreeNode(args, tree);

  if (!treeNode || treeNode.getData() === null || treeNode.getData() === undefined)
    return false;

  axios.put(
    generateUrl(treeNode.getHtmlIdentifier(), 'set_trigger', treeNode.getData(), true),
    params
  )
    .then((res) => {
      if (res.data.success === 1) {
        alertify.success(res.data.info);
        treeNode.reload(tree);
      }
    })
    .catch((xhr) => {
      try {
        const err = xhr.response.data;
        if (err.success === 0) {
          alertify.error(err.errormsg);
        }
      } catch (e) {
        console.warn(e.stack || e);
      }
      treeNode.unload(tree);
    });
}

function retrieveTreeNode(args, tree) {
  const input = args || {};
  const domElementIdentifier = input.item || tree.selected();
  return tree.findNodeByDomElement(domElementIdentifier);
}
