/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import moment from 'moment';

export function calculateQueryRunTime(startTime, endTime) {
  const tempEndDate = moment(endTime);
  let miliseconds = tempEndDate.diff(startTime);
  let seconds = tempEndDate.diff(startTime, 'seconds');
  const minutes = tempEndDate.diff(startTime, 'minutes');

  let result = '';
  if (minutes > 0) {
    result += minutes + ' min ';
    seconds -= minutes * 60;
  }

  if (seconds > 0) {
    result += seconds + ' secs ';
    miliseconds -= seconds * 1000;
  }

  if(minutes <= 0) {
    result += miliseconds + ' msec';
  }
  return result.trim();
}
