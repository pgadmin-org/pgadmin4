import React from 'react';

import {GraphsWrapper, X_AXIS_LENGTH, POINT_SIZE} from '../../../pgadmin/dashboard/static/js/Graphs';
import { withTheme } from '../fake_theme';
import { render, screen } from '@testing-library/react';

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
  const compRerender = (props)=>{
    graphComp.rerender(
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
        isTest={true}
        {...props}
      />
    );
  };
  beforeEach(()=>{
    graphComp = render(
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

  it('graph containers are rendered', ()=>{
    expect(screen.getAllByTestId('chart-container').length).toBe(5);
  });

  it('graph headers are correct', ()=>{
    let found = screen.getAllByTestId('chart-container');
    expect(found.at(0)).toHaveTextContent('Server sessions');
    expect(found.at(1)).toHaveTextContent('Transactions per second');
    expect(found.at(2)).toHaveTextContent('Tuples in');
    expect(found.at(3)).toHaveTextContent('Tuples out');
    expect(found.at(4)).toHaveTextContent('Block I/O');
  });

  it('graph headers when database', ()=>{
    compRerender({isDatabase: true});
    let found = screen.getAllByTestId('chart-container');
    expect(found.at(0)).toHaveTextContent('Database sessions');
  });

  it('graph body shows the error', ()=>{
    compRerender({errorMsg: 'Some error occurred'});
    let found = screen.getAllByTestId('chart-container');
    expect(found.at(0)).toHaveTextContent('Some error occurred');
    expect(found.at(1)).toHaveTextContent('Some error occurred');
    expect(found.at(2)).toHaveTextContent('Some error occurred');
    expect(found.at(3)).toHaveTextContent('Some error occurred');
    expect(found.at(4)).toHaveTextContent('Some error occurred');
  });
});
