/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import SplitPane from 'react-split-pane';
import QueryHistoryEntry from './query_history_entry';
import QueryHistoryDetail from './query_history_detail';
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
  }

  componentWillMount() {
    this.resetCurrentHistoryDetail(this.props.historyCollection.historyList);
    this.props.historyCollection.onChange((historyList) => {
      this.resetCurrentHistoryDetail(historyList);
    });

    this.props.historyCollection.onReset((historyList) => {
      this.clearCurrentHistoryDetail(historyList);
    });
  }

  componentDidMount() {
    this.resetCurrentHistoryDetail(this.state.history);
  }

  getCurrentHistoryDetail() {
    return this.state.currentHistoryDetail;
  }

  setCurrentHistoryDetail(index, historyList) {
    this.setState({
      history: historyList,
      currentHistoryDetail: this.retrieveOrderedHistory().value()[index],
      selectedEntry: index,
    });
  }

  resetCurrentHistoryDetail(historyList) {
    this.setCurrentHistoryDetail(0, historyList);
  }

  clearCurrentHistoryDetail(historyList) {
    this.setState({
      history: historyList,
      currentHistoryDetail: undefined,
      selectedEntry: 0,
    });
  }

  retrieveOrderedHistory() {
    return _.chain(this.state.history)
      .sortBy(historyEntry => historyEntry.start_time)
      .reverse();
  }

  onClickHandler(index) {
    this.setCurrentHistoryDetail(index, this.state.history);
  }

  render() {
    return (
      <SplitPane defaultSize="50%" split="vertical" pane1Style={queryEntryListDivStyle}
                 pane2Style={queryDetailDivStyle}>
        <div id='query_list' className="query-history">
          <ul>
            {this.retrieveOrderedHistory()
              .map((entry, index) =>
                <li key={index} className='list-item' onClick={this.onClickHandler.bind(this, index)}>
                  <QueryHistoryEntry historyEntry={entry} isSelected={index == this.state.selectedEntry}/>
                </li>)
              .value()
            }
          </ul>
        </div>
        <QueryHistoryDetail historyEntry={this.getCurrentHistoryDetail()}/>
      </SplitPane>);
  }
}

QueryHistory.propTypes = {
  historyCollection: Shapes.historyCollectionClass.isRequired,
};