/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The DataGridView component is based on react-table component */

import { DataGridFormHeader } from './formHeader.jsx';
import { DataGridHeader } from './header';
import { getMappedCell } from './mappedCell';
import DataGridView from './grid';


export default DataGridView;

export {
  DataGridFormHeader,
  DataGridHeader,
  getMappedCell,
};
