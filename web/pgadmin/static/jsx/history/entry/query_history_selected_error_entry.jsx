/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import QueryHistoryVanillaEntry from './query_history_vanilla_entry';
import update from 'immutability-helper';
import {selectedFontStyle, selectedOuterStyle, selectedErrorBgColor} from '../../styles/history_entry_styles';

export default class QueryHistorySelectedErrorEntry extends QueryHistoryVanillaEntry {
  componentWillMount() {
    let selectedErrorStyle = update(selectedOuterStyle, {$merge: selectedErrorBgColor});
    this.setState({
      outerDivStyle: update(this.state.outerDivStyle, {$merge: selectedErrorStyle}),
      secondLineStyle: update(this.state.secondLineStyle, {$merge: selectedFontStyle}),
    });
  }
}