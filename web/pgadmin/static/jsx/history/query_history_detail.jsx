//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import HistoryDetailMetadata from './detail/history_detail_metadata';
import HistoryDetailQuery from './detail/history_detail_query';
import HistoryDetailMessage from './detail/history_detail_message';
import HistoryErrorMessage from './detail/history_error_message';
import Shapes from '../react_shapes';

export default class QueryHistoryDetail extends React.Component {

  render() {
    if (!_.isUndefined(this.props.historyEntry)) {
      let historyErrorMessage = null;
      if (!this.props.historyEntry.status) {
        historyErrorMessage = <div className='error-message-block'>
          <HistoryErrorMessage {...this.props} />
        </div>;
      }

      return (
        <div id='query_detail' className='query-detail'>
          {historyErrorMessage}
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
