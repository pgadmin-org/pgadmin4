/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import QueryHistory from '../../../pgadmin/static/jsx/history/query_history';
import QueryHistoryEntry from '../../../pgadmin/static/jsx/history/query_history_entry';
import HistoryCollection from '../../../pgadmin/static/js/history/history_collection';
import jasmineEnzyme from 'jasmine-enzyme';

import {mount, shallow} from 'enzyme';

describe('QueryHistory', () => {
  let historyWrapper;
  beforeEach(() => {
    jasmineEnzyme();
    const historyCollection = new HistoryCollection([]);
    historyWrapper = shallow(<QueryHistory historyCollection={historyCollection}/>);
  });

  describe('on construction', () => {
    it('has no entries', (done) => {
      let foundChildren = historyWrapper.find(QueryHistoryEntry);
      expect(foundChildren.length).toBe(0);
      done();
    });
  });

  describe('when it has history', () => {
    describe('when two SQL queries were executed', () => {
      let foundChildren;

      beforeEach(() => {
        const historyObjects = [
          {
            query: 'second sql statement',
            start_time: new Date(2016, 11, 11, 1, 33, 5, 99),
            status: false,
            row_affected: 1,
            total_time: '234 msec',
            message: 'some other message',
          },
          {
            query: 'first sql statement',
            start_time: new Date(2017, 5, 3, 14, 3, 15, 150),
            status: true,
            row_affected: 2,
            total_time: '14 msec',
            message: 'a very important message',
          },
        ];
        const historyCollection = new HistoryCollection(historyObjects);

        historyWrapper = mount(<QueryHistory historyCollection={historyCollection}/>);

        foundChildren = historyWrapper.find(QueryHistoryEntry);
      });

      it('has two query history entries', () => {
        expect(foundChildren.length).toBe(2);
      });

      it('displays the SQL of the queries in order', () => {
        expect(foundChildren.at(0).text()).toContain('first sql statement');
        expect(foundChildren.at(1).text()).toContain('second sql statement');
      });

      it('displays the formatted timestamp of the queries in chronological order by most recent first', () => {
        expect(foundChildren.at(0).text()).toContain('Jun 3 2017 – 14:03:15');
        expect(foundChildren.at(1).text()).toContain('Dec 11 2016 – 01:33:05');
      });

      it('displays the number of rows affected', () => {
        expect(foundChildren.at(1).text()).toContain('1 rows affected');
        expect(foundChildren.at(0).text()).toContain('2 rows affected');
      });

      it('displays the total time', () => {
        expect(foundChildren.at(0).text()).toContain('total time: 14 msec');
        expect(foundChildren.at(1).text()).toContain('total time: 234 msec');
      });

      it('displays the truncated message', () => {
        expect(foundChildren.at(0).text()).toContain('a very important message');
        expect(foundChildren.at(1).text()).toContain('some other message');
      });

      describe('when there are one failing and one successful query each', () => {
        it('adds a white background color for the successful query', () => {
          expect(foundChildren.at(0).find('div').first()).toHaveStyle('backgroundColor', '#FFF');
        });
        it('adds a red background color for the failed query', () => {
          expect(foundChildren.at(1).find('div').first()).toHaveStyle('backgroundColor', '#F7D0D5');
        });
      });
    });
  });
});