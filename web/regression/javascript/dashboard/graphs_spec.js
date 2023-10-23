
import React from 'react';

import { DATA_POINT_SIZE } from 'sources/chartjs';

import Graphs, { transformData,
  getStatsUrl, statsReducer} from '../../../pgadmin/dashboard/static/js/Graphs';
import { withTheme } from '../fake_theme';
import { render } from '@testing-library/react';

describe('Graphs.js', ()=>{
  it('transformData', ()=>{
    expect(transformData({'Label1': [], 'Label2': []}, 1, false)).toEqual({
      datasets: [{
        label: 'Label1',
        data: [],
        borderColor: '#00BCD4',
        pointHitRadius: DATA_POINT_SIZE,
      },{
        label: 'Label2',
        data: [],
        borderColor: '#9CCC65',
        pointHitRadius: DATA_POINT_SIZE,
      }],
      refreshRate: 1,
    });
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
    let ThemedGraphs = withTheme(Graphs);
    beforeEach(()=>{
      let dashboardPref = {
        session_stats_refresh: 1,
        tps_stats_refresh: 1,
        ti_stats_refresh: 1,
        to_stats_refresh: 1,
        bio_stats_refresh: 1,
        show_graphs: true,
        graph_data_points: true,
        graph_mouse_track: true,
        graph_line_border_width: 2
      };

      graphComp = render(<ThemedGraphs preferences={dashboardPref} sid={sid} did={did} enablePoll={false} pageVisible={true} isTest={true} />);
    });

    it('pollDelay is set',  ()=>{
      let found = graphComp.container.querySelector('[data-testid="graph-poll-delay"]');
      expect(found).toHaveTextContent('1000');
    });

    it('pollDelay on preference update',  ()=>{
      let dashboardPref = {
        session_stats_refresh: 5,
        tps_stats_refresh: 10,
        ti_stats_refresh: 5,
        to_stats_refresh: 10,
        bio_stats_refresh: 10,
        show_graphs: true,
        graph_data_points: true,
        graph_mouse_track: true,
        graph_line_border_width: 2
      };
      graphComp.rerender(<ThemedGraphs preferences={dashboardPref} sid={sid} did={did} enablePoll={false} pageVisible={true} isTest={true} />);
      let found = graphComp.container.querySelector('[data-testid="graph-poll-delay"]');
      expect(found).toHaveTextContent('5000');
    });
  });
});
