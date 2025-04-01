/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';

export default class PgdReplicationGroupNodeSchema extends BaseUISchema {
  get idAttribute() {
    return 'node_group_id';
  }

  get baseFields() {
    return [
      {
        id: 'node_group_id', label: gettext('ID'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_group_name', label: gettext('Name'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_group_location', label: gettext('Location'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_group_type', label: gettext('Type'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'streaming_mode_name', label: gettext('Streaming Mode'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_group_enable_proxy_routing', label: gettext('Enable Proxy Routing?'), type: 'switch', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_group_enable_raft', label: gettext('Enable Raft?'), type: 'switch', mode:['properties', 'edit'], readonly: true,
      },
    ];
  }
}
