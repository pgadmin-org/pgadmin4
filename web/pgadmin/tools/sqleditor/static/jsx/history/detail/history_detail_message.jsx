//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';

import Shapes from '../../react_shapes';

export default class HistoryDetailMessage extends React.Component {

  render() {
    return (
      <div className='message'>
        <div className='message-header'>
          Messages
        </div>
        <div className='content'>
          <pre className='content-value'>
              {this.props.historyEntry.message}
          </pre>
        </div>
      </div>);
  }
}

HistoryDetailMessage.propTypes = {
  historyEntry: Shapes.historyDetail,
};