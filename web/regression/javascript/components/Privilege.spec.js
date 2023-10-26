/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import Privilege from 'sources/components/Privilege';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { withTheme } from '../fake_theme';

describe('Privilege', ()=>{
  let ctrl, onChange = jest.fn(), ctrlRerender;
  let onClickAction = ()=> {
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
  };

  beforeEach(()=>{
    let ThemedPrivilege = withTheme(Privilege);
    ctrl = render(
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
      />
    );
    ctrlRerender = (props)=>{
      ctrl.rerender(
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
          {...props}
        />
      );
    };
  });

  it('init', ()=>{
    expect(screen.getByRole('textbox')).toHaveValue('Ca*');
    // first 2 are all
    //C
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[2].className.includes('Mui-checked')).toBe(true);
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[3].className.includes('Mui-checked')).toBe(false);

    //a
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[4].className.includes('Mui-checked')).toBe(true);
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[5].className.includes('Mui-checked')).toBe(true);

    //r
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[6].className.includes('Mui-checked')).toBe(false);
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[7].className.includes('Mui-checked')).toBe(false);
  });

  it('change prop value', ()=>{
    ctrlRerender({value: [{
      privilege_type: 'C',
      privilege: true,
      with_grant: true,
    },{
      privilege_type: 'r',
      privilege: true,
      with_grant: false,
    }]});

    expect(screen.getByRole('textbox')).toHaveValue('C*r');
    // first 2 are all
    //C
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[2].className.includes('Mui-checked')).toBe(true);
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[3].className.includes('Mui-checked')).toBe(true);

    //a
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[4].className.includes('Mui-checked')).toBe(false);
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[5].className.includes('Mui-checked')).toBe(false);

    //r
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[6].className.includes('Mui-checked')).toBe(true);
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[7].className.includes('Mui-checked')).toBe(false);
  });

  it('no prop value', ()=>{
    ctrlRerender({value: null});
    expect(screen.getByRole('textbox')).toHaveValue('');
    // first 2 are all
    //C
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[2].className.includes('Mui-checked')).toBe(false);
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[3].className.includes('Mui-checked')).toBe(false);

    //a
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[4].className.includes('Mui-checked')).toBe(false);
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[5].className.includes('Mui-checked')).toBe(false);

    //r
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[6].className.includes('Mui-checked')).toBe(false);
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[7].className.includes('Mui-checked')).toBe(false);
  });

  it('with grant disabled', ()=>{
    // first 2 are all
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[1].className.includes('Mui-disabled')).toBe(true);

    //r
    expect(ctrl.container.querySelectorAll('.MuiCheckbox-root')[7].className.includes('Mui-disabled')).toBe(true);
  });

  it('on check click', async ()=>{
    onChange.mockClear();

    //C
    fireEvent.click(ctrl.container.querySelectorAll('input[name="C"]')[0]);

    await waitFor(()=>{
      expect(onChange).toHaveBeenCalledWith([{
        privilege: true,
        privilege_type: 'a',
        with_grant: true,
      }]);
    }, {timeout: 500});
  });

  it('on new check click', async ()=>{
    onChange.mockClear();

    //r
    fireEvent.click(ctrl.container.querySelectorAll('input[name="r"]')[0]);

    await waitFor(()=>{
      onClickAction();
    }, {timeout: 500});
  });

  it('on check grant click', async ()=>{
    onChange.mockClear();

    //C
    fireEvent.click(ctrl.container.querySelectorAll('input[name="C"]')[1]);

    await waitFor(()=>{
      expect(onChange).toHaveBeenCalledWith([{
        privilege_type: 'C',
        privilege: true,
        with_grant: true,
      },{
        privilege_type: 'a',
        privilege: true,
        with_grant: true,
      }]);
    }, {timeout: 500});
  });

  it('on all click', async ()=>{
    onChange.mockClear();

    // all
    fireEvent.click(ctrl.container.querySelectorAll('input[name="all"]')[0]);

    await waitFor(()=>{
      onClickAction();
    }, {timeout: 500});
  });

  it('on all with grant click', async ()=>{
    ctrlRerender({
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

    onChange.mockClear();

    // all
    fireEvent.click(ctrl.container.querySelectorAll('input[name="all"]')[1]);

    await waitFor(()=>{
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
    }, {timeout: 500});
  });
});
