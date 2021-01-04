/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import HistoryCollection from 'sources/sqleditor/history/history_collection';

describe('historyCollection', function () {
  let historyCollection, historyModel, onAddSpy, onResetSpy;
  beforeEach(() => {
    historyModel = [{some: 'thing', someOther: ['array element']}];
    historyCollection = new HistoryCollection(historyModel);
    onAddSpy = jasmine.createSpy('onAddHandler');
    onResetSpy = jasmine.createSpy('onResetHandler');

    historyCollection.onAdd(onAddSpy);
    historyCollection.onReset(onResetSpy);
  });

  describe('length', function () {
    it('returns 0 when underlying history model has no elements', function () {
      historyCollection = new HistoryCollection([]);

      expect(historyCollection.length()).toEqual(0);
    });

    it('returns the length of the underlying history model', function () {
      expect(historyCollection.length()).toEqual(1);
    });
  });

  describe('add', function () {
    let expectedHistory;
    let newEntry = {some: 'new thing', someOther: ['value1', 'value2']};
    beforeEach(() => {
      historyCollection.add(newEntry);

      expectedHistory = [
        {some: 'new thing', someOther: ['value1', 'value2']},
        {some: 'thing', someOther: ['array element']},
      ];
    });

    it('adds a passed entry', function () {
      expect(historyCollection.historyList).toEqual(expectedHistory);
    });

    it('calls the onChange function', function () {
      expect(onAddSpy).toHaveBeenCalledWith(newEntry);
    });
  });

  describe('reset', function () {
    beforeEach(() => {
      historyCollection.reset();
    });

    it('drops the history', function () {
      expect(historyCollection.historyList).toEqual([]);
      expect(historyCollection.length()).toEqual(0);
    });

    it('calls the onReset function', function () {
      expect(onResetSpy).toHaveBeenCalledWith([]);
    });
  });

  describe('when instantiated', function () {
    describe('from a history model', function () {
      it('has the historyModel', () => {
        let content = historyCollection.historyList;

        expect(content).toEqual(historyModel);
      });

    });
  });
});
