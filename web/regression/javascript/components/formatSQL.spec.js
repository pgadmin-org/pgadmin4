/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import formatSQL, { applyCaseOnly, getFormatOptions } from 'sources/components/ReactCodeMirror/formatSQL';

const basePrefs = {
  keyword_case: 'upper',
  identifier_case: 'preserve',
  function_case: 'lower',
  data_type_case: 'upper',
  logical_operator_new_line: 'before',
  expression_width: 50,
  lines_between_queries: 1,
  tab_size: 4,
  use_spaces: true,
  spaces_around_operators: true,
  new_line_before_semicolon: false,
  preserve_layout: false,
};

const layoutSql = `select id, Col1, count(*)
from   tbl
where  a::text = 'select from'   and b is null
group  by id;`;

describe('formatSQL', ()=>{
  it('maps legacy capitalize casing to preserve', ()=>{
    const opts = getFormatOptions({...basePrefs, keyword_case: 'capitalize', identifier_case: 'capitalize'});
    expect(opts.keywordCase).toBe('preserve');
    expect(opts.identifierCase).toBe('preserve');
    expect(opts.useTabs).toBe(false);
    expect(opts.denseOperators).toBe(false);
  });

  it('reflows the layout by default', ()=>{
    expect(formatSQL(layoutSql, basePrefs)).toBe(
      'SELECT\n    id,\n    Col1,\n    count(*)\nFROM\n    tbl\nWHERE\n' +
      '    a::TEXT = \'select from\'\n    AND b IS NULL\nGROUP BY\n    id;'
    );
  });

  it('changes only case when preserving the layout', ()=>{
    expect(formatSQL(layoutSql, {...basePrefs, preserve_layout: true})).toBe(
      `SELECT id, Col1, count(*)
FROM   tbl
WHERE  a::TEXT = 'select from'   AND b IS NULL
GROUP  BY id;`
    );
  });

  it('leaves the original alone if anything but case or whitespace differs', ()=>{
    expect(applyCaseOnly('select 1', 'SELECT 2')).toBe('select 1');
    expect(applyCaseOnly('select 1', 'SELECT 1;')).toBe('select 1');
    expect(applyCaseOnly('select 1;', 'SELECT 1')).toBe('select 1;');
  });

  it('keeps characters outside the BMP aligned', ()=>{
    expect(applyCaseOnly('select \'\u{1F418}\' x', 'SELECT\n  \'\u{1F418}\' X'))
      .toBe('SELECT \'\u{1F418}\' X');
  });
});
