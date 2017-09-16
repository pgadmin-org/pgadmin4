//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import moment from 'moment';
import Shapes from '../../react_shapes';

export default class HistoryDetailMetadata extends React.Component {

  formatDate(date) {
    return (moment(date).format('M-D-YY HH:mm:ss'));
  }

  queryMetaData(data, description) {
    return <div className='item'>
      <span className='value'>
        {data}
      </span>
      <span className='description'>
        {description}
      </span>
    </div>;
  }

  render() {
    return <div className='metadata'>
      {this.queryMetaData(this.formatDate(this.props.historyEntry.start_time), 'Date')}
      {this.queryMetaData(this.props.historyEntry.row_affected.toLocaleString(), 'Rows Affected')}
      {this.queryMetaData(this.props.historyEntry.total_time, 'Duration')}
    </div>;
  }
}

HistoryDetailMetadata.propTypes = {
  historyEntry: Shapes.historyDetail,
};