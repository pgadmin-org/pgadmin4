//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import 'codemirror/mode/sql/sql';

import CodeMirror from './code_mirror';
import Shapes from '../../react_shapes';
import clipboard from '../../../js/selection/clipboard';

export default class HistoryDetailQuery extends React.Component {

  constructor(props) {
    super(props);

    this.copyAllHandler = this.copyAllHandler.bind(this);
    this.state = {isCopied: false};
    this.timeout = undefined;
  }

  copyAllHandler() {
    clipboard.copyTextToClipboard(this.props.historyEntry.query);

    this.clearPreviousTimeout();

    this.setState({isCopied: true});
    this.timeout = setTimeout(() => {
      this.setState({isCopied: false});
    }, 1500);
  }

  clearPreviousTimeout() {
    if (this.timeout !== undefined) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }

  copyButtonText() {
    return this.state.isCopied ? 'Copied!' : 'Copy All';
  }

  copyButtonClass() {
    return this.state.isCopied ? 'was-copied' : 'copy-all';
  }

  render() {
    return (
      <div id="history-detail-query">
        <button className={this.copyButtonClass()}
                tabIndex={0}
                accessKey={'y'}
                onClick={this.copyAllHandler}>{this.copyButtonText()}</button>
        <CodeMirror
          value={this.props.historyEntry.query}
          options={{
            tabindex: -1,
            mode: 'text/x-pgsql',
            readOnly: true,
          }}
          sqlFontSize= {this.props.sqlEditorPref.sql_font_size}
        />
      </div>);
  }
}

HistoryDetailQuery.propTypes = {
  historyEntry: Shapes.historyDetail,
  sqlEditorPref: Shapes.sqlEditorPrefObj,
};
