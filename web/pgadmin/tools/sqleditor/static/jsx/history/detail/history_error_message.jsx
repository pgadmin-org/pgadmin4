//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';

import Shapes from '../../react_shapes';

export default class HistoryErrorMessage extends React.Component {

  parseErrorMessage(message) {
    return message.match(/ERROR:\s*([^\n\r]*)/i) ?
           message.match(/ERROR:\s*([^\n\r]*)/i)[1] :
           message;
  }

  render() {
    return (
      <div className='history-error-text'>
        <span>Error Message</span> {this.parseErrorMessage(this.props.historyEntry.message)}
      </div>);
  }
}

HistoryErrorMessage.propTypes = {
  historyEntry: Shapes.historyDetail,
};
