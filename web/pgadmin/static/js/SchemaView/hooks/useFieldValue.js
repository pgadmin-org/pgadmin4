/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect } from 'react';


export const useFieldValue = (path, schemaState, subscriberManager) => {

  useEffect(() => {
    if (!schemaState || !subscriberManager?.current) return;

    return subscriberManager.current?.add(schemaState, path, 'value');
  });

  return schemaState?.value(path);
};
