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

export default class QueryHistoryDetail extends React.Component {

  render() {
    if (!_.isUndefined(this.props.historyEntry)) {
      return (
        <div id='query_detail' className='query-detail'>
          <div className='metadata-block'>
            <HistoryDetailMetadata {...this.props} />
          </div>
          <div className='query-statement-block'>
            <HistoryDetailQuery {...this.props}/>
          </div>
          <div>
            <hr className='block-divider'/>
          </div>
          <div className='message-block'>
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