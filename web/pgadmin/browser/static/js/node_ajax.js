/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import getApiInstance from '../../../static/js/api_instance';
import {generate_url} from 'sources/browser/generate_url';
import pgAdmin from 'sources/pgadmin';

/* It generates the URL based on collection node selected */
export function generateCollectionURL(item, type) {
  let opURL = {
    'properties': 'obj',
    'children': 'nodes',
    'drop': 'obj',
  };
  let nodeObj= this;
  let collectionPickFunction = function (treeInfoValue, treeInfoKey) {
    return (treeInfoKey != nodeObj.type);
  };
  let treeInfo = pgAdmin.Browser.tree.getTreeNodeHierarchy(item);
  let actionType = type in opURL ? opURL[type] : type;
  let nodeType = type === 'properties' ? nodeObj.type : nodeObj.node;
  return generate_url(
    pgAdmin.Browser.URL, treeInfo, actionType, nodeType,
    collectionPickFunction
  );
}

/* It generates the URL based on tree node selected */
export function generateNodeUrl(treeNodeInfo, actionType, itemNodeData, withId, jumpAfterNode) {
  let opURL = {
      'create': 'obj',
      'drop': 'obj',
      'edit': 'obj',
      'properties': 'obj',
      'statistics': 'stats',
    },
    priority = -Infinity;
  let nodeObj = this;
  let itemID = withId && itemNodeData._type == nodeObj.type ? encodeURIComponent(itemNodeData._id) : '';
  actionType = actionType in opURL ? opURL[actionType] : actionType;

  if (nodeObj.parent_type) {
    if (_.isString(nodeObj.parent_type)) {
      let p = treeNodeInfo[nodeObj.parent_type];
      if (p) {
        priority = p.priority;
      }
    } else {
      _.each(nodeObj.parent_type, function(o) {
        let p = treeNodeInfo[o];
        if (p) {
          if (priority < p.priority) {
            priority = p.priority;
          }
        }
      });
    }
  }

  let jump_after_priority = priority;
  if(jumpAfterNode && treeNodeInfo[jumpAfterNode]) {
    jump_after_priority = treeNodeInfo[jumpAfterNode].priority;
  }

  let nodePickFunction = function(treeInfoValue) {
    return (treeInfoValue.priority <= jump_after_priority || treeInfoValue.priority == priority);
  };

  return generate_url(pgAdmin.Browser.URL, treeNodeInfo, actionType, nodeObj.type, nodePickFunction, itemID);
}


/* Get the nodes list as options required by select controls
 * The options are cached for performance reasons.
 */
export function getNodeAjaxOptions(url, nodeObj, treeNodeInfo, itemNodeData, params={}, transform=(data)=>data) {
  let otherParams = {
    urlWithId: false,
    jumpAfterNode: null,
    useCache: true,
    customGenerateUrl: null,
    ...params
  };
  return new Promise((resolve, reject)=>{
    const api = getApiInstance();
    let fullUrl = '';
    if(url) {
      if(otherParams.customGenerateUrl) {
        fullUrl = otherParams.customGenerateUrl.call(
          nodeObj, treeNodeInfo, url, itemNodeData, otherParams.urlWithId, otherParams.jumpAfterNode
        );
      } else {
        fullUrl = generateNodeUrl.call(
          nodeObj, treeNodeInfo, url, itemNodeData, otherParams.urlWithId, otherParams.jumpAfterNode
        );
      }
    }

    if (url) {
      let cacheNode = pgAdmin.Browser.Nodes[otherParams.cacheNode] || nodeObj;
      let cacheLevel = otherParams.cacheLevel || cacheNode.cache_level(treeNodeInfo, otherParams.urlWithId);
      /*
      * We needs to check, if we have already cached data for this url.
      * If yes - use that, and do not bother about fetching it again,
      * and use it.
      */
      let data = cacheNode.cache(nodeObj.type + '#' + url, treeNodeInfo, cacheLevel);

      if (_.isUndefined(data) || _.isNull(data)) {
        api.get(fullUrl, {
          params: otherParams.urlParams,
        }).then((res)=>{
          data = res.data;
          if(res.data.data) {
            data = res.data.data;
          }
          otherParams.useCache && cacheNode.cache(nodeObj.type + '#' + url, treeNodeInfo, cacheLevel, data);
          resolve(transform(data));
        }).catch((err)=>{
          reject(err);
        });
      } else {
        // To fetch only options from cache, we do not need time from 'at'
        // attribute but only options.
        resolve(transform(data.data || []));
      }
    }
  });
}

/* Get the nodes list based on current selected node id */
export function getNodeListById(nodeObj, treeNodeInfo, itemNodeData, params={}, filter=()=>true) {
  /* Transform the result to add image details */
  const transform = (rows) => {
    let res = [];

    _.each(rows, function(r) {
      if (filter(r)) {
        let l = (_.isFunction(nodeObj['node_label']) ?
            (nodeObj['node_label']).apply(nodeObj, [r]) :
            r.label),
          image = (_.isFunction(nodeObj['node_image']) ?
            (nodeObj['node_image']).apply(nodeObj, [r]) :
            (nodeObj['node_image'] || ('icon-' + nodeObj.type)));

        res.push({
          'value': r._id,
          'image': image,
          'label': l,
        });
      }
    });

    return res;
  };

  return getNodeAjaxOptions('nodes', nodeObj, treeNodeInfo, itemNodeData, params, transform);
}

/* Get the nodes list based on node name passed */
export function getNodeListByName(node, treeNodeInfo, itemNodeData, params={}, filter=()=>true, postTransform=(res)=>res) {
  let nodeObj = pgAdmin.Browser.Nodes[node];
  let {includeItemKeys} = params;
  /* Transform the result to add image details */
  const transform = (rows) => {
    let res = [];

    _.each(rows, function(r) {
      if (filter(r)) {
        let l = (_.isFunction(nodeObj['node_label']) ?
            (nodeObj['node_label']).apply(nodeObj, [r]) :
            r.label),
          image = (_.isFunction(nodeObj['node_image']) ?
            (nodeObj['node_image']).apply(nodeObj, [r]) :
            (nodeObj['node_image'] || ('icon-' + nodeObj.type)));

        res.push({
          'value': r.label,
          'image': image,
          'label': l,
          ..._.pick(r, includeItemKeys),
        });
      }
    });

    return postTransform(res);
  };

  return getNodeAjaxOptions('nodes', nodeObj, treeNodeInfo, itemNodeData, params, transform);
}
