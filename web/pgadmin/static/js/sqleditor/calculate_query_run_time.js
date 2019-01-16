/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import moment from 'moment';

export function calculateQueryRunTime(startTime, endTime) {
  let total_ms = moment(endTime).diff(startTime);
  let result = '';
  let secs, mins, hrs;

  /* Extract seconds from millisecs */
  secs = parseInt(total_ms/1000);
  total_ms = total_ms%1000;

  /* Extract mins from seconds */
  mins = parseInt(secs/60);
  secs = secs%60;

  /* Extract hrs from mins */
  hrs = parseInt(mins/60);
  mins = mins%60;

  result = (hrs>0 ? hrs + ' hr ': '')
          + (mins>0 ? mins + ' min ': '')
          + (hrs<=0 && secs>0 ? secs + ' secs ': '')
          + (hrs<=0 && mins<=0 ? total_ms + ' msec ':'');
  return result.trim();
}
