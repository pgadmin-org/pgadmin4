//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import Shapes from '../react_shapes';
import QueryHistoryErrorEntry from './entry/query_history_error_entry';
import QueryHistorySelectedErrorEntry from './entry/query_history_selected_error_entry';
import QueryHistorySelectedEntry from './entry/query_history_selected_entry';
import QueryHistoryVanillaEntry from './entry/query_history_vanilla_entry';

export default class QueryHistoryEntry extends React.Component {
  render() {
    if (this.hasError()) {
      if (this.props.isSelected) {
        return <QueryHistorySelectedErrorEntry {...this.props}/>;
      } else {
        return <QueryHistoryErrorEntry {...this.props}/>;
      }
    } else {
      if (this.props.isSelected) {
        return <QueryHistorySelectedEntry {...this.props}/>;
      } else {
        return <QueryHistoryVanillaEntry {...this.props}/>;
      }
    }
  }

  hasError() {
    return !this.props.historyEntry.status;
  }
}

QueryHistoryEntry.propTypes = {
  historyEntry: Shapes.historyDetail,
  isSelected: React.PropTypes.bool,
};