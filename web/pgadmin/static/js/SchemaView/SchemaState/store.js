import _ from 'lodash';

import { isValueEqual } from '../common';
import { flatPathGenerator } from './common';


export const createStore = (initialState) => {
  let state = initialState;

  const listeners = new Set();
  const gen = flatPathGenerator('/');
  const pathListeners = new Set();

  // Exposed functions
  // Don't attempt to manipulate the state directly.
  const getState = () => state;
  const setState = (nextState) => {
    const prevState = state;
    state = _.clone(nextState);

    if (isValueEqual(state, prevState)) return;

    listeners.forEach((listener) => {
      listener();
    });

    const changeMemo = new Map();

    pathListeners.forEach((pathListener) => {
      const [ path, listener ] = pathListener;
      const flatPath = gen.flatPath(path);

      if (!changeMemo.has(flatPath)) {
        const pathNextValue =
          flatPath == '' ? nextState : _.get(nextState, path, undefined);
        const pathPrevValue =
          flatPath == '' ? prevState : _.get(prevState, path, undefined);

        changeMemo.set(flatPath, [
          isValueEqual(pathNextValue, pathPrevValue),
          pathNextValue,
          pathPrevValue,
        ]);
      }

      const [isSame, pathNextValue, pathPrevValue] = changeMemo.get(flatPath);

      if (!isSame) {
        listener(pathNextValue, pathPrevValue);
      }
    });
  };
  const get = (path = []) => (_.get(state, path));
  const set = (arg) =>  {
    let nextState = _.isFunction(arg) ? arg(_.cloneDeep(state)) : arg;
    setState(nextState);
  };
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const subscribeForPath = (path, listner) => {
    const data = [path, listner];

    pathListeners.add(data);

    return () => {
      return pathListeners.delete(data);
    };
  };

  return {
    getState,
    setState,
    get,
    set,
    subscribe,
    subscribeForPath,
  };
};
