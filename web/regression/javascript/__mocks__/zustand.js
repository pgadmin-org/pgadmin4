import { act } from '@testing-library/react';

const { create: actualCreate, createStore: actualCreateStore } =
  jest.requireActual('zustand');

// a variable to hold reset functions for all stores declared in the app
export const storeResetFns = new Set();

// when creating a store, we get its initial state, create a reset function and add it in the set
export const create = ((createState) => {
  return typeof createState === 'function'
    ? createInternalFn(createState)
    : createInternalFn;
});

const createInternalFn = (createState) => {
  const store = actualCreate(createState);
  const initialState = store.getState();
  storeResetFns.add(() => store.setState(initialState, true));
  return store;
};

// when creating a store, we get its initial state, create a reset function and add it in the set
export const createStore = ((stateCreator) => {
  const store = actualCreateStore(stateCreator);
  const initialState = store.getState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
});

// reset all stores after each test run
// eslint-disable-next-line no-undef
afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => {
      resetFn();
    });
  });
});
