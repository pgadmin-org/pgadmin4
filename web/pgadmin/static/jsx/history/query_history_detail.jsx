//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import HistoryDetailMetadata from './detail/history_detail_metadata';
import HistoryDetailQuery from './detail/history_detail_query';
import HistoryDetailMessage from './detail/history_detail_message';
import Shapes from '../react_shapes';

const outerStyle = {
  width: '100%',
  paddingTop: '10px',
  display: 'flex',
  flexDirection: 'column',
};

const detailVerticalTop = {
  flex: 1,
  padding: '0 10px',
};

const detailVerticalMiddle = {
  flex: 5,
  marginLeft: '10px',
  marginRight: '10px',
  height: 0,
  position: 'relative',
};

const hrStyle = {
  borderColor: '#cccccc',
  marginTop: '11px',
  marginBottom: '8px',
};

const detailVerticalBottom = {
  flex: 2,
  display: 'flex',
  paddingLeft: '10px',
};

export default class QueryHistoryDetail extends React.Component {

  render() {
    if (!_.isUndefined(this.props.historyEntry)) {
      return (
        <div id='query_detail' style={outerStyle}>
          <div style={detailVerticalTop}>
            <HistoryDetailMetadata {...this.props} />
          </div>
          <div style={detailVerticalMiddle}>
            <HistoryDetailQuery {...this.props}/>
          </div>
          <div>
            <hr style={hrStyle}/>
          </div>
          <div style={detailVerticalBottom}>
            <HistoryDetailMessage {...this.props}/>
          </div>
        </div>);
    } else {
      return <p></p>;
    }
  }
}

QueryHistoryDetail.propTypes = {
  historyEntry: Shapes.historyDetail,
};