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
import _ from 'underscore';
import moment from 'moment';
import PropTypes from 'prop-types';

import QueryHistoryEntry from './query_history_entry';
import QueryHistoryEntryDateGroup from './query_history_entry_date_group';

const ARROWUP = 38;
const ARROWDOWN = 40;

export default class QueryHistoryEntries extends React.Component {

  constructor(props) {
    super(props);

    this.navigateUpAndDown = this.navigateUpAndDown.bind(this);
  }

  navigateUpAndDown(event) {
    let arrowKeys = [ARROWUP, ARROWDOWN];
    let key = event.keyCode || event.which;
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
        let nextEntry = this.props.selectedEntry + 1;
        this.props.onSelectEntry(nextEntry);

        if (this.isInvisible(this.getEntryFromList(nextEntry))) {
          this.getEntryFromList(nextEntry).scrollIntoView(false);
        }
      }
    } else if (this.isArrowUp(event)) {
      if (!this.isFirstEntry()) {
        let previousEntry = this.props.selectedEntry - 1;
        this.props.onSelectEntry(previousEntry);

        if (this.isInvisible(this.getEntryFromList(previousEntry))) {
          this.getEntryFromList(previousEntry).scrollIntoView(true);
        }
      }
    }
  }

  retrieveGroups() {
    const sortableKeyFormat = 'YYYY MM DD';
    const entriesGroupedByDate = _.groupBy(this.props.historyEntries, entry => moment(entry.start_time).format(sortableKeyFormat));

    const elements = this.sortDesc(entriesGroupedByDate).map((key, index) => {
      const groupElements = this.retrieveDateGroup(entriesGroupedByDate, key, index);
      const keyAsDate = moment(key, sortableKeyFormat).toDate();
      groupElements.unshift(
        <li key={'group-' + index}>
          <QueryHistoryEntryDateGroup date={keyAsDate}/>
        </li>);
      return groupElements;
    });

    return (
      <ul>
        {_.flatten(elements).map(element => element)}
      </ul>
    );
  }

  retrieveDateGroup(entriesGroupedByDate, key, parentIndex) {
    const startingEntryIndex = _.reduce(
      _.first(this.sortDesc(entriesGroupedByDate), parentIndex),
      (memo, key) => memo + entriesGroupedByDate[key].length, 0);

    return (
      entriesGroupedByDate[key].map((entry, index) =>
        <li key={`group-${parentIndex}-entry-${index}`}
          className='list-item'
          tabIndex={0}
          onClick={() => this.props.onSelectEntry(startingEntryIndex + index)}
          onKeyDown={this.navigateUpAndDown}>
          <QueryHistoryEntry
            historyEntry={entry}
            isSelected={(startingEntryIndex + index) === this.props.selectedEntry}/>
        </li>)
    );
  }

  sortDesc(entriesGroupedByDate) {
    return Object.keys(entriesGroupedByDate).sort().reverse();
  }

  isInvisible(element) {
    return this.isAbovePaneTop(element) || this.isBelowPaneBottom(element);
  }

  isArrowUp(event) {
    return (event.keyCode || event.which) === ARROWUP;
  }

  isArrowDown(event) {
    return (event.keyCode || event.which) === ARROWDOWN;
  }

  isFirstEntry() {
    return this.props.selectedEntry === 0;
  }

  isLastEntry() {
    return this.props.selectedEntry === this.props.historyEntries.length - 1;
  }

  isAbovePaneTop(element) {
    const paneElement = ReactDOM.findDOMNode(this).parentElement;
    return element.getBoundingClientRect().top < paneElement.getBoundingClientRect().top;
  }

  isBelowPaneBottom(element) {
    const paneElement = ReactDOM.findDOMNode(this).parentElement;
    return element.getBoundingClientRect().bottom > paneElement.getBoundingClientRect().bottom;
  }

  getEntryFromList(entryIndex) {
    return ReactDOM.findDOMNode(this).getElementsByClassName('entry')[entryIndex];
  }

  render() {
    return (
      <div id='query_list'
        className="query-history">
        {this.retrieveGroups()}
      </div>
    );
  }
}

QueryHistoryEntries.propTypes = {
  historyEntries: PropTypes.array.isRequired,
  selectedEntry: PropTypes.number.isRequired,
  onSelectEntry: PropTypes.func.isRequired,
};
