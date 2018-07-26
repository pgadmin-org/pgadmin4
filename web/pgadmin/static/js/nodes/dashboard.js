import {isString, isFunction} from 'sources/utils';
import pgBrowser from 'pgadmin.browser';


export function url(itemData, item, treeHierarchy) {
  let treeNode = pgBrowser.treeMenu.findNodeByDomElement(item);
  let url = null;

  if (treeNode) {
    treeNode.anyFamilyMember(
      (node) => {
        let nodeData = node.getData();
        let browserNode = pgBrowser.Nodes[nodeData._type];
        let dashboardURL = browserNode && browserNode.dashboard;

        if (isFunction(dashboardURL)) {
          dashboardURL = dashboardURL.apply(
            browserNode, [node, nodeData, treeHierarchy]
          );
        }
        url = isString(dashboardURL) ? dashboardURL : null;

        return (url !== null);
      });
  }

  return url;
}
