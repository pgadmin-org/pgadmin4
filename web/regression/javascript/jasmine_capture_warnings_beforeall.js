//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

/* eslint-disable no-console */

beforeAll(function () {
  spyOn(console, 'warn').and.callThrough();
  spyOn(console, 'error').and.callThrough();
  jasmine.getEnv().allowRespy(true);

  window.addEventListener('error', e => {
    console.log(e.message);
    if(e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
        e.message === 'ResizeObserver loop limit exceeded') {
      e.stopPropagation();
    }
  });
});

afterEach(function (done) {
  setTimeout(function () {
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    done();
  }, 0);
});
