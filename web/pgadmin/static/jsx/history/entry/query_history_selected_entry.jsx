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
import {selectedFontStyle, selectedOuterStyle} from '../../styles/history_entry_styles';

export default class QueryHistorySelectedEntry extends QueryHistoryVanillaEntry {
  componentWillMount() {
    this.setState({
      outerDivStyle: update(this.state.outerDivStyle, {$merge: selectedOuterStyle}),
      secondLineStyle: update(this.state.secondLineStyle, {$merge: selectedFontStyle}),
    });
  }
}