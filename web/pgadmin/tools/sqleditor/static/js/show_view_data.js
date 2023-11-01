/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import {getDatabaseLabel, generateTitle} from './sqleditor_title';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import _ from 'lodash';
import { isEmptyString } from 'sources/validators';
import usePreferences from '../../../../preferences/static/js/store';
import pgAdmin from 'sources/pgadmin';

export default class DataFilterSchema extends BaseUISchema {
  constructor(fieldOptions = {}) {
    super({
      filter_sql: ''
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  get baseFields() {
    return [{
      id: 'filter_sql',
      label: gettext('Data Filter'),
      type: 'sql', isFullTab: true, cell: 'text',
    }];
  }

  validate(state, setError) {
    let errmsg = null;

    if (isEmptyString(state.filter_sql)) {
      errmsg = gettext('Data filter can not be empty.');
      setError('filter_sql', errmsg);
      return true;
    } else {
      setError('filter_sql', null);
    }
  }
}

export function showViewData(
  queryToolMod,
  pgBrowser,
  connectionData,
  treeIdentifier,
  transId,
  filter=false
) {
  const node = pgBrowser.tree.findNodeByDomElement(treeIdentifier);
  if (node === undefined || !node.getData()) {
    pgAdmin.Browser.notifier.alert(
      gettext('Data Grid Error'),
      gettext('No object selected.')
    );
    return;
  }

  const parentData = pgBrowser.tree.getTreeNodeHierarchy(  treeIdentifier
  );

  if (hasServerOrDatabaseConfiguration(parentData)
    || !hasSchemaOrCatalogOrViewInformation(parentData)) {
    return;
  }

  let applicable_nodes = ['table', 'partition', 'view', 'mview', 'foreign_table', 'catalog_object'];
  if (applicable_nodes.indexOf(node.getData()._type) === -1) {
    return;
  }

  const gridUrl = generateUrl(transId, connectionData, node.getData(), parentData);
  const queryToolTitle = generateViewDataTitle(pgBrowser, treeIdentifier);

  if(filter) {
    const validateUrl = generateFilterValidateUrl(node.getData(), parentData);
    // Show Data Filter Dialog
    showFilterDialog(pgBrowser, treeIdentifier, queryToolMod, transId, gridUrl,
      queryToolTitle, validateUrl);
  } else {
    queryToolMod.launch(transId, gridUrl, false, queryToolTitle);
  }
}

export function retrieveNameSpaceName(parentData) {
  if(!parentData) {
    return null;
  }
  else if (parentData.schema !== undefined) {
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

export function retrieveNodeName(parentData) {
  if(!parentData) {
    return null;
  }
  else if (parentData.table !== undefined) {
    return parentData.table.label;
  }
  else if (parentData.view !== undefined) {
    return parentData.view.label;
  }
  else if (parentData.catalog !== undefined) {
    return parentData.catalog.label;
  }
  return '';
}

function generateUrl(trans_id, connectionData, nodeData, parentData) {
  let url_endpoint = url_for('sqleditor.panel', {
    'trans_id': trans_id,
  });

  url_endpoint += `?is_query_tool=${false}`
    +`&cmd_type=${connectionData.mnuid}`
    +`&obj_type=${nodeData._type}`
    +`&obj_id=${nodeData._id}`
    +`&sgid=${parentData.server_group._id}`
    +`&sid=${parentData.server._id}`
    +`&did=${parentData.database._id}`
    +`&server_type=${parentData.server.server_type}`;

  if(!parentData.server.username && parentData.server.user?.name) {
    url_endpoint += `&user=${parentData.server.user?.name}`;
  }

  return url_endpoint;
}

function generateFilterValidateUrl(nodeData, parentData) {
  // Create url to validate the SQL filter
  let url_params = {
    'sid': parentData.server._id,
    'did': parentData.database._id,
    'obj_id': nodeData._id,
  };

  return url_for('sqleditor.filter_validate', url_params);
}

function showFilterDialog(pgBrowser, item, queryToolMod, transId,
  gridUrl, queryToolTitle, validateUrl) {

  let schema = new DataFilterSchema();
  let helpUrl = url_for('help.static', {'filename': 'viewdata_filter.html'});

  let okCallback = function() {
    queryToolMod.launch(transId, gridUrl, false, queryToolTitle, {sql_filter: schema._sessData.filter_sql});
  };

  pgBrowser.Events.trigger('pgadmin:utility:show', item,
    gettext('Data Filter - %s', queryToolTitle),{
      schema, urlBase: validateUrl, helpUrl, saveBtnName: gettext('OK'), isTabView: false,
      onSave: okCallback,
    }, pgBrowser.stdW.md, pgBrowser.stdH.sm
  );
}

function hasServerOrDatabaseConfiguration(parentData) {
  return parentData.server === undefined || parentData.database === undefined;
}

function hasSchemaOrCatalogOrViewInformation(parentData) {
  return parentData.schema !== undefined || parentData.view !== undefined ||
    parentData.catalog !== undefined;
}

export function generateViewDataTitle(pgBrowser, treeIdentifier, custom_title=null, backend_entity=null) {
  let preferences = usePreferences.getState().getPreferencesForModule('browser');
  const parentData = pgBrowser.tree.getTreeNodeHierarchy(
    treeIdentifier
  );

  const namespaceName = retrieveNameSpaceName(parentData);
  const db_label = !_.isUndefined(backend_entity) && backend_entity != null && backend_entity.hasOwnProperty('db_name') ? backend_entity['db_name'] : getDatabaseLabel(parentData);
  const node = pgBrowser.tree.findNodeByDomElement(treeIdentifier);

  let dtg_title_placeholder = '';
  if(custom_title) {
    dtg_title_placeholder = custom_title;
  } else {
    dtg_title_placeholder = preferences['vw_edt_tab_title_placeholder'];
  }


  let title_data = {
    'database': db_label,
    'username': parentData.server.user.name,
    'server': parentData.server.label,
    'schema': namespaceName,
    'table': node.getData().label,
    'type': 'view_data',
  };
  return generateTitle(dtg_title_placeholder, title_data);
}
