/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

/////////
//
// A class to handle the ScheamState subscription for a control to avoid
// rendering multiple times.
//
class SubscriberManager {

  constructor(refreshKeyCallback) {
    this.mounted = true;
    this.callback = refreshKeyCallback;
    this.unsubscribers = new Set();
    this._id = Date.now();
  }

  add(schemaState, accessPath, kind, callback) {
    if (!schemaState) return;

    callback = callback || (() => this.signal());

    return this._add(schemaState.subscribe(accessPath, callback, kind));
  }

  _add(unsubscriber) {
    if (!unsubscriber) return;
    // Avoid reinsertion of same unsubscriber.
    if (this.unsubscribers.has(unsubscriber)) return;
    this.unsubscribers.add(unsubscriber);

    return () => this.remove(unsubscriber);
  }

  remove(unsubscriber) {
    if (!unsubscriber) return;
    if (!this.unsubscribers.has(unsubscriber)) return;
    this.unsubscribers.delete(unsubscriber);
    unsubscriber();
  }

  signal() {
    // Do nothing - if already work is in progress.
    if (!this.mounted) return;
    this.mounted = false;
    this.release();
    this.callback(Date.now());
  }

  release () {
    const unsubscribers = this.unsubscribers;
    this.unsubscribers = new Set();
    this.mounted = true;

    setTimeout(() => {
      Set.prototype.forEach.call(
        unsubscribers, (unsubscriber) => unsubscriber()
      );
    }, 0);
  }

  mount() {
    this.mounted = true;
  }
}

export function useSchemaStateSubscriber(refreshKeyCallback) {
  const subscriberManager = React.useRef(null);

  React.useEffect(() => {
    if (!subscriberManager.current) return;

    return () => {
      subscriberManager.current?.release();
    };     
  }, []);

  if (!subscriberManager.current)
    subscriberManager.current = new SubscriberManager(refreshKeyCallback);
  else
    subscriberManager.current.mount();

  return subscriberManager;
}
