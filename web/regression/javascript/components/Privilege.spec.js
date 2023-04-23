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
import Privilege from 'sources/components/Privilege';
import { mount } from 'enzyme';
import { withTheme } from '../fake_theme';

describe('Privilege', ()=>{
  let ctrl, onChange = jasmine.createSpy('onChange');
  let onClickAction = (done)=> {
    expect(onChange).toHaveBeenCalledWith([{
      privilege_type: 'C',
      privilege: true,
      with_grant: false,
    },{
      privilege_type: 'a',
      privilege: true,
      with_grant: true,
    },{
      privilege_type: 'r',
      privilege: true,
      with_grant: false,
    }]);
    done();
  };

  beforeEach(()=>{
    jasmineEnzyme();
    let ThemedPrivilege = withTheme(Privilege);
    ctrl = mount(
      <ThemedPrivilege
        value={[{
          privilege_type: 'C',
          privilege: true,
          with_grant: false,
        },{
          privilege_type: 'a',
          privilege: true,
          with_grant: true,
        }]}
        controlProps={{
          supportedPrivs: ['C', 'a', 'r']
        }}
        onChange={onChange}
      />);
  });

  it('init', ()=>{
    expect(ctrl.find('InputText').prop('value')).toBe('Ca*');
    expect(ctrl.find('InputCheckbox[name="C"]').at(0).prop('value')).toBeTrue();
    expect(ctrl.find('InputCheckbox[name="C"]').at(1).prop('value')).toBeFalse();

    expect(ctrl.find('InputCheckbox[name="a"]').at(0).prop('value')).toBeTrue();
    expect(ctrl.find('InputCheckbox[name="a"]').at(1).prop('value')).toBeTrue();

    expect(ctrl.find('InputCheckbox[name="r"]').at(0).prop('value')).toBeFalse();
    expect(ctrl.find('InputCheckbox[name="r"]').at(1).prop('value')).toBeFalse();
  });

  it('change prop value', ()=>{
    ctrl.setProps({value: [{
      privilege_type: 'C',
      privilege: true,
      with_grant: true,
    },{
      privilege_type: 'r',
      privilege: true,
      with_grant: false,
    }]});

    expect(ctrl.find('InputText').prop('value')).toBe('C*r');
    expect(ctrl.find('InputCheckbox[name="C"]').at(0).prop('value')).toBeTrue();
    expect(ctrl.find('InputCheckbox[name="C"]').at(1).prop('value')).toBeTrue();

    expect(ctrl.find('InputCheckbox[name="a"]').at(0).prop('value')).toBeFalse();
    expect(ctrl.find('InputCheckbox[name="a"]').at(1).prop('value')).toBeFalse();

    expect(ctrl.find('InputCheckbox[name="r"]').at(0).prop('value')).toBeTrue();
    expect(ctrl.find('InputCheckbox[name="r"]').at(1).prop('value')).toBeFalse();
  });

  it('no prop value', ()=>{
    ctrl.setProps({value: null});

    expect(ctrl.find('InputText').prop('value')).toBe('');
    expect(ctrl.find('InputCheckbox[name="C"]').at(0).prop('value')).toBeFalse();
    expect(ctrl.find('InputCheckbox[name="C"]').at(1).prop('value')).toBeFalse();

    expect(ctrl.find('InputCheckbox[name="a"]').at(0).prop('value')).toBeFalse();
    expect(ctrl.find('InputCheckbox[name="a"]').at(1).prop('value')).toBeFalse();

    expect(ctrl.find('InputCheckbox[name="r"]').at(0).prop('value')).toBeFalse();
    expect(ctrl.find('InputCheckbox[name="r"]').at(1).prop('value')).toBeFalse();
  });

  it('with grant disabled', ()=>{
    expect(ctrl.find('InputCheckbox[name="all"]').at(1).prop('disabled')).toBeTrue();
    expect(ctrl.find('InputCheckbox[name="r"]').at(1).prop('disabled')).toBeTrue();
  });

  it('on check click', (done)=>{
    onChange.calls.reset();
    ctrl.find('InputCheckbox[name="C"]').at(0).find('input').
      simulate('change', {target: {checked: false, name: 'C'}});

    setTimeout(()=>{
      expect(onChange).toHaveBeenCalledWith([{
        privilege_type: 'a',
        privilege: true,
        with_grant: true,
      }]);
      done();
    }, 500);
  });

  it('on new check click', (done)=>{
    onChange.calls.reset();
    ctrl.find('InputCheckbox[name="r"]').at(0).find('input').
      simulate('change', {target: {checked: true, name: 'r'}});

    setTimeout(()=>{
      onClickAction(done);
    }, 500);
  });

  it('on check grant click', (done)=>{
    onChange.calls.reset();
    ctrl.find('InputCheckbox[name="C"]').at(1).find('input').
      simulate('change', {target: {checked: true, name: 'C'}});

    setTimeout(()=>{
      expect(onChange).toHaveBeenCalledWith([{
        privilege_type: 'C',
        privilege: true,
        with_grant: true,
      },{
        privilege_type: 'a',
        privilege: true,
        with_grant: true,
      }]);
      done();
    }, 500);
  });

  it('on all click', (done)=>{
    ctrl.find('InputCheckbox[name="all"]').at(0).find('input').simulate('change', {target: {checked: true}});

    setTimeout(()=>{
      onClickAction(done);
    }, 500);
  });

  it('on all with grant click', (done)=>{
    ctrl.setProps({
      value: [{
        privilege_type: 'C',
        privilege: true,
        with_grant: false,
      },{
        privilege_type: 'a',
        privilege: true,
        with_grant: true,
      },{
        privilege_type: 'r',
        privilege: true,
        with_grant: false,
      }]
    });
    ctrl.find('InputCheckbox[name="all"]').at(1).find('input').simulate('change', {target: {checked: true}});

    setTimeout(()=>{
      expect(onChange).toHaveBeenCalledWith([{
        privilege_type: 'C',
        privilege: true,
        with_grant: true,
      },{
        privilege_type: 'a',
        privilege: true,
        with_grant: true,
      },{
        privilege_type: 'r',
        privilege: true,
        with_grant: true,
      }]);
      done();
    }, 500);
  });
});
