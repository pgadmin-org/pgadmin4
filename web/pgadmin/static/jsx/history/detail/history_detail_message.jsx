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
import NonSelectableElementStyle from '../../styles/non_selectable';
import MessageHeaderStyle from '../../styles/header_label';

const containerStyle = {
  flex: '2 2 0%',
  flexDirection: 'column',
  display: 'flex',
};

const messageContainerStyle = {
  flex: '0 1 auto',
  overflow: 'auto',
  position: 'relative',
  height: '100%',
};

const errorMessageStyle = {
  border: '0',
  paddingLeft: '0',
  backgroundColor: '#ffffff',
  fontSize: '13px',
  position: 'absolute',
};

const messageLabelStyle = _.extend({flex: '0 0 auto'},
  MessageHeaderStyle,
  NonSelectableElementStyle);

export default class HistoryDetailMessage extends React.Component {

  render() {
    return (
      <div style={containerStyle}>
        <div style={messageLabelStyle}>
          Messages
        </div>
        <div style={messageContainerStyle}>
          <pre style={errorMessageStyle}>
              {this.props.historyEntry.message}
          </pre>
        </div>
      </div>);
  }
}

HistoryDetailMessage.propTypes = {
  historyEntry: Shapes.historyDetail,
};