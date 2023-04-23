import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import {mount} from 'enzyme';
import '../../helper/enzyme.helper';

import ConnectionBar, {STATUS} from 'pgadmin.tools.erd/erd_tool/components/ConnectionBar';
import Theme from '../../../../pgadmin/static/js/Theme';

describe('ERD ConnectionBar', ()=>{
  beforeEach(()=>{
    jasmineEnzyme();
  });

  it('<ConnectionBar /> comp', ()=>{
    const connBar = mount(<Theme><ConnectionBar status={STATUS.DISCONNECTED} title="test title"/></Theme>);

    expect(connBar.find('DefaultButton[data-test="btn-conn-title"]').text()).toBe('test title');

    connBar.setProps({
      children: <ConnectionBar status={STATUS.CONNECTING} title="test title"/>
    });
    expect(connBar.find('DefaultButton[data-test="btn-conn-title"]').text()).toBe('(Obtaining connection...) test title');

    connBar.setProps({
      children: <ConnectionBar status={STATUS.CONNECTING} title="test title" bgcolor='#000' fgcolor='#fff'/>
    });
    const titleEle = connBar.find('DefaultButton[data-test="btn-conn-title"]');

    expect(titleEle.prop('style').backgroundColor).toBe('#000');
    expect(titleEle.prop('style').color).toBe('#fff');
  });
});
