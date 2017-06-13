/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import QueryHistoryEntry from './query_history_entry';

const liStyle = {
  borderBottom: '1px solid #cccccc',
};

export default class QueryHistory extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      history: [],
    };
  }

  componentWillMount() {
    this.setState({history: this.props.historyCollection.historyList});
    this.props.historyCollection.onChange((historyList) => this.setState({history: historyList}));
  }

  render() {
    return <ul>
      {_.chain(this.state.history)
        .sortBy(historyEntry => historyEntry.start_time)
        .reverse()
        .map((entry, index) =>
        <li key={index} style={liStyle}>
          <QueryHistoryEntry historyEntry={entry}/>
        </li>)
        .value()
      }
    </ul>;
  }
}

QueryHistory.propTypes = {
  historyCollection: React.PropTypes.object.isRequired,
};