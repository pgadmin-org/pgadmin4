/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getEpoch, getGCD, getMod } from 'sources/utils';

describe('getEpoch', function () {
  it('should return non zero', function () {
    expect(getEpoch()).toBeGreaterThan(0);
  });

  it('should return epoch for a date passed', function () {
    let someDate = new Date('Feb 01 2019 10:20:30 GMT0000'),
      someDateEpoch = 1549016430;

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

describe('getMod', function () {
  it('complete divisible', function () {
    expect(getMod(5,5)).toEqual(0);
  });

  it('incomplete divisible less divisor', function () {
    expect(getMod(7,5)).toEqual(2);
  });

  it('incomplete divisible greater divisor', function () {
    expect(getMod(5,7)).toEqual(5);
  });

  it('negative number', function () {
    expect(getMod(-7,5)).toEqual(3);
  });
});
