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

export default class PGDOutgoingSchema extends BaseUISchema {
  constructor(initValues) {
    super({
      ...initValues,
    });
  }

  get baseFields() {
    return [
      {
        id: 'active_pid', label: gettext('Active PID'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'target_dbname', label: gettext('Target DB'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'origin_name', label: gettext('Origin'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'target_name', label: gettext('Target'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'usename', label: gettext('Usename'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'application_name', label: gettext('App Name'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'client_addr', label: gettext('Client Addr'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'client_port', label: gettext('Client Port'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'state', label: gettext('State'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'sent_lsn', label: gettext('Sent LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'write_lsn', label: gettext('Write LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'flush_lsn', label: gettext('Flush LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'replay_lsn', label: gettext('Replay LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'write_lag', label: gettext('Write Lag'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'flush_lag', label: gettext('Flush Lag'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'replay_lag', label: gettext('Replay Lag'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
    ];
  }
}
