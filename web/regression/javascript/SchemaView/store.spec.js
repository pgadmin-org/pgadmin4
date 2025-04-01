/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { isValueEqual } from '../../../pgadmin/static/js/SchemaView/common';
import {
  createStore
} from '../../../pgadmin/static/js/SchemaView/SchemaState/store';

const initData = {
  id: 1,
  field1: 'field1val',
  field2: 1,
  fieldcoll: [
    {field3: 1, field4: 'field4val1', field5: 'field5val1'},
    {field3: 2, field4: 'field4val2', field5: 'field5val2'},
  ],
  field3: 3,
  field4: 'field4val',
};

describe('store', ()=>{
  describe('', () => {

    it('getState', () => {
      const store = createStore(initData);
      const data = store.getState();
      expect(isValueEqual(data, initData)).toBe(true);
    });

    it('get', () => {
      const store = createStore(initData);

      const firstField3 = store.get(['fieldcoll', 0, 'field3']);
      expect(firstField3 == 1).toBe(true);

      const firstFieldCollRow = store.get(['fieldcoll', '0']);
      // Sending a copy of the data, and not itself.
      expect(isValueEqual(firstFieldCollRow, initData.fieldcoll[0])).toBe(true);
    });

    it('setState', () => {
      const store = createStore(initData);
      const newData = {a: 1};

      store.setState(newData);

      const newState = store.getState();
      expect(Object.is(newState, newData)).toBe(false);
      expect(isValueEqual(newState, newData)).toBe(true);
    });

    it ('set', () => {
      const store = createStore(initData);
      const newData = {a: 1};

      store.set(newData);

      let newState = store.getState();
      expect(Object.is(newState, newData)).toBe(false);
      expect(isValueEqual(newState, newData)).toBe(true);

      store.set((prevState) => ({...prevState, initData}));

      newState = store.getState();
      expect(Object.is(newState, initData)).toBe(false);
      expect(isValueEqual(newState, initData)).toBe(false);

      delete newState['a'];

      store.set(() => (newState));

      newState = store.getState();
      expect(isValueEqual(newState, initData)).toBe(false);
    });

    it ('subscribe', () => {
      const store = createStore(initData);
      const listener = jest.fn();

      const unsubscribe1 = store.subscribe(listener);
      store.set((prevState) => (prevState));

      expect(listener).not.toHaveBeenCalled();

      store.set((prevState) => {
        prevState.id = 2;
        return prevState;
      });

      expect(listener).toHaveBeenCalled();

      const listenForFirstField3 = jest.fn();
      const unsubscribe2 = store.subscribeForPath(
        ['fieldcoll', '0', 'field3'], listenForFirstField3
      );
      const listenForSecondField3 = jest.fn();
      const unsubscribe3 = store.subscribeForPath(
        ['fieldcoll', '1', 'field3'], listenForSecondField3
      );
      let changeTo = 10;

      store.set((prevState) => {
        prevState.fieldcoll[0].field3 = changeTo;
        return prevState;
      });

      expect(listenForFirstField3).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listenForSecondField3).not.toHaveBeenCalled();

      store.set((prevState) => {
        // There is no actual change from previous state.
        prevState.fieldcoll[0].field3 = 10;
        return prevState;
      });

      // Not expecting it be called.
      expect(listenForFirstField3).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listenForSecondField3).not.toHaveBeenCalled();

      unsubscribe1();

      store.set((prevState) => {
        prevState.fieldcoll[0].field3 = 50;
        return prevState;
      });

      // Don't expect this to be called again.
      expect(listener).toHaveBeenCalledTimes(2);
      // Expect this one to be called
      expect(listenForFirstField3).toHaveBeenCalledTimes(2);
      expect(listenForSecondField3).not.toHaveBeenCalled();

      unsubscribe2();

      store.set((prevState) => {
        prevState.fieldcoll[0].field3 = 100;
        return prevState;
      });

      // Don't expect any of them to be called.
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listenForFirstField3).toHaveBeenCalledTimes(2);
      expect(listenForSecondField3).not.toHaveBeenCalled();

      unsubscribe3();
    });

  });
});
