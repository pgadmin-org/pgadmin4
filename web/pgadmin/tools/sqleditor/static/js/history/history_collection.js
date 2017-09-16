/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export default class HistoryCollection {

  constructor(history_model) {
    this.historyList = history_model;
    this.onChange(() => {});
  }

  length() {
    return this.historyList.length;
  }

  add(object) {
    this.historyList.push(object);
    this.onChangeHandler(this.historyList);
  }

  reset() {
    this.historyList = [];
    this.onResetHandler(this.historyList);
  }

  onChange(onChangeHandler) {
    this.onChangeHandler = onChangeHandler;
  }

  onReset(onResetHandler) {
    this.onResetHandler = onResetHandler;
  }
}