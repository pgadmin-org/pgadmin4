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


export const listenDepChanges = (accessPath, field, visible, schemaState) => {

  useEffect(() => {
    if (!visible || !schemaState || !field) return;

    if(field.depChange || field.deferredDepChange) {
      schemaState.addDepListener(
        accessPath, accessPath,
        field.depChange, field.deferredDepChange
      );
    }

    if (field.deps) {
      const parentPath = [...accessPath];

      // Remove the last element.
      if (field.id && field.id === parentPath[parentPath.length - 1]) {
        parentPath.pop();
      }

      (evalFunc(null, field.deps) || []).forEach((dep) => {

        // When dep is a string then prepend the complete accessPath,
        // but - when dep is an array, then the intention is to provide
        // the exact accesspath.
        let source = _.isArray(dep) ? dep : parentPath.concat(dep);

        if(field.depChange || field.deferredDepChange) {
          schemaState.addDepListener(
            source, accessPath, field.depChange, field.deferredDepChange
          );
        }
      });
    }

    return () => {
      // Cleanup the listeners when unmounting.
      schemaState.removeDepListener(accessPath);
    };
  }, []);

};
