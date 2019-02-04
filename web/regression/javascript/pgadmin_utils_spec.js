/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getEpoch, getGCD } from 'sources/utils';

describe('getEpoch', function () {
  it('should return non zero', function () {
    expect(getEpoch()).toBeGreaterThan(0);
  });

  it('should return epoch for a date passed', function () {
    let someDate = new Date(2019,1,1,10,20,30,40),
      someDateEpoch = 1548996630;

    expect(getEpoch(new Date(someDate))).toEqual(someDateEpoch);
  });
});

describe('getGCD', function () {
  it('for two numbers', function () {
    let nos = [5, 10];
    expect(getGCD(nos)).toEqual(5);
  });

  it('for more than two numbers', function () {
    let nos = [9, 24, 33];
    expect(getGCD(nos)).toEqual(3);
  });
});
