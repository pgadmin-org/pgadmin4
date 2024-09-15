/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import { useEffect } from 'react';

import { booleanEvaluator } from '../options';


export const useFieldSchema = (
  field, accessPath, value, viewHelperProps, schemaState, subscriberManager
) => {

  useEffect(() => {
    if (!schemaState || !field || !subscriberManager?.current) return;

    // It already has 'id', 'options' is already evaluated.
    if (field.id)
      return subscriberManager.current?.add(schemaState, accessPath, 'options');

    // There are no dependencies.
    if (!_.isArray(field?.deps)) return;

    // Subscribe to all the dependents.
    const unsubscribers = field.deps.map((dep) => (
      subscriberManager.current?.add(
        schemaState,  accessPath.concat(dep), 'value'
      )
    ));

    return () => {
      unsubscribers.forEach(
        unsubscribe => subscriberManager.current?.remove(unsubscribe)
      );
    };
  });

  if (!field) return { visible: true };
  if (field.id) return schemaState?.options(accessPath);
  if (!field.schema) return { visible: true };

  value = value || {};

  return { 
    visible: booleanEvaluator({
      schema: field.schema, field, option: 'visible', value, viewHelperProps,
      defaultVal: true,
    }),
  };
};
