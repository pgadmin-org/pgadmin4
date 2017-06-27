//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import '../../../vendor/codemirror/mode/sql/sql';

import CodeMirror from './code_mirror';
import Shapes from '../../react_shapes';

export default class HistoryDetailQuery extends React.Component {
  render() {
    return (
      <div id="history-detail-query">
        <CodeMirror
          value={this.props.historyEntry.query}
          options={{
            mode: 'text/x-pgsql',
            readOnly: true,
          }}
        />
      </div>);
  }
}

HistoryDetailQuery.propTypes = {
  historyEntry: Shapes.historyDetail,
};
