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

export default class PgdReplicationServerNodeSchema extends BaseUISchema {
  get idAttribute() {
    return 'node_id';
  }

  get baseFields() {
    return [
      {
        id: 'node_seq_id', label: gettext('Sequence ID'), type: 'numeric', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_id', label: gettext('ID'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_name', label: gettext('Name'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_kind_name', label: gettext('Kind'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_group_name', label: gettext('Group Name'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'node_local_dbname', label: gettext('Local DB Name'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
    ];
  }
}
