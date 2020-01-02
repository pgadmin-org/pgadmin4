/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export default class HistoryCollection {

  constructor(history_model) {
    this.historyList = _.sortBy(history_model, o=>o.start_time);
    this.onAdd(() => {});
  }

  length() {
    return this.historyList.length;
  }

  add(object) {
    /* add object in sorted order */
    let pushAt = _.sortedIndex(this.historyList, object, o=>o.start_time);
    this.historyList.splice(pushAt, 0, object);
    this.onAddHandler(object);
  }

  reset() {
    this.historyList = [];
    this.onResetHandler(this.historyList);
  }

  onAdd(onAddHandler) {
    this.onAddHandler = onAddHandler;
  }

  onReset(onResetHandler) {
    this.onResetHandler = onResetHandler;
  }
}
