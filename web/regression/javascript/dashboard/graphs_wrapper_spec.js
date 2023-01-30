import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import {mount} from 'enzyme';
import '../helper/enzyme.helper';

import {GraphsWrapper, X_AXIS_LENGTH, POINT_SIZE} from '../../../pgadmin/dashboard/static/js/Graphs';
import { withTheme } from '../fake_theme';

describe('<GraphsWrapper /> component', ()=>{
  let graphComp = null;
  let defaultStats = {
    labels: [...Array(X_AXIS_LENGTH).keys()],
    datasets: [{
      label: 'Label1',
      data: [],
      borderColor: '#00BCD4',
      backgroundColor: '#00BCD4',
      pointHitRadius: POINT_SIZE,
    },{
      label: 'Label2',
      data: [],
      borderColor: '#9CCC65',
      backgroundColor: '#9CCC65',
      pointHitRadius: POINT_SIZE,
    }],
    refreshRate: 1,
  };
  let ThemedGraphsWrapper = withTheme(GraphsWrapper);
  beforeEach(()=>{
    jasmineEnzyme();
    graphComp = mount(
      <ThemedGraphsWrapper sessionStats={defaultStats}
        tpsStats={defaultStats}
        tiStats={defaultStats}
        toStats={defaultStats}
        bioStats={defaultStats}
        errorMsg={null}
        showTooltip={true}
        showDataPoints={true}
        lineBorderWidth={2}
        isDatabase={false}
        isTest={true} />
    );
  });

  it('graph containers are rendered', (done)=>{
    let found = graphComp.find('ChartContainer');
    expect(found.length).toBe(5);
    done();
  });

  it('graph headers are correct', (done)=>{
    let found = graphComp.find('ChartContainer');
    expect(found.at(0)).toIncludeText('Server sessions');
    expect(found.at(1)).toIncludeText('Transactions per second');
    expect(found.at(2)).toIncludeText('Tuples in');
    expect(found.at(3)).toIncludeText('Tuples out');
    expect(found.at(4)).toIncludeText('Block I/O');
    done();
  });

  it('graph headers when database', (done)=>{
    let found = graphComp.find('ChartContainer');
    graphComp.setProps({isDatabase: true});
    expect(found.at(0)).toIncludeText('Database sessions');
    done();
  });

  it('graph body shows the error', (done)=>{
    graphComp.setProps({errorMsg: 'Some error occurred'});
    setTimeout(()=>{
      graphComp.update();
      let found = graphComp.find('ChartContainer');
      expect(found.at(0)).toIncludeText('Some error occurred');
      expect(found.at(1)).toIncludeText('Some error occurred');
      expect(found.at(2)).toIncludeText('Some error occurred');
      expect(found.at(3)).toIncludeText('Some error occurred');
      expect(found.at(4)).toIncludeText('Some error occurred');
      done();
    }, 500);
  });
});
