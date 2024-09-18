/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect } from 'react';

const convertKeysToString = (arr) => (arr||[]).map((key) => String(key));
const isPathEqual = (path1, path2) => (
  Array.isArray(path1) &&
  Array.isArray(path2) &&
  JSON.stringify(convertKeysToString(path1)) ===
  JSON.stringify(convertKeysToString(path2))
);

export const useFieldError = (path, schemaState, subscriberManager) => {

  useEffect(() => {
    if (!schemaState || !subscriberManager?.current) return;

    const checkPathError = (newState, prevState) => {
      // We don't need to redraw the control on message change.
      if ((
        !isPathEqual(prevState.name, path) &&
        !isPathEqual(newState.name, path)
      ) || (
        isPathEqual(prevState.name, newState.name) &&
        prevState.message == newState.message
      )) return;

      subscriberManager.current?.signal();
    };

    return subscriberManager.current?.add(
      schemaState,  ['errors'], 'states', checkPathError
    );
  });

  const errors = schemaState?.errors || {};
  const error = (
    Array.isArray(errors.name) && isPathEqual(errors.name, path)
  ) ? errors.message : null;

  return {hasError: !_.isNull(error), error};
};
