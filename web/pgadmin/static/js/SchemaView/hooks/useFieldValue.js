/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect } from 'react';


export const useFieldValue = (
  path, schemaState, key, setRefreshKey
) => {
  useEffect(() => {
    if (!schemaState || !setRefreshKey) return;

    return schemaState.subscribe(
      path, () => setRefreshKey({id: Date.now()}), 'value'
    );
  }, [key]);

  return schemaState?.value(path);
};
