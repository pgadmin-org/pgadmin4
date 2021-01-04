/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import moment from 'moment';
import {calculateQueryRunTime} from '../../../pgadmin/static/js/sqleditor/calculate_query_run_time';

describe('#calculateQueryRunTime', () => {
  describe('time difference is smaller then 1 second', () => {
    it('displays milliseconds', () => {
      let startDate = moment({
        years:2018,
        months:4,
        date:2,
        hours:10,
        minutes:30,
        seconds:20,
        milliseconds:123}).toDate();
      let endDate = moment({
        years:2018,
        months:4,
        date:2,
        hours:10,
        minutes:30,
        seconds:21,
        milliseconds:70}).toDate();
      expect(calculateQueryRunTime(startDate, endDate))
        .toEqual('947 msec');
    });
  });

  describe('time difference is smaller then 1 minute', () => {
    it('displays milliseconds', () => {
      let startDate = moment({
        years:2018,
        months:4,
        date:2,
        hours:10,
        minutes:30,
        seconds:20,
        milliseconds:123}).toDate();
      let endDate = moment({
        years:2018,
        months:4,
        date:2,
        hours:10,
        minutes:31,
        seconds:15,
        milliseconds:70}).toDate();
      expect(calculateQueryRunTime(startDate, endDate))
        .toEqual('54 secs 947 msec');
    });
  });

  describe('time difference is bigger then 1 minute', () => {
    it('displays milliseconds', () => {
      let startDate = moment({
        years:2018,
        months:4,
        date:2,
        hours:10,
        minutes:30,
        seconds:20,
        milliseconds:123}).toDate();
      let endDate = moment({
        years:2018,
        months:4,
        date:2,
        hours:10,
        minutes:40,
        seconds:15,
        milliseconds:70}).toDate();
      expect(calculateQueryRunTime(startDate, endDate))
        .toEqual('9 min 54 secs');
    });
  });

  describe('time difference is bigger then 1 hour', () => {
    it('displays seconds, milliseconds', () => {
      let startDate = moment({
        years:2018,
        months:4,
        date:2,
        hours:10,
        minutes:30,
        seconds:20,
        milliseconds:123}).toDate();
      let endDate = moment({
        years:2018,
        months:4,
        date:2,
        hours:11,
        minutes:40,
        seconds:15,
        milliseconds:70}).toDate();
      expect(calculateQueryRunTime(startDate, endDate))
        .toEqual('1 hr 9 min');
    });
  });
});
