////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

/* eslint-disable no-console */

beforeAll(function () {
  // Warnings can be ignored
  // spyOn(console, 'warn').and.callThrough();
  spyOn(console, 'error').and.callThrough();
  jasmine.getEnv().allowRespy(true);
});

afterEach(function (done) {
  setTimeout(function () {
    // Warnings can be ignored
    // expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    done();
  }, 0);
});
