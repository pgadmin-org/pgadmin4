/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import { withTheme } from '../fake_theme';
import CodeMirror from 'sources/components/ReactCodeMirror';

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

});
