//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

/* eslint-disable no-console */

beforeAll(function () {
  spyOn(console, 'warn').and.callThrough();
  spyOn(console, 'error').and.callThrough();
});

afterEach(function (done) {
  setTimeout(function () {
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    done();
  }, 0);
});
