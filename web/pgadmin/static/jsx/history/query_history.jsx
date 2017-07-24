/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* eslint-disable react/no-find-dom-node */

import React from 'react';
import ReactDOM from 'react-dom';
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

const ARROWUP = 38;
const ARROWDOWN = 40;

export default class QueryHistory extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      history: [],
      selectedEntry: 0,
    };

    this.onKeyDownHandler = this.onKeyDownHandler.bind(this);
    this.navigateUpAndDown = this.navigateUpAndDown.bind(this);
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

  refocus() {
    if (this.state.history.length > 0) {
      this.retrieveSelectedQuery().parentElement.focus();
    }
  }

  retrieveSelectedQuery() {
    return ReactDOM.findDOMNode(this)
      .getElementsByClassName('selected')[0];
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

  isInvisible(element) {
    return this.isAbovePaneTop(element) || this.isBelowPaneBottom(element);
  }

  isBelowPaneBottom(element) {
    const paneElement = ReactDOM.findDOMNode(this).getElementsByClassName('Pane1')[0];
    return element.getBoundingClientRect().bottom > paneElement.getBoundingClientRect().bottom;
  }

  isAbovePaneTop(element) {
    const paneElement = ReactDOM.findDOMNode(this).getElementsByClassName('Pane1')[0];
    return element.getBoundingClientRect().top < paneElement.getBoundingClientRect().top;
  }

  navigateUpAndDown(event) {
    const arrowKeys = [ARROWUP, ARROWDOWN];
    const key = event.keyCode || event.which;
    if (arrowKeys.indexOf(key) > -1) {
      event.preventDefault();
      this.onKeyDownHandler(event);
      return false;
    }
    return true;
  }

  onKeyDownHandler(event) {
    if (this.isArrowDown(event)) {
      if (!this.isLastEntry()) {
        let nextEntry = this.state.selectedEntry + 1;
        this.setCurrentHistoryDetail(nextEntry, this.state.history);

        if (this.isInvisible(this.getEntryFromList(nextEntry))) {
          this.getEntryFromList(nextEntry).scrollIntoView(false);
        }
      }
    } else if (this.isArrowUp(event)) {
      if (!this.isFirstEntry()) {
        let previousEntry = this.state.selectedEntry - 1;
        this.setCurrentHistoryDetail(previousEntry, this.state.history);

        if (this.isInvisible(this.getEntryFromList(previousEntry))) {
          this.getEntryFromList(previousEntry).scrollIntoView(true);
        }
      }
    }
  }

  getEntryFromList(entryIndex) {
    return ReactDOM.findDOMNode(this).getElementsByClassName('entry')[entryIndex];
  }

  isFirstEntry() {
    return this.state.selectedEntry === 0;
  }

  isLastEntry() {
    return this.state.selectedEntry === this.state.history.length - 1;
  }

  isArrowUp(event) {
    return (event.keyCode || event.which) === ARROWUP;
  }

  isArrowDown(event) {
    return (event.keyCode || event.which) === ARROWDOWN;
  }

  render() {
    return (
      <SplitPane defaultSize='50%' split='vertical' pane1Style={queryEntryListDivStyle}
                 pane2Style={queryDetailDivStyle}>
        <div id='query_list'
             className='query-history'
             onKeyDown={this.navigateUpAndDown}
             tabIndex={-1}>
          <ul>
            {this.retrieveOrderedHistory()
              .map((entry, index) =>
                <li key={index} className='list-item'
                    onClick={this.onClickHandler.bind(this, index)}
                    tabIndex={-1}>
                  <QueryHistoryEntry
                    historyEntry={entry}
                    isSelected={index == this.state.selectedEntry}/>
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

export {
  QueryHistory,
};
