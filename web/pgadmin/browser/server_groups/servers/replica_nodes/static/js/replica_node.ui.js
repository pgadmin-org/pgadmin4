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

export default class ReplicaNodeSchema extends BaseUISchema {
  get idAttribute() {
    return 'pid';
  }

  get baseFields() {
    return [
      {
        id: 'pid', label: gettext('PID'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'usename', label: gettext('Username'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'application_name', label: gettext('App Name'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'client_addr', label: gettext('Client Address'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'client_hostname', label: gettext('Client Hostname'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'client_port', label: gettext('Client Port'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'state', label: gettext('State'), type: 'text', mode:['properties', 'edit'], readonly: true,
      },
      {
        id: 'sent_lsn', label: gettext('Sent LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('WAL Details')
      },
      {
        id: 'write_lsn', label: gettext('Write LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('WAL Details')
      },
      {
        id: 'flush_lsn', label: gettext('Flush LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('WAL Details')
      },
      {
        id: 'replay_lsn', label: gettext('Replay LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('WAL Details')
      },
      {
        id: 'write_lag', label: gettext('Write Lag'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('WAL Details')
      },
      {
        id: 'flush_lag', label: gettext('Flush Lag'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('WAL Details')
      },
      {
        id: 'replay_lag', label: gettext('Replay Lag'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('WAL Details')
      },
      {
        id: 'slot_name', label: gettext('Slot Name'), type: 'text', mode:['properties', 'edit'], readonly: true,
        group: gettext('Replication Slot')
      },
      {
        id: 'slot_type', label: gettext('Slot Type'), type: 'text', mode:['properties', 'edit'], readonly: true,
        group: gettext('Replication Slot')
      },
      {
        id: 'active', label: gettext('Active'), type: 'switch', mode:['properties', 'edit'], readonly: true,
        group: gettext('Replication Slot')
      },
    ];
  }
}
