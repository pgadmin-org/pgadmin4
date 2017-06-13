/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import QueryHistoryEntry from '../../../pgadmin/static/jsx/history/query_history_entry';

import {mount} from 'enzyme';
import jasmineEnzyme from 'jasmine-enzyme';

describe('QueryHistoryEntry', () => {
  let historyWrapper;
  beforeEach(() => {
    jasmineEnzyme();
  });

  describe('for a failed query', () => {
    beforeEach(() => {
      const historyEntry = {
        query: 'second sql statement',
        start_time: new Date(2016, 11, 11, 1, 33, 5, 99),
        status: false,
      };
      historyWrapper = mount(<QueryHistoryEntry historyEntry={historyEntry}/>);
    });
    it('displays a pink background color', () => {
      expect(historyWrapper.find('div').first()).toHaveStyle('backgroundColor', '#F7D0D5');
    });
  });

  describe('for a successful query', () => {
    beforeEach(() => {
      const historyEntry = {
        query: 'second sql statement',
        start_time: new Date(2016, 11, 11, 1, 33, 5, 99),
        status: true,
      };
      historyWrapper = mount(<QueryHistoryEntry historyEntry={historyEntry}/>);
    });
    it('does not display a pink background color', () => {
      expect(historyWrapper.find('div').first()).toHaveStyle('backgroundColor', '#FFF');
    });
  });
});
