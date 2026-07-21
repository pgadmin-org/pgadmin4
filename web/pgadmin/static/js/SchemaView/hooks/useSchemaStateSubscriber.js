/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

/////////
//
// A class to handle the ScheamState subscription for a control to avoid
// rendering multiple times.
//
export class SubscriberManager {

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
    // Re-entrancy / batching guard: if a signal already fired in this
    // tick, drop subsequent ones. The next render's mount() flips the
    // flag back on for the next batch.
    if (!this.mounted) return;
    this.mounted = false;
    // Note: we do NOT tear down existing subscriptions here. The
    // subscribing hooks (useFieldValue / useFieldOptions / useFieldError)
    // pin their useEffect deps and won't re-subscribe on the next render,
    // so the existing subscriptions must persist across signals. They are
    // released only on component unmount via release() below.
    this.callback(Date.now());
  }

  release() {
    // Called when the owning component unmounts. Tear down synchronously
    // — the component is going away, so there's nothing to defer for.
    const unsubscribers = this.unsubscribers;
    this.unsubscribers = new Set();
    this.mounted = false;
    unsubscribers.forEach((unsubscriber) => unsubscriber());
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
