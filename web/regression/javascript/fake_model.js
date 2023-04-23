/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export class FakeModel {
  constructor() {
    this.values = {};
  }

  set(key, value) {
    this.values[key] = value;
  }

  get(key) {
    return this.values[key];
  }

  unset(key) {
    delete this.values[key];
  }

  toJSON() {
    return Object.assign({}, this.values);
  }
}
