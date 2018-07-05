/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* eslint-disable react/no-find-dom-node */

import React from 'react';
import ReactDOM from 'react-dom';
import SplitPane from 'react-split-pane';
import _ from 'underscore';

import QueryHistoryDetail from './query_history_detail';
import QueryHistoryEntries from './query_history_entries';
import Shapes from '../react_shapes';

const queryEntryListDivStyle = {
  overflowY: 'auto',
};
const queryDetailDivStyle = {
  display: 'flex',
};

export default class QueryHistory extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      history: [],
      selectedEntry: 0,
    };

    this.selectHistoryEntry = this.selectHistoryEntry.bind(this);
  }

  componentWillMount() {
    this.setHistory(this.props.historyCollection.historyList);
    this.selectHistoryEntry(0);

    this.props.historyCollection.onChange((historyList) => {
      this.setHistory(historyList);
      this.selectHistoryEntry(0);
    });

    this.props.historyCollection.onReset(() => {
      this.setState({
        history: [],
        currentHistoryDetail: undefined,
        selectedEntry: 0,
      });
    });
  }

  componentDidMount() {
    this.selectHistoryEntry(0);
  }

  refocus() {
    if (this.state.history.length > 0) {
      setTimeout(() => this.retrieveSelectedQuery().parentElement.focus(), 0);
    }
  }

  retrieveSelectedQuery() {
    return ReactDOM.findDOMNode(this)
      .getElementsByClassName('selected')[0];
  }

  setHistory(historyList) {
    this.setState({history: this.orderedHistory(historyList)});
  }

  selectHistoryEntry(index) {
    this.setState({
      currentHistoryDetail: this.state.history[index],
      selectedEntry: index,
    });
  }

  orderedHistory(historyList) {
    return _.chain(historyList)
      .sortBy(historyEntry => historyEntry.start_time)
      .reverse()
      .value();
  }

  render() {
    return (
      <SplitPane defaultSize='50%' split='vertical' pane1Style={queryEntryListDivStyle}
        pane2Style={queryDetailDivStyle}>
        <QueryHistoryEntries historyEntries={this.state.history}
          selectedEntry={this.state.selectedEntry}
          onSelectEntry={this.selectHistoryEntry}
        />
        <QueryHistoryDetail historyEntry={this.state.currentHistoryDetail}
            sqlEditorPref={this.props.sqlEditorPref}
        />
      </SplitPane>);
  }
}

QueryHistory.propTypes = {
  historyCollection: Shapes.historyCollectionClass.isRequired,
  sqlEditorPref: Shapes.sqlEditorPrefObj,
};

export {
  QueryHistory,
};
