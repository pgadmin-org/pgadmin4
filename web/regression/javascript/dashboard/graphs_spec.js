import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import {mount} from 'enzyme';
import '../helper/enzyme.helper';

import Graphs, {GraphsWrapper} from '../../../pgadmin/dashboard/static/js/Graphs';
import {X_AXIS_LENGTH, POINT_SIZE, transformData, legendCallback,
  getStatsUrl, statsReducer} from '../../../pgadmin/dashboard/static/js/Graphs';

describe('Graphs.js', ()=>{
  it('transformData', ()=>{
    expect(transformData({'Label1': [], 'Label2': []}, 1)).toEqual({
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
    });
  });

  it('legendCallback', ()=>{
    expect(legendCallback({
      id: 1,
      data: {
        datasets: [{
          label: 'Label1',
          backgroundColor: '#00BCD4',
        },{
          label: 'Label2',
          backgroundColor: '#9CCC65',
        }],
      },
    })).toEqual([
      '<div class="1-legend d-flex">',
      '<div class="legend-value"><span style="background-color:#00BCD4">&nbsp;&nbsp;&nbsp;&nbsp;</span>',
      '<span class="legend-label">Label1</span>',
      '</div>',
      '<div class="legend-value"><span style="background-color:#9CCC65">&nbsp;&nbsp;&nbsp;&nbsp;</span>',
      '<span class="legend-label">Label2</span>',
      '</div>',
      '</div>',
    ].join(''));
  });

  describe('getStatsUrl', ()=>{
    it('for server', ()=>{
      expect(getStatsUrl(432, -1, ['chart1'])).toEqual('/dashboard/dashboard_stats/432?chart_names=chart1');
    });
    it('for database', ()=>{
      expect(getStatsUrl(432, 123, ['chart1'])).toEqual('/dashboard/dashboard_stats/432/123?chart_names=chart1');
    });
    it('for multiple graphs', ()=>{
      expect(getStatsUrl(432, 123, ['chart1', 'chart2'])).toEqual('/dashboard/dashboard_stats/432/123?chart_names=chart1,chart2');
    });
  });

  describe('statsReducer', ()=>{
    it('with incoming no counter', ()=>{
      let state = {
        'Label1': [], 'Label2': [],
      };
      let action = {
        incoming: {
          'Label1': 1, 'Label2': 2,
        },
      };
      let newState = {
        'Label1': [1], 'Label2': [2],
      };
      state = statsReducer(state, action);
      expect(state).toEqual(newState);
    });

    it('with incoming with counter', ()=>{
      let state = {
        'Label1': [1], 'Label2': [2],
      };
      let action = {
        incoming: {
          'Label1': 1, 'Label2': 3,
        },
        counter: true,
        counterData: {'Label1': 1, 'Label2': 2},
      };
      let newState = {
        'Label1': [0, 1], 'Label2': [1, 2],
      };
      state = statsReducer(state, action);
      expect(state).toEqual(newState);
    });

    it('with reset', ()=>{
      let state = {
        'Label1': [0, 1], 'Label2': [1, 2],
      };
      let action = {
        reset: {
          'Label1': [2], 'Label2': [2],
        },
      };
      let newState = {
        'Label1': [2], 'Label2': [2],
      };
      state = statsReducer(state, action);
      expect(state).toEqual(newState);
    });
  });

  describe('<Graphs /> component', ()=>{
    let graphComp = null;
    let sid = 1;
    let did = 1;
    beforeEach(()=>{
      jasmineEnzyme();
      let dashboardPref = {
        session_stats_refresh: 1,
        tps_stats_refresh: 1,
        ti_stats_refresh: 1,
        to_stats_refresh: 1,
        bio_stats_refresh: 1,
        show_graphs: true,
        graph_data_points: true,
        graph_mouse_track: true,
      };

      graphComp = mount(<Graphs preferences={dashboardPref} sid={sid} did={did} enablePoll={false} pageVisible={true} />);
    });

    it('GraphsWrapper is rendered',  (done)=>{
      let found = graphComp.find(GraphsWrapper);
      expect(found.length).toBe(1);
      done();
    });

    it('pollDelay is set',  (done)=>{
      let found = graphComp.find('[data-testid="graph-poll-delay"]');
      expect(found).toHaveClassName('d-none');
      expect(found).toHaveText('1000');
      done();
    });

    it('pollDelay on preference update',  (done)=>{
      let dashboardPref = {
        session_stats_refresh: 5,
        tps_stats_refresh: 10,
        ti_stats_refresh: 5,
        to_stats_refresh: 10,
        bio_stats_refresh: 10,
        show_graphs: true,
        graph_data_points: true,
        graph_mouse_track: true,
      };
      graphComp.setProps({preferences: dashboardPref});
      let found = graphComp.find('[data-testid="graph-poll-delay"]');
      expect(found).toHaveText('5000');
      done();
    });
  });
});