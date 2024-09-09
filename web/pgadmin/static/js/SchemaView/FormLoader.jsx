/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect, useState, useMemo } from 'react';

import Loader from 'sources/components/Loader';

import { SchemaStateContext } from './SchemaState';


export const FormLoader = () => {
  const [key, setKey] = useState(0);
  const schemaState = useContext(SchemaStateContext);
  const message = schemaState.loadingMessage;

  useEffect(() => {
    // Refresh on message changes.
    return schemaState.subscribe(
      ['message'], () => setKey(Date.now()), 'states'
    );
  }, [key]);

  return useMemo(() => <Loader message={message}/>, [message, key]);
};
