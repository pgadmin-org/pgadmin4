/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import url_for from 'sources/url_for';
import { DATA_POINT_SIZE } from 'sources/chartjs';

export const X_AXIS_LENGTH = 75;

/* URL for fetching graphs data */
export function getStatsUrl(sid=-1, did=-1, chart_names=[]) {
  let base_url = url_for('dashboard.system_statistics');
  base_url += '/' + sid;
  base_url += (did > 0) ? ('/' + did) : '';
  base_url += '?chart_names=' + chart_names.join(',');
  return base_url;
}

export function transformData(labels, refreshRate) {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#8D6E63', '#2196F3', '#FFEB3B', '#9C27B0',
    '#00BCD4', '#CDDC39', '#FF5722', '#3F51B5', '#FFC107',
    '#607D8B', '#E91E63', '#009688', '#795548', '#FF9800'
  ];
  let datasets = Object.keys(labels).map((label, i)=>{
    return {
      label: label,
      data: labels[label] || [],
      borderColor: colors[i],
      pointHitRadius: DATA_POINT_SIZE,
    };
  }) || [];
  return {
    datasets: datasets,
    refreshRate: refreshRate,
  };
}

/* This will process incoming charts data add it the previous charts
 * data to get the new state.
 */
export function statsReducer(state, action) {

  if(action.reset) {
    return action.reset;
  }

  if(!action.incoming) {
    return state;
  }

  if(!action.counterData) {
    action.counterData = action.incoming;
  }

  let newState = {};
  Object.keys(action.incoming).forEach(label => {
    // Sys stats extension may send 'NaN' sometimes, better handle it.
    const value = action.incoming[label] == 'NaN' ? 0 : action.incoming[label];
    if(state[label]) {
      newState[label] = [
        action.counter ?  value - action.counterData[label] :value,
        ...state[label].slice(0, X_AXIS_LENGTH-1),
      ];
    } else {
      newState[label] = [
        action.counter ? value - action.counterData[label] : value,
      ];
    }
  });
  return newState;
}
