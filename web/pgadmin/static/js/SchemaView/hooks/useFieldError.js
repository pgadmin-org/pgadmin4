/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect } from 'react';


export const useFieldError = (path, schemaState, subscriberManager) => {

  useEffect(() => {
    if (!schemaState || !subscriberManager?.current) return;

    const checkPathError = (newState, prevState) => {
      if (prevState.name !== path && newState.name !== path) return;
      // We don't need to redraw the control on message change.
      if (prevState.name === newState.name) return;

      subscriberManager.current?.signal();
    };

    return subscriberManager.current?.add(
      schemaState,  ['errors'], 'states', checkPathError
    );
  });

  const errors = schemaState?.errors || {};
  const error = errors.name === path ? errors.message : null;

  return {hasError: !_.isNull(error), error};
};
