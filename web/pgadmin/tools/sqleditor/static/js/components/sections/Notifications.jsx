/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import { QUERY_TOOL_EVENTS } from '../QueryToolConstants';
import gettext from 'sources/gettext';
import _ from 'lodash';
import { QueryToolEventsContext } from '../QueryToolComponent';
import Table from '../../../../../../static/js/components/Table';

export function Notifications() {
  const [notices, setNotices] = React.useState([]);

  const eventBus = React.useContext(QueryToolEventsContext);
  React.useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.PUSH_NOTICE, (notice)=>{
      if(_.isArray(notice)) {
        setNotices((prev)=>[
          ...prev,
          ...notice,
        ]);
      } else {
        setNotices((prev)=>[
          ...prev,
          notice,
        ]);
      }
    });
  }, []);


  return <Table>
    <thead>
      <tr>
        <th>{gettext('Recorded time')}</th>
        <th>{gettext('Event')}</th>
        <th>{gettext('Process ID')}</th>
        <th>{gettext('Payload')}</th>
      </tr>
    </thead>
    <tbody>
      {notices.map((notice)=>{
        return <tr key={notice.pid}>
          <td data-label="recorded_time">{notice.recorded_time}</td>
          <td data-label="channel">{notice.channel}</td>
          <td data-label="pid">{notice.pid}</td>
          <td data-label="payload">{notice.payload}</td>
        </tr>;
      })}
    </tbody>
  </Table>;
}
