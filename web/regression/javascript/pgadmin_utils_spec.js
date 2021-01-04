/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getEpoch, getGCD, getMod, quote_ident, parseFuncParams,
  getRandomInt, sprintf, CSVToArray } from 'sources/utils';

describe('getEpoch', function () {
  it('should return non zero', function () {
    expect(getEpoch()).toBeGreaterThan(0);
  });

  it('should return epoch for a date passed', function () {
    let someDate = new Date('Feb 01 2019 10:20:30 GMT'),
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

describe('getRandomInt', function () {
  it('is between', function () {
    let id = getRandomInt(1, 9999999);
    expect(1 <= id && id <= 9999999).toBeTruthy();
  });
});

describe('sprintf', function () {
  it('single replace', function () {
    expect(
      sprintf('This is normal %s for testing.', 'replace')
    ).toBe(
      'This is normal replace for testing.'
    );
  });

  it('multi replace', function () {
    expect(
      sprintf('This is multi %s for %s testing.', 'positions', 'replace')
    ).toBe(
      'This is multi positions for replace testing.'
    );
  });

  it('text, numbers, empty replace', function () {
    expect(
      sprintf('This is a number - %s, text - %s, and not repalce - %s.', 4321, 'replace')
    ).toBe(
      'This is a number - 4321, text - replace, and not repalce - %s.'
    );
  });
});

describe('CSVToArray', function() {
  it('simple input single record', function() {
    expect(CSVToArray('a,b')).toEqual([['a', 'b']]);
  });

  it('simple input delimeter change', function() {
    expect(CSVToArray('"a";"b"', ';')).toEqual([['a', 'b']]);
  });

  it('simple input multi records', function() {
    expect(CSVToArray('"a","b"\n"c","d"')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('multiline input containing double quotes', function() {
    expect(CSVToArray('"hello ""a\nb""","c"')).toEqual([['hello "a\nb"','c']]);
  });

  it('multiline input containing single quotes', function() {
    expect(CSVToArray('\'hello \'\'a\nb\'\'\',\'c\'', ',', '\'')).toEqual([['hello \'a\nb\'','c']]);
  });
});
