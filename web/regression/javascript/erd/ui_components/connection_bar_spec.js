import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import {mount} from 'enzyme';
import '../../helper/enzyme.helper';

import ConnectionBar, {STATUS} from 'pgadmin.tools.erd/erd_tool/ui_components/ConnectionBar';

describe('ERD ConnectionBar', ()=>{
  beforeEach(()=>{
    jasmineEnzyme();
  });

  it('<ConnectionBar /> comp', ()=>{
    let connBar = mount(<ConnectionBar statusId="conn-bar" status={STATUS.DISCONNECTED} title="test title"/>);

    expect(connBar.find('.editor-title').text()).toBe('test title');

    connBar.setProps({status: STATUS.CONNECTING});
    expect(connBar.find('.editor-title').text()).toBe('(Obtaining connection...) test title');

    connBar.setProps({bgcolor: '#000', fgcolor: '#fff'});
    expect(connBar.find('.editor-title').prop('style').backgroundColor).toBe('#000');
    expect(connBar.find('.editor-title').prop('style').color).toBe('#fff');
  });
});
