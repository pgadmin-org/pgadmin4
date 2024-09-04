/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect } from 'react';


export const useFieldError = (
  path, schemaState, key, setRefreshKey
) => {
  useEffect(() => {
    if (!schemaState || !setRefreshKey) return;

    const checkPathError = (newState, prevState) => {
      if (prevState.name !== path && newState.name !== path) return;
      // We don't need to redraw the control on message change.
      if (prevState.name === newState.name) return;

      setRefreshKey({id: Date.now()});
    };

    return schemaState.subscribe(['errors'], checkPathError, 'states');
  }, [key, schemaState?._id]);

  const errors = schemaState?.errors || {};
  const error = errors.name === path ? errors.message : null;

  return {hasError: !_.isNull(error), error};
};
