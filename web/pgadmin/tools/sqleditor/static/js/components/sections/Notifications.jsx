/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import { commonTableStyles } from '../../../../../../static/js/Theme';
import { QUERY_TOOL_EVENTS } from '../QueryToolConstants';
import gettext from 'sources/gettext';
import _ from 'lodash';
import clsx from 'clsx';
import { QueryToolEventsContext } from '../QueryToolComponent';

export function Notifications() {
  const [notices, setNotices] = React.useState([]);
  const tableClasses = commonTableStyles();
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


  return <table className={clsx(tableClasses.table, tableClasses.borderBottom)}>
    <thead>
      <tr>
        <th>{gettext('Recorded time')}</th>
        <th>{gettext('Event')}</th>
        <th>{gettext('Process ID')}</th>
        <th>{gettext('Payload')}</th>
      </tr>
    </thead>
    <tbody>
      {notices.map((notice, i)=>{
        return <tr key={i}>
          <td data-label="recorded_time">{notice.recorded_time}</td>
          <td data-label="channel">{notice.channel}</td>
          <td data-label="pid">{notice.pid}</td>
          <td data-label="payload">{notice.payload}</td>
        </tr>;
      })}
    </tbody>
  </table>;
}
