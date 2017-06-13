/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import update from 'immutability-helper';
import moment from 'moment';

const outerDivStyle = {
  paddingLeft: '10px',
  fontFamily: 'monospace',
  paddingRight: '20px',
  fontSize: '14px',
  backgroundColor: '#FFF',
};
const sqlStyle = {
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  userSelect: 'auto',
};
const secondLineStyle = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  fontSize: '13px',
  color: '#888888',
};
const timestampStyle = {
  alignSelf: 'flex-start',
};
const rowsAffectedStyle = {
  alignSelf: 'flex-end',
};
const errorMessageStyle = {
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  userSelect: 'auto',
  fontSize: '13px',
  color: '#888888',
};

export default class QueryHistoryEntry extends React.Component {
  formatDate(date) {
    return (moment(date).format('MMM D YYYY [–] HH:mm:ss'));
  }

  render() {
    return (
      <div style={this.queryEntryBackgroundColor()}>
        <div style={sqlStyle}>
          {this.props.historyEntry.query}
        </div>
        <div style={secondLineStyle}>
          <div style={timestampStyle}>
            {this.formatDate(this.props.historyEntry.start_time)} /
            total time: {this.props.historyEntry.total_time}
          </div>
          <div style={rowsAffectedStyle}>
            {this.props.historyEntry.row_affected} rows affected
          </div>
        </div>
        <div style={errorMessageStyle}>
          {this.props.historyEntry.message}
        </div>
      </div>
    );
  }

  queryEntryBackgroundColor() {
    if (!this.props.historyEntry.status) {
      return update(outerDivStyle, {$merge: {backgroundColor: '#F7D0D5'}});
    }
    return outerDivStyle;
  }
}

QueryHistoryEntry.propTypes = {
  historyEntry: React.PropTypes.shape({
    query: React.PropTypes.string,
    start_time: React.PropTypes.instanceOf(Date),
    status: React.PropTypes.bool,
    total_time: React.PropTypes.string,
    row_affected: React.PropTypes.int,
    message: React.PropTypes.string,
  }),
};