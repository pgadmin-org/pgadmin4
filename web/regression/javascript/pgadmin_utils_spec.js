/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getEpoch, getGCD, getMod, quote_ident, parseFuncParams } from 'sources/utils';

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

describe('quote_ident', function () {
  it('normal string', function () {
    expect(quote_ident('abcd')).toEqual('abcd');
  });

  it('contains certain characters string', function () {
    expect(quote_ident('Abcd')).toEqual('"Abcd"');
    expect(quote_ident('abc$d')).toEqual('"abc$d"');
    expect(quote_ident('ab cd')).toEqual('"ab cd"');
  });

  it('starts with number', function () {
    expect(quote_ident('1a')).toEqual('"1a"');
    expect(quote_ident('a1')).toEqual('a1');
  });
});

describe('parseFuncParams', function () {
  let funcLabel = '',
    expectedObj = {};

  it('function with params', function () {
    funcLabel = 'func1(a integer, b text)';
    expectedObj = {
      'func_name': 'func1',
      'param_string': 'a integer, b text',
      'params': [
        ['a', 'integer'],
        ['b', 'text'],
      ],
    };
    expect(parseFuncParams(funcLabel)).toEqual(expectedObj);
  });

  it('function without params', function () {
    funcLabel = 'func1()';
    expectedObj = {
      'func_name': 'func1',
      'param_string': '',
      'params': [],
    };
    expect(parseFuncParams(funcLabel)).toEqual(expectedObj);
  });

  it('function name special chars', function () {
    funcLabel = 'fun(c1(a integer, b text)';
    expectedObj = {
      'func_name': 'fun(c1',
      'param_string': 'a integer, b text',
      'params': [
        ['a', 'integer'],
        ['b', 'text'],
      ],
    };
    expect(parseFuncParams(funcLabel)).toEqual(expectedObj);
  });

  it('function params special chars', function () {
    funcLabel = 'func1("a(b" integer, "a b" text)';
    expectedObj = {
      'func_name': 'func1',
      'param_string': '"a(b" integer, "a b" text',
      'params': [
        ['"a(b"', 'integer'],
        ['"a b"', 'text'],
      ],
    };
    expect(parseFuncParams(funcLabel)).toEqual(expectedObj);
  });

  it('function params with modes', function () {
    funcLabel = 'func1(IN a integer, OUT b text)';
    expectedObj = {
      'func_name': 'func1',
      'param_string': 'IN a integer, OUT b text',
      'params': [
        ['a', 'integer'],
        ['b', 'text'],
      ],
    };
    expect(parseFuncParams(funcLabel)).toEqual(expectedObj);
  });
});
