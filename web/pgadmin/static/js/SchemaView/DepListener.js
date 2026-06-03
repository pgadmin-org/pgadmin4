/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';

// Join a path array the same way the filter predicates need to compare:
// segments separated by '|', terminated with an extra '|' so a listener
// registered on ['shared'] doesn't false-match a currPath of
// ['shared_username']. Equivalent to `_.join(arr.concat(['']), '|')` but
// avoids the array allocation that was visible in the hot path.
const _joinPath = (arr) => arr.join('|') + '|';

export class DepListener {
  constructor() {
    this._depListeners = [];
    // True iff at least one registered listener has a defCallback. Lets
    // getDeferredDepChange short-circuit when there's no deferred work
    // possible — common in synthetic schemas and the dominant case in
    // typical dialogs.
    this._hasDefCallback = false;
  }

  /* Will keep track of the dependent fields and there callbacks */
  addDepListener(source, dest, callback, defCallback) {
    this._depListeners = this._depListeners || [];
    // Defensive shallow copy of the source path. The cached _sourceKey
    // is already a string snapshot and isn't affected by post-
    // registration mutation, but `source` itself is passed to the
    // callback at dispatch time — a caller that re-uses and mutates
    // the array would silently corrupt later callback invocations.
    const sourceCopy = Array.from(source);
    this._depListeners.push({
      source: sourceCopy,
      dest: dest,
      callback: callback,
      defCallback: defCallback,
      // Pre-compute the source's joined form so the per-dispatch filters
      // in getDepChange / getDeferredDepChange don't re-join + re-allocate
      // for every listener on every keystroke.
      _sourceKey: _joinPath(sourceCopy),
    });
    if (defCallback) this._hasDefCallback = true;
  }


  removeDepListener(dest) {
    this._depListeners = _.filter(this._depListeners, (l)=>!_.join(l.dest, '|').startsWith(_.join(dest, '|')));
    this._hasDefCallback = this._depListeners.some((l) => l.defCallback);
  }

  _getListenerData(state, listener, actionObj) {
    /* Get data at same level */
    let data = state;
    let dataPath = _.slice(listener.dest, 0, -1);
    if(dataPath.length > 0) {
      data = _.get(state, dataPath);
    }
    _.assign(
      data,
      listener.callback?.(data, listener.source, state, actionObj) || {}
    );
    return state;
  }

  _getDefListenerPromise(state, listener, actionObj) {
    /* Get data at same level */
    let data = state;
    let dataPath = _.slice(listener.dest, 0, -1);
    if(dataPath.length > 0) {
      data = _.get(state, dataPath);
    }
    return (listener.defCallback?.(data, listener.source, state, actionObj));
  }

  /* Called when any field changed and trigger callbacks */
  getDepChange(currPath, state, actionObj) {
    /* If this comes from deferred change */
    if(actionObj.listener?.callback) {
      state = this._getListenerData(state, actionObj.listener, actionObj);
      return state;
    }
    // Compare against each listener using the pre-computed _sourceKey,
    // which already encodes the trailing-'|' prefix-match protection.
    const currKey = _joinPath(currPath);
    for(const listener of this._depListeners) {
      if(listener.callback && currKey.startsWith(listener._sourceKey)) {
        state = this._getListenerData(state, listener, actionObj);
      }
    }
    return state;
  }

  getDeferredDepChange(currPath, state, actionObj) {
    // Common case: nothing in the registry has a defCallback. Bail
    // before touching any listener entries.
    if(!this._hasDefCallback) return [];

    const deferredList = [];
    const currKey = _joinPath(currPath);
    for(const listener of this._depListeners) {
      if(!listener.defCallback) continue;
      if(!currKey.startsWith(listener._sourceKey)) continue;
      const thePromise = this._getDefListenerPromise(state, listener, actionObj);
      if(thePromise) {
        deferredList.push({
          action: actionObj,
          promise: thePromise,
          listener: listener,
        });
      }
    }
    return deferredList;
  }
}
