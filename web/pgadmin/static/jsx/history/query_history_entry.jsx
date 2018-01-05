//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import Shapes from '../react_shapes';
import moment from 'moment';
import PropTypes from 'prop-types';

export default class QueryHistoryEntry extends React.Component {
  formatDate(date) {
    return (moment(date).format('HH:mm:ss'));
  }

  renderWithClasses(outerDivStyle) {
    return (
      <div className={'entry ' + outerDivStyle}>
        <div className='query'>
          {this.props.historyEntry.query}
        </div>
        <div className='other-info'>
          <div className='timestamp'>
            {this.formatDate(this.props.historyEntry.start_time)}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.hasError()) {
      if (this.props.isSelected) {
        return this.renderWithClasses('error selected');
      } else {
        return this.renderWithClasses('error');
      }
    } else {
      if (this.props.isSelected) {
        return this.renderWithClasses('selected');
      } else {
        return this.renderWithClasses('');
      }
    }
  }

  hasError() {
    return !this.props.historyEntry.status;
  }
}

QueryHistoryEntry.propTypes = {
  historyEntry: Shapes.historyDetail,
  isSelected: PropTypes.bool,
};
