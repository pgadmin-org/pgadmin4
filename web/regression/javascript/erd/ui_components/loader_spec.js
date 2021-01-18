import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import {shallow} from 'enzyme';
import '../../helper/enzyme.helper';

import Loader from 'pgadmin.tools.erd/erd_tool/ui_components/Loader';

describe('ERD Loader', ()=>{
  beforeEach(()=>{
    jasmineEnzyme();
  });

  it('<Loader /> comp', ()=>{
    let loaderComp = shallow(<Loader />);
    expect(loaderComp.isEmptyRender()).toBeTruthy();

    loaderComp.setProps({message: 'test message'});
    expect(loaderComp.find('.pg-sp-text').text()).toBe('test message');

    loaderComp.setProps({autoEllipsis: true});
    expect(loaderComp.find('.pg-sp-text').text()).toBe('test message...');
  });
});
