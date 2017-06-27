/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import moment from 'moment';
import Shapes from '../../react_shapes';
import {plainOuterDivStyle, plainSecondLineStyle, sqlStyle, timestampStyle} from '../../styles/history_entry_styles';

export default class QueryHistoryVanillaEntry extends React.Component {
  formatDate(date) {
    return (moment(date).format('MMM D YYYY [–] HH:mm:ss'));
  }

  constructor(props) {
    super(props);
    this.state = {
      outerDivStyle: plainOuterDivStyle,
      secondLineStyle: plainSecondLineStyle,
    };
  }

  render() {
    return (
      <div style={this.state.outerDivStyle}>
        <div style={sqlStyle}>
          {this.props.historyEntry.query}
        </div>
        <div style={this.state.secondLineStyle}>
          <div style={timestampStyle}>
            {this.formatDate(this.props.historyEntry.start_time)}
          </div>
        </div>
      </div>
    );
  }
}

QueryHistoryVanillaEntry.propTypes = {
  historyEntry: Shapes.historyDetail,
  isSelected: React.PropTypes.bool,
};