/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import { isModeSupportedByField } from 'sources/SchemaView/common';
import { getMappedCell } from '../mappedCell';


export function createGridColumns({schema, field, viewHelperProps}) {

  const columns = field.columns;
  const colunnFilterExp = _.isArray(columns) ?
    ((f) => (columns.indexOf(f.id) > -1)) : (() => true);
  const sortExp = _.isArray(columns) ?
    ((firstF, secondF) => (
      (columns.indexOf(firstF.id) < columns.indexOf(secondF.id)) ? -1 : 1
    ))  : (() => 0);
  const columnVisibility = {};

  const cols = schema.fields.filter(colunnFilterExp).sort(sortExp).map(
    (field) => {
      let widthParms = {};

      if(field.width) {
        widthParms.size = field.width;
        widthParms.minSize = field.width;
      } else {
        widthParms.size = 75;
        widthParms.minSize = 75;
      }

      if(field.minWidth) {
        widthParms.minSize = field.minWidth;
      }

      if(field.maxWidth) {
        widthParms.maxSize = field.maxWidth;
      }

      widthParms.enableResizing =
        _.isUndefined(field.enableResizing) ? true : Boolean(
          field.enableResizing
        );
      columnVisibility[field.id] = isModeSupportedByField(
        field, viewHelperProps
      );

      return {
        header: field.label||<>&nbsp;</>,
        accessorKey: field.id,
        field: field,
        enableResizing: true,
        enableSorting: false,
        ...widthParms,
        cell: getMappedCell({field}),
      };
    }
  );

  return [cols, columnVisibility];
}
