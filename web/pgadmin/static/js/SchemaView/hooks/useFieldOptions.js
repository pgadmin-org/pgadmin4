/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect } from 'react';


export const useFieldOptions = (
  path, schemaState, key, setRefreshKey
) => {
  useEffect(() => {
    if (!schemaState) return;

    return schemaState.subscribe(
      path, () => setRefreshKey?.({id: Date.now()}), 'options'
    );
  }, [key, schemaState?._id]);

  return schemaState?.options(path) || {visible: true};
};
