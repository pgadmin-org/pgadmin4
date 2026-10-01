/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {
  booleanEvaluator, registerOptionEvaluator
} from '../../options';

import Feature from './feature';
import { SEARCH_STATE_PATH } from '../SearchBox';


registerOptionEvaluator('canSearch', booleanEvaluator, false, ['collection']);


export default class GlobalSearch extends Feature {
  constructor() {
    super();
  }

  tableState({options}) {
    if (!options.canSearch) return { globalFilter: '' };

    return {
      globalFilter: this.schemaState.state(
        this.accessPath.concat(SEARCH_STATE_PATH)
      ),
    };
  }
}
