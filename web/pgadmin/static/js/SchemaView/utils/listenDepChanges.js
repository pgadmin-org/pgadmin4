/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect } from 'react';
import _ from 'lodash';

import { evalFunc } from 'sources/utils';


export const listenDepChanges = (
  accessPath, field, schemaState, setRefreshKey
) => {
  const deps = field?.deps ? (evalFunc(null, field.deps) || []) : null;
  const parentPath = accessPath ? [...accessPath] : [];

  // Remove the last element.
  if (field?.id && field.id === parentPath[parentPath.length - 1]) {
    parentPath.pop();
  }

  useEffect(() => {
    if (!schemaState || !field) return;

    if(field.depChange || field.deferredDepChange) {
      schemaState.addDepListener(
        accessPath, accessPath,
        field.depChange, field.deferredDepChange
      );
    }

    if (field.deps) {
      deps.forEach((dep) => {
        // When dep is a string then prepend the complete accessPath,
        // but - when dep is an array, then the intention is to provide
        // the exact accesspath.
        let source = _.isArray(dep) ? dep : parentPath.concat(dep);

        if (field.depChange || field.deferredDepChange) {
          schemaState.addDepListener(
            source, accessPath, field.depChange, field.deferredDepChange
          );
        }

        if (setRefreshKey)
          schemaState.subscribe(
            source, () => setRefreshKey(Date.now()), 'value'
          );
      });
    }

    return () => {
      // Cleanup the listeners when unmounting.
      schemaState.removeDepListener(accessPath);
    };
  }, []);

  return deps?.map((dep) => schemaState.value(
    _.isArray(dep) ? dep : parentPath.concat(dep)
  ));
};
