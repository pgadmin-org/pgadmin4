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

export default class ReplicationSlotsSchema extends BaseUISchema {
  constructor(initValues) {
    super({
      ...initValues,
    });
  }

  get baseFields() {
    return [
      {
        id: 'slot_name', label: gettext('Slot Name'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'slot_type', label: gettext('Slot Type'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'active', label: gettext('Active'), type: 'switch', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'active_pid', label: gettext('Active PID'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'restart_lsn', label: gettext('Restart LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'confirmed_flush_lsn', label: gettext('Confirmed Flush LSN'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
      {
        id: 'wal_status', label: gettext('WAL Status'), type: 'text', mode:['properties'], readonly: true,
        group: gettext('Details')
      },
    ];
  }
}
