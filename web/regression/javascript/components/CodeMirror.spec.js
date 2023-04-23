/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import {default as OrigCodeMirror} from 'bundled_codemirror';
import { withTheme } from '../fake_theme';

import pgWindow from 'sources/window';
import CodeMirror from 'sources/components/CodeMirror';
import { mount } from 'enzyme';
import { FindDialog } from '../../../pgadmin/static/js/components/CodeMirror';
import fakePgAdmin from '../fake_pgadmin';

describe('CodeMirror', ()=>{
  let cmInstance, options={
      lineNumbers: true,
      mode: 'text/x-pgsql',
    },
    cmObj = jasmine.createSpyObj('cmObj', {
      'getValue':()=>'',
      'setValue': ()=>{/*This is intentional (SonarQube)*/},
      'refresh': ()=>{/*This is intentional (SonarQube)*/},
      'setOption': ()=>{/*This is intentional (SonarQube)*/},
      'removeKeyMap': ()=>{/*This is intentional (SonarQube)*/},
      'addKeyMap': ()=>{/*This is intentional (SonarQube)*/},
      'getSelection': () => {/*This is intentional (SonarQube)*/},
      'getSearchCursor': {
        _from: 3,
        _to: 14,
        find: function(_rev) {
          if(_rev){
            this._from = 1;
            this._to = 10;
          } else {
            this._from = 3;
            this._to = 14;
          }
          return true;
        },
        from: function() {return this._from;},
        to: function() {return this._to;},
        replace: jasmine.createSpy('replace'),
      },
      'getCursor': ()=>{/*This is intentional (SonarQube)*/},
      'removeOverlay': ()=>{/*This is intentional (SonarQube)*/},
      'addOverlay': ()=>{/*This is intentional (SonarQube)*/},
      'setSelection': ()=>{/*This is intentional (SonarQube)*/},
      'scrollIntoView': ()=>{/*This is intentional (SonarQube)*/},
      'getWrapperElement': document.createElement('div'),
      'on': ()=>{/*This is intentional (SonarQube)*/},
    });
  beforeEach(()=>{
    jasmineEnzyme();
    pgWindow.pgAdmin = fakePgAdmin;
    spyOn(OrigCodeMirror, 'fromTextArea').and.returnValue(cmObj);
    const ThemedCM = withTheme(CodeMirror);
    cmInstance = mount(
      <ThemedCM
        value={'Init text'}
        options={options}
        className="testClass"
      />);
  });

  afterEach(()=>{
    pgWindow.pgAdmin = undefined;
  });

  it('init', ()=>{
    /* textarea ref passed to fromTextArea */
    expect(OrigCodeMirror.fromTextArea).toHaveBeenCalledWith(cmInstance.find('textarea').getDOMNode(), jasmine.objectContaining(options));
    expect(cmObj.setValue).toHaveBeenCalledWith('Init text');
  });

  it('change value', ()=>{
    cmInstance.setProps({value: 'the new text'});
    expect(cmObj.setValue).toHaveBeenCalledWith('the new text');

    cmInstance.setProps({value: null});
    expect(cmObj.setValue).toHaveBeenCalledWith('');
  });


  describe('FindDialog', ()=>{
    let ctrl;
    const onClose = jasmine.createSpy('onClose');
    const ThemedFindDialog = withTheme(FindDialog);
    const ctrlMount = (props, callback)=>{
      ctrl?.unmount();
      ctrl = mount(
        <ThemedFindDialog
          editor={cmObj}
          show={true}
          onClose={onClose}
          {...props}
        />
      );
      setTimeout(()=>{
        ctrl.update();
        callback();
      }, 0);
    };

    it('init', (done)=>{
      ctrlMount({}, ()=>{
        cmObj.removeOverlay.calls.reset();
        cmObj.addOverlay.calls.reset();
        ctrl.find('InputText').find('input').simulate('change', {
          target: {value: '\n\r\t\A'},
        });
        setTimeout(()=>{
          expect(cmObj.removeOverlay).toHaveBeenCalled();
          expect(cmObj.addOverlay).toHaveBeenCalled();
          expect(cmObj.setSelection).toHaveBeenCalledWith(3, 14);
          expect(cmObj.scrollIntoView).toHaveBeenCalled();
          done();
        }, 0);
      });
    });

    it('reverse forward', (done)=>{
      ctrlMount({}, ()=>{
        ctrl.find('InputText').find('input').simulate('change', {
          target: {value: 'A'},
        });
        cmObj.setSelection.calls.reset();
        cmObj.addOverlay.calls.reset();
        ctrl.find('InputText').find('input').simulate('keypress', {
          key: 'Enter', shiftKey: true,
        });
        ctrl.find('InputText').find('input').simulate('keypress', {
          key: 'Enter', shiftKey: false,
        });
        setTimeout(()=>{
          expect(cmObj.setSelection).toHaveBeenCalledWith(1, 10);
          expect(cmObj.setSelection).toHaveBeenCalledWith(3, 14);
          done();
        }, 0);
      });
    });


    it('escape', (done)=>{
      ctrlMount({}, ()=>{
        cmObj.removeOverlay.calls.reset();
        ctrl.find('InputText').find('input').simulate('keydown', {
          key: 'Escape',
        });
        setTimeout(()=>{
          expect(cmObj.removeOverlay).toHaveBeenCalled();
          done();
        }, 0);
      });
    });

    it('toggle match case', (done)=>{
      ctrlMount({}, ()=>{
        expect(ctrl.find('PgIconButton[data-test="case"]').props()).toEqual(jasmine.objectContaining({
          color: 'default'
        }));
        ctrl.find('PgIconButton[data-test="case"]').find('button').simulate('click');
        setTimeout(()=>{
          expect(ctrl.find('PgIconButton[data-test="case"]').props()).toEqual(jasmine.objectContaining({
            color: 'primary'
          }));
          done();
        }, 0);
      });
    });

    it('toggle regex', (done)=>{
      ctrlMount({}, ()=>{
        ctrl.find('InputText').find('input').simulate('change', {
          target: {value: 'A'},
        });
        expect(ctrl.find('PgIconButton[data-test="regex"]').props()).toEqual(jasmine.objectContaining({
          color: 'default'
        }));
        ctrl.find('PgIconButton[data-test="regex"]').find('button').simulate('click');
        setTimeout(()=>{
          expect(ctrl.find('PgIconButton[data-test="regex"]').props()).toEqual(jasmine.objectContaining({
            color: 'primary'
          }));
          done();
        }, 0);
      });
    });

    it('replace', (done)=>{
      ctrlMount({replace: true}, ()=>{
        cmObj.getSearchCursor().replace.calls.reset();
        ctrl.find('InputText').at(0).find('input').simulate('change', {
          target: {value: 'A'},
        });
        ctrl.find('InputText').at(1).find('input').simulate('change', {
          target: {value: 'B'},
        });
        ctrl.find('InputText').at(1).find('input').simulate('keypress', {
          key: 'Enter', shiftKey: true,
        });
        setTimeout(()=>{
          expect(cmObj.getSearchCursor().replace).toHaveBeenCalled();
          done();
        }, 0);
      });
    });

  });
});
