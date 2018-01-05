//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';

export default class QueryHistoryEntryDateGroup extends React.Component {

  getDatePrefix() {
    let prefix = '';
    if (this.isDaysBefore(0)) {
      prefix = 'Today - ';
    } else if (this.isDaysBefore(1)) {
      prefix = 'Yesterday - ';
    }
    return prefix;
  }

  getDateFormatted(momentToFormat) {
    return momentToFormat.format(QueryHistoryEntryDateGroup.formatString);
  }

  getDateMoment() {
    return moment(this.props.date);
  }

  isDaysBefore(before) {
    return this.getDateFormatted(this.getDateMoment()) === this.getDateFormatted(moment().subtract(before, 'days'));
  }

  render() {
    return (<div className="date-label">{this.getDatePrefix()}{this.getDateFormatted(this.getDateMoment())}</div>);
  }
}

QueryHistoryEntryDateGroup.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
};

QueryHistoryEntryDateGroup.formatString = 'MMM DD YYYY';
