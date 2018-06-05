/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from '../../../../static/js/gettext';
import url_for from '../../../../static/js/url_for';
import {getTreeNodeHierarchyFromIdentifier} from '../../../../static/js/tree/pgadmin_tree_node';

export function showDataGrid(
  datagrid,
  pgBrowser,
  alertify,
  connectionData,
  aciTreeIdentifier
) {
  const node = pgBrowser.treeMenu.findNodeByDomElement(aciTreeIdentifier);
  if (node === undefined || !node.getData()) {
    alertify.alert(
      gettext('Data Grid Error'),
      gettext('No object selected.')
    );
    return;
  }

  const parentData = getTreeNodeHierarchyFromIdentifier.call(
    pgBrowser,
    aciTreeIdentifier
  );

  if (hasServerOrDatabaseConfiguration(parentData)
    || !hasSchemaOrCatalogOrViewInformation(parentData)) {
    return;
  }

  let namespaceName = retrieveNameSpaceName(parentData);
  const baseUrl = generateUrl(connectionData, node.getData(), parentData);
  const grid_title = generateDatagridTitle(parentData, namespaceName, node.getData());

  datagrid.create_transaction(
    baseUrl,
    null,
    'false',
    parentData.server.server_type,
    '',
    grid_title,
    ''
  );
}


function retrieveNameSpaceName(parentData) {
  if (parentData.schema !== undefined) {
    return parentData.schema.label;
  }
  else if (parentData.view !== undefined) {
    return parentData.view.label;
  }
  else if (parentData.catalog !== undefined) {
    return parentData.catalog.label;
  }
  return '';
}

function generateUrl(connectionData, nodeData, parentData) {
  const url_params = {
    'cmd_type': connectionData.mnuid,
    'obj_type': nodeData._type,
    'sgid': parentData.server_group._id,
    'sid': parentData.server._id,
    'did': parentData.database._id,
    'obj_id': nodeData._id,
  };

  return url_for('datagrid.initialize_datagrid', url_params);
}

function hasServerOrDatabaseConfiguration(parentData) {
  return parentData.server === undefined || parentData.database === undefined;
}

function hasSchemaOrCatalogOrViewInformation(parentData) {
  return parentData.schema !== undefined || parentData.view !== undefined ||
    parentData.catalog !== undefined;
}

function generateDatagridTitle(parentData, namespaceName, nodeData) {
  return `${parentData.server.label} - ${parentData.database.label} - ${namespaceName}.${nodeData.label}`;
}
