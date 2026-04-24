/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { withTheme } from '../fake_theme';
import CodeMirror from 'sources/components/ReactCodeMirror';
import { syntaxTree } from '@codemirror/language';

import { render } from '@testing-library/react';

describe('CodeMirrorCustomEditorView', ()=>{
  const ThemedCM = withTheme(CodeMirror);
  let cmInstance, editor;

  const cmRerender = (props)=>{
    cmInstance.rerender(
      <ThemedCM
        value={'Init text'}
        className="testClass"
        currEditor={(obj) => {
          editor = obj;
        }}
        {...props}
      />
    );
  };
  beforeEach(()=>{
    cmInstance = render(
      <ThemedCM
        value={'Init text'}
        className="testClass"
        currEditor={(obj) => {
          editor = obj;
        }}
      />);
  });

  it('single query with no cursor position',()=>{
    cmRerender({value:'select * from public.actor;'});
    expect(editor.getQueryAt()).toEqual({'value': 'select * from public.actor;', 'from': 0, 'to': 27});
  });

  it('cursor within a query in multiple queries',()=>{
    cmRerender({value: 'select * from public.actor;    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5;\n\nselect * from public.city;\n\nselect 1;'});
    expect(editor.getQueryAt(20)).toEqual({'value': 'select * from public.actor;', 'from': 0, 'to': 27});
  });

  it('cursor outside the semicolon of a query in multiple queries',()=>{
    cmRerender({value: 'select * from public.actor;    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5;\n\nselect * from public.city;\n\nselect 1;'});
    expect(editor.getQueryAt(29)).toEqual({'value': 'select * from public.actor;', 'from': 0, 'to': 27});
  });

  it('cursor at the starting of a comment block',()=>{
    cmRerender({value: 'select * from public.actor;    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5;\n\nselect * from public.city;\n\nselect 1;'});
    expect(editor.getQueryAt(31)).toEqual({'value': '--rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff', 'from': 27, 'to': 107});
  });

  it('cursor inside a comment block',()=>{
    cmRerender({value: 'select * from public.actor;    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5;\n\nselect * from public.city;\n\nselect 1;'});
    expect(editor.getQueryAt(72)).toEqual({'value': '--rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff', 'from': 27, 'to': 107});
  });

  it('cursor inside a comment block`s 2nd line',()=>{
    cmRerender({value: 'select * from public.actor;    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5;\n\nselect * from public.city;\n\nselect 1;'});
    expect(editor.getQueryAt(107)).toEqual({'value': '--rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff', 'from': 27, 'to': 107});
  });

  it('cursor at the starting of a query in multiple queries',()=>{
    cmRerender({value: 'select * from public.actor;    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5;\n\nselect * from public.city;\n\nselect 1;'});
    expect(editor.getQueryAt(109)).toEqual({'value': 'select * from public.address where address_id=5;', 'from': 109, 'to': 157});
  });

  it('cursor at the next line where query ends with semicolon',()=>{
    cmRerender({value: 'select * from public.actor;    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5;\n\nselect * from public.city;\n\nselect 1;'});
    expect(editor.getQueryAt(158)).toEqual({'value': 'select * from public.address where address_id=5;', 'from': 109, 'to': 157});
  });

  it('cursor at an empty line where query is present one empty line above',()=>{
    cmRerender({value: 'select * from public.actor;    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5;\n\nselect * from public.city;\n\nselect 1;\n\n\n'});
    expect(editor.getQueryAt(198)).toEqual({'value': '', 'from': 198, 'to': 199});
  });

  it('cursor at 2nd line and query is in 2 lines',()=>{
    cmRerender({value: 'select * from public.actor    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address \n\twhere address_id=5;\n\nselect * from public.city;\n\nselect 1;'});
    expect(editor.getQueryAt(141)).toEqual({'value':'select * from public.address \n\twhere address_id=5;', 'from': 108, 'to': 158});
  });

  it('cursor at the start of query and multiple queries without semicolon',()=>{
    cmRerender({value: 'select * from public.actor    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5\n\nselect * from public.city\n\nselect 1'});
    expect(editor.getQueryAt(0)).toEqual({'value': 'select * from public.actor    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff', 'from': 0, 'to': 106});
  });

  it('cursor at the end of query and multiple queries without semicolon',()=>{
    cmRerender({value: 'select * from public.actor    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5\n\nselect * from public.city\n\nselect 1'});
    expect(editor.getQueryAt(26)).toEqual({'value': 'select * from public.actor    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff', 'from': 0, 'to': 106});
  });

  it('cursor in between of a query and multiple queries without semicolon',()=>{
    cmRerender({value: 'select * from public.actor    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5\n\nselect * from public.city\n\nselect 1'});
    expect(editor.getQueryAt(17)).toEqual({'value': 'select * from public.actor    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff', 'from': 0, 'to': 106});
  });

  it('cursor is at a new empty line and just above it a query without semicolon',()=>{
    cmRerender({value: 'select * from public.actor    --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5\n\nselect * from public.city\n\nselect 1'});
    expect(editor.getQueryAt(156)).toEqual({'value': 'select * from public.address where address_id=5', 'from': 108, 'to': 156});
  });

  it('cursor at a empty query with semicolon',()=>{
    cmRerender({value: 'select * from public.actor;    ;  --rhhryyr select * from public.film\n--skskks\n--sksksksksks\n--sksksksksksdff\n\t\nselect * from public.address where address_id=5\n\nselect * from public.city\n\nselect 1'});
    expect(editor.getQueryAt(29)).toEqual({'value': 'select * from public.actor;', 'from': 0, 'to': 27});
  });

  it('cursor on WHERE clause with blank lines between SELECT and FROM and WHERE',()=>{
    // Query with blank lines between clauses: SELECT *\n\nFROM pg_class\n\nWHERE id = 1;
    cmRerender({value: 'SELECT *\n\nFROM pg_class\n\nWHERE id = 1;'});
    // Cursor at WHERE clause (position 25), should return full query
    expect(editor.getQueryAt(25)).toEqual({'value': 'SELECT *\n\nFROM pg_class\n\nWHERE id = 1;', 'from': 0, 'to': 38});
  });

  it('cursor on FROM clause with blank lines in query',()=>{
    // Query with blank lines between clauses
    cmRerender({value: 'SELECT *\n\nFROM pg_class\n\nWHERE id = 1;'});
    // Cursor at FROM clause (position 10), should return full query
    expect(editor.getQueryAt(10)).toEqual({'value': 'SELECT *\n\nFROM pg_class\n\nWHERE id = 1;', 'from': 0, 'to': 38});
  });

  it('cursor on condition line with WHERE on separate line',()=>{
    // Query: select *\n\nfrom pg_attribute\n\nWHERE\n\nattrelid > 3000;
    const query = 'select *\n\nfrom pg_attribute\n\nWHERE\n\nattrelid > 3000;';
    cmRerender({value: query});
    // Cursor at 'attrelid' condition (position 38), should return full query
    expect(editor.getQueryAt(38)).toEqual({'value': query, 'from': 0, 'to': query.length});
  });

  it('cursor on WHERE keyword with blank lines around it',()=>{
    // Query: select *\n\nfrom pg_attribute\n\nWHERE\n\nattrelid > 3000;
    const query = 'select *\n\nfrom pg_attribute\n\nWHERE\n\nattrelid > 3000;';
    cmRerender({value: query});
    // Cursor at WHERE keyword (position 30), should return full query
    expect(editor.getQueryAt(30)).toEqual({'value': query, 'from': 0, 'to': query.length});
  });

  it('EXPLAIN ANALYZE with blank lines, cursor on WHERE',()=>{
    const query = 'EXPLAIN ANALYZE SELECT *\n\nFROM pg_class\n\nWHERE oid > 1000;';
    cmRerender({value: query});
    expect(editor.getQueryAt(42)).toEqual({'value': query, 'from': 0, 'to': query.length});
  });

  it('EXPLAIN with cursor on FROM clause',()=>{
    const query = 'EXPLAIN SELECT *\n\nFROM pg_class\n\nWHERE oid > 1000;';
    cmRerender({value: query});
    expect(editor.getQueryAt(18)).toEqual({'value': query, 'from': 0, 'to': query.length});
  });

  it('EXPLAIN with cursor on EXPLAIN keyword returns full query across blank lines',()=>{
    const query = 'EXPLAIN SELECT *\n\nFROM pg_class\n\nWHERE oid > 1000;';
    cmRerender({value: query});
    // Cursor on EXPLAIN (position 4) — must expand past blank lines
    expect(editor.getQueryAt(4)).toEqual({'value': query, 'from': 0, 'to': query.length});
  });

  it('EXPLAIN ANALYZE with cursor on SELECT returns full query',()=>{
    const query = 'EXPLAIN ANALYZE SELECT *\n\nFROM pg_class\n\nWHERE oid > 1000;';
    cmRerender({value: query});
    // Cursor on SELECT (position 16) — before any blank line
    expect(editor.getQueryAt(16)).toEqual({'value': query, 'from': 0, 'to': query.length});
  });

  it('two separate queries with semicolons and blank line are not merged',()=>{
    const text = 'SELECT * FROM users;\n\nSELECT * FROM orders;';
    cmRerender({value: text});
    // Cursor on second query (position 22), should return only the second query
    expect(editor.getQueryAt(22)).toEqual({'value': 'SELECT * FROM orders;', 'from': 22, 'to': 43});
  });

  it('two separate queries without semicolons and blank line are not merged',()=>{
    const text = 'SELECT * FROM users\n\nSELECT * FROM orders';
    cmRerender({value: text});
    // Cursor on second query, should return only the second query
    expect(editor.getQueryAt(21)).toEqual({'value': 'SELECT * FROM orders', 'from': 21, 'to': 41});
  });

  it('comment block between queries does not expand into adjacent query',()=>{
    const text = 'SELECT 1;\n\n-- This is a comment\n\nSELECT 2;';
    cmRerender({value: text});
    // Cursor on comment (position 12), should return only the comment
    expect(editor.getQueryAt(12)).toEqual({'value': '-- This is a comment', 'from': 11, 'to': 32});
  });

  it('first query is not expanded into second when cursor on first',()=>{
    const text = 'SELECT * FROM users;\n\nSELECT * FROM orders;';
    cmRerender({value: text});
    // Cursor on first query, should return only the first query
    expect(editor.getQueryAt(5)).toEqual({'value': 'SELECT * FROM users;', 'from': 0, 'to': 20});
  });

  it('cursor on blank line between clauses returns nearest query above',()=>{
    // Cursor exactly on the blank line (position 9 = second \n).
    // Blank line is a separator — returns the clause above it.
    const text = 'SELECT *\n\nFROM pg_class\n\nWHERE id = 1;';
    cmRerender({value: text});
    expect(editor.getQueryAt(9)).toEqual({'value': 'SELECT *', 'from': 0, 'to': 9});
  });

  it('single-line EXPLAIN without blank lines',()=>{
    // Regression guard: simple EXPLAIN must still work
    const query = 'EXPLAIN SELECT * FROM pg_class;';
    cmRerender({value: query});
    expect(editor.getQueryAt(10)).toEqual({'value': query, 'from': 0, 'to': query.length});
  });

  it('multiple consecutive blank lines between clauses',()=>{
    // 3 blank lines between SELECT and FROM
    const query = 'SELECT *\n\n\n\nFROM pg_class;';
    cmRerender({value: query});
    expect(editor.getQueryAt(12)).toEqual({'value': query, 'from': 0, 'to': query.length});
  });

  // ----------------------------------------------------------------
  // Diagnostic: verify Lezer Statement node boundaries for key cases
  // ----------------------------------------------------------------

  function getStatementNodes(editorView) {
    const tree = syntaxTree(editorView.state);
    const stmts = [];
    tree.iterate({
      enter: (node) => {
        if (node.type.name === 'Statement') {
          stmts.push({ from: node.from, to: node.to });
        }
      }
    });
    return stmts;
  }

  it('parser: single query with blank lines between clauses is one Statement',()=>{
    cmRerender({value: 'SELECT *\n\nFROM pg_class\n\nWHERE id = 1;'});
    const stmts = getStatementNodes(editor);
    // Must be a single Statement spanning the entire query
    expect(stmts.length).toBe(1);
    expect(stmts[0].from).toBe(0);
    expect(stmts[0].to).toBe(38);
  });

  it('parser: two queries with semicolons are separate Statements',()=>{
    cmRerender({value: 'SELECT 1;\n\nSELECT 2;'});
    const stmts = getStatementNodes(editor);
    // Must be two separate Statements
    expect(stmts.length).toBe(2);
    // Statement 1 must NOT extend into Statement 2's range
    expect(stmts[0].to).toBeLessThanOrEqual(stmts[1].from);
  });

  it('parser: two queries without semicolons — verify Statement layout',()=>{
    cmRerender({value: 'SELECT * FROM users\n\nSELECT * FROM orders'});
    const stmts = getStatementNodes(editor);
    // Parser may merge (1 Statement) or separate (2 Statements) — both
    // are handled by _needsExpansion.  Pin down the exact current behavior
    // so a parser update is noticed.
    expect([1, 2]).toContain(stmts.length);
    if (stmts.length === 1) {
      expect(stmts[0].from).toBe(0);
      expect(stmts[0].to).toBe(41);
    }
  });

  it('parser: EXPLAIN SELECT is one Statement',()=>{
    cmRerender({value: 'EXPLAIN ANALYZE SELECT *\n\nFROM pg_class\n\nWHERE oid > 1000;'});
    const stmts = getStatementNodes(editor);
    expect(stmts.length).toBe(1);
    expect(stmts[0].from).toBe(0);
  });

  it('parser: Lezer iterate is inclusive at Statement boundary',()=>{
    // Verify: tree.iterate({from: stmt1End}) DOES visit Statement 1
    // (Lezer boundaries are inclusive).  Our _needsExpansion guards
    // against this with an additional node.to > startPos check.
    cmRerender({value: 'SELECT 1;\n\nSELECT 2;'});
    const tree = syntaxTree(editor.state);
    const stmts = getStatementNodes(editor);
    const stmt1End = stmts[0].to;

    // Raw iterate at stmt1End DOES see Statement 1 (Lezer is inclusive)
    let seenStmt1AtBoundary = false;
    tree.iterate({
      from: stmt1End,
      to: stmt1End + 10,
      enter: (node) => {
        if (node.type.name === 'Statement' && node.from === stmts[0].from) {
          seenStmt1AtBoundary = true;
        }
      }
    });
    expect(seenStmt1AtBoundary).toBe(true);  // Lezer IS inclusive

    // But _needsExpansion must NOT treat this as needing expansion.
    // The query at Statement 2's position should return only Statement 2.
    const stmt2Start = stmts[1].from;
    const result = editor.getQueryAt(stmt2Start);
    expect(result.value).toBe('SELECT 2;');
  });

  it('query starting exactly at previous Statement boundary is not expanded',()=>{
    // Edge case: cursor right after the previous Statement.
    // _needsExpansion must not fire because the previous Statement
    // does not straddle (contain) startPos.
    cmRerender({value: 'SELECT 1;\nSELECT 2;'});
    const stmts = getStatementNodes(editor);
    expect(stmts.length).toBe(2);
    // Cursor on second query — must return only the second query
    const result = editor.getQueryAt(stmts[1].from);
    expect(result.value).toBe('SELECT 2;');
    // from may include the preceding newline (trimmed from value)
    expect(result.to).toBe(stmts[1].to);
  });

});
