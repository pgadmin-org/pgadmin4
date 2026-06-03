/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect } from 'react';


export const useFieldValue = (path, schemaState, subscriberManager) => {

  useEffect(() => {
    if (!schemaState || !subscriberManager?.current) return;

    return subscriberManager.current?.add(schemaState, path, 'value');
    // Pin deps so the subscription is only re-added when something
    // observable changes. Path is compared by reference — callers that
    // want stability across renders must memoize it.
  }, [path, schemaState, subscriberManager]);

  return schemaState?.value(path);
};
