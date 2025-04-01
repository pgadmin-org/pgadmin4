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

export default class PGDIncomingSchema extends BaseUISchema {
  constructor(initValues) {
    super({
      ...initValues,
    });
  }

  get baseFields() {
    return [
      {
        id: 'node_group_name', label: gettext('Group Name'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'sub_name', label: gettext('Subscription'), type: 'text', mode:['properties'], readonly: true,
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
        id: 'sub_enabled', label: gettext('Enabled'), type: 'switch', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'subscription_status', label: gettext('Status'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'receive_lsn', label: gettext('Receive LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'receive_commit_lsn', label: gettext('Receive Commit LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'last_xact_replay_lsn', label: gettext('Last Replay LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'last_xact_flush_lsn', label: gettext('Last Flush LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'last_xact_replay_timestamp', label: gettext('Replay Timestamp'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
    ];
  }
}
