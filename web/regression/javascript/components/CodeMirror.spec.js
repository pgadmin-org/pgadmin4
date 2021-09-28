/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import {default as OrigCodeMirror} from 'bundled_codemirror';

import CodeMirror from 'sources/components/CodeMirror';
import { mount } from 'enzyme';

describe('CodeMirror', ()=>{
  let cmInstance, options={
      lineNumbers: true,
      mode: 'text/x-pgsql',
    },
    cmObj = jasmine.createSpyObj('cmObj', {
      'getValue':()=>'',
      'setValue': ()=>{},
      'refresh': ()=>{},
      'setOption': ()=>{},
      'removeKeyMap': ()=>{},
      'addKeyMap': ()=>{},
      'getWrapperElement': document.createElement('div'),
    });
  beforeEach(()=>{
    jasmineEnzyme();
    spyOn(OrigCodeMirror, 'fromTextArea').and.returnValue(cmObj);
    cmInstance = mount(
      <CodeMirror
        value={'Init text'}
        options={options}
        className="testClass"
      />);
  });

  it('init', ()=>{
    /* textarea ref passed to fromTextArea */
    expect(OrigCodeMirror.fromTextArea).toHaveBeenCalledWith(cmInstance.find('textarea').getDOMNode(), options);
    expect(cmObj.setValue).toHaveBeenCalledWith('Init text');
  });

  it('change value', ()=>{
    cmInstance.setProps({value: 'the new text'});
    expect(cmObj.setValue).toHaveBeenCalledWith('the new text');
  });
});
