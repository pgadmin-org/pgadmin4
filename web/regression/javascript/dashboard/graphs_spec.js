

import { DATA_POINT_SIZE } from 'sources/chartjs';

import Graphs, { transformData,
  getStatsUrl, statsReducer} from '../../../pgadmin/dashboard/static/js/Graphs';
import { withTheme } from '../fake_theme';
import { act, render } from '@testing-library/react';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

/* Render each chart's data points as text so the plotted values can be
 * checked without drawing the charts.
 */
jest.mock('../../../pgadmin/dashboard/static/js/components/ChartContainer', ()=>{
  const React = require('react');
  const MockChartContainer = ({id, datasets})=>React.createElement(
    'div', {'data-testid': id}, JSON.stringify(datasets.map((d)=>d.data))
  );
  return MockChartContainer;
});

describe('Graphs.js', ()=>{
  it('transformData', ()=>{
    expect(transformData({'Label1': [], 'Label2': []}, 1)).toEqual({
      datasets: [{
        label: 'Label1',
        data: [],
        borderColor: '#1F77B4',
        pointHitRadius: DATA_POINT_SIZE,
      },{
        label: 'Label2',
        data: [],
        borderColor: '#FF7F0E',
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

    it('with incoming with counter and elapsed time', ()=>{
      let state = {
        'Label1': [1], 'Label2': [2],
      };
      let action = {
        incoming: {
          'Label1': 11, 'Label2': 23,
        },
        counter: true,
        counterData: {'Label1': 1, 'Label2': 3},
        elapsed: 5,
      };
      let newState = {
        'Label1': [2, 1], 'Label2': [4, 2],
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

  describe('<Graphs /> TPS polling', ()=>{
    let networkMock;
    let ThemedGraphs = withTheme(Graphs);
    let dashboardPref = {
      session_stats_refresh: 5,
      tps_stats_refresh: 5,
      ti_stats_refresh: 5,
      to_stats_refresh: 5,
      bio_stats_refresh: 5,
      show_graphs: true,
      graph_data_points: true,
      graph_mouse_track: true,
      graph_line_border_width: 2
    };

    let commitCounts;

    beforeEach(()=>{
      jest.useFakeTimers();
      commitCounts = [];
      networkMock = new MockAdapter(axios);
      /* Only answer with TPS data when the poll asks for it. */
      networkMock.onGet(/\/dashboard\/dashboard_stats\//).reply((config)=>{
        if(config.url.includes('tps_stats')) {
          return [200, {'tps_stats': {'Commits': commitCounts.shift()}}];
        }
        return [200, {}];
      });
    });

    afterEach(()=>{
      networkMock.restore();
      jest.useRealTimers();
    });

    it('normalises TPS by the measured time between samples', async ()=>{
      commitCounts.push(100);
      let graphComp;
      await act(async ()=>{
        graphComp = render(<ThemedGraphs preferences={dashboardPref} sid={1} did={1} enablePoll={true} pageVisible={true} />);
      });

      /* 50 transactions over the configured 5 seconds is 10 per second. */
      commitCounts.push(150);
      await act(async ()=>{
        await jest.advanceTimersByTimeAsync(5000);
      });
      expect(graphComp.getByTestId('tps-graph')).toHaveTextContent('[[10,0]]');

      /* A delayed poll: 100 transactions over 10 seconds is still 10 per
       * second, not 20.
       */
      jest.setSystemTime(Date.now() + 5000);
      commitCounts.push(250);
      await act(async ()=>{
        await jest.advanceTimersByTimeAsync(5000);
      });
      expect(graphComp.getByTestId('tps-graph')).toHaveTextContent('[[10,10,0]]');
    });
  });
});
