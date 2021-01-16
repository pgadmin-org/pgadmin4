import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import Tippy from '@tippyjs/react';
import {mount, shallow} from 'enzyme';
import '../../helper/enzyme.helper';

import ToolBar, {ButtonGroup, DetailsToggleButton, IconButton, Shortcut} from 'pgadmin.tools.erd/erd_tool/ui_components/ToolBar';

describe('ERD Toolbar', ()=>{
  beforeEach(()=>{
    jasmineEnzyme();
  });

  it('<Toolbar /> comp', ()=>{
    let toolBar = mount(<ToolBar id="id1"><div className="test"></div></ToolBar>);
    expect(toolBar.getDOMNode().id).toBe('id1');
    expect(toolBar.find('.test').length).toBe(1);
  });

  it('<ButtonGroup /> comp', ()=>{
    let btnGrp = mount(<ButtonGroup><div className="test"></div></ButtonGroup>);
    expect(btnGrp.getDOMNode().className).toBe('btn-group mr-1 ');
    expect(btnGrp.find('.test').length).toBe(1);
    btnGrp.unmount();

    btnGrp = mount(<ButtonGroup className="someclass"></ButtonGroup>);
    expect(btnGrp.getDOMNode().className).toBe('btn-group mr-1 someclass');
  });

  it('<DetailsToggleButton /> comp', ()=>{
    let toggle = shallow(<DetailsToggleButton showDetails={true} />);
    let btn = toggle.find(IconButton);
    expect(btn.prop('icon')).toBe('far fa-eye');
    expect(btn.prop('title')).toBe('Show fewer details');

    toggle.setProps({showDetails: false});
    btn = toggle.find(IconButton);
    expect(btn.prop('icon')).toBe('fas fa-low-vision');
    expect(btn.prop('title')).toBe('Show more details');
  });

  it('<IconButton /> comp', ()=>{
    let btn = mount(<IconButton />);

    let tippy = btn.find(Tippy);
    expect(tippy.length).toBe(0);

    btn.setProps({title: 'test title'});
    tippy = btn.find(Tippy);
    expect(tippy.length).toBe(1);

    expect(btn.find('button').getDOMNode().className).toBe('btn btn-sm btn-primary-icon ');

    btn.setProps({icon: 'fa fa-icon'});
    expect(btn.find('button .sql-icon-lg').getDOMNode().className).toBe('fa fa-icon sql-icon-lg');
  });

  it('<Shortcut /> comp', ()=>{
    let key = {
      alt: true,
      control: true,
      shift: false,
      key: {
        key_code: 65,
        char: 'a',
      },
    };
    let shortcutComp = mount(<Shortcut shortcut={key}/>);

    expect(shortcutComp.find('.shortcut-key').length).toBe(3);

    key.alt = false;
    shortcutComp.setProps({shortcut: key});
    expect(shortcutComp.find('.shortcut-key').length).toBe(2);
  });
});
