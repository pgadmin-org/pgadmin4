/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// The DataGridView component is feature support better extendability.

import { Feature, FeatureSet, register } from './feature';
import FixedRows from './fixedRows';
import Reorder from './reorder';
import ExpandedFormView from './expandabledFormView';
import DeletableRow from './deletable';
import GlobalSearch from './search';

register(FixedRows);
register(DeletableRow);
register(ExpandedFormView);
register(GlobalSearch);
register(Reorder);

export {
  Feature,
  FeatureSet,
  register
};
