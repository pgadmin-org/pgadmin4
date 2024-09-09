/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import { isModeSupportedByField } from '../common';
import { FIELD_OPTIONS, booleanEvaluator } from './common';


const COMMON_OPTIONS = '__common';
const _optionEvaluators = { };


export function registerOptionEvaluator(option, evaluator, defaultVal, types) {
  types = types || [COMMON_OPTIONS];
  evaluator = evaluator || booleanEvaluator;
  defaultVal = _.isUndefined(defaultVal) ? false : defaultVal;

  types.forEach((type) => {
    const evaluators = _optionEvaluators[type] =
      (_optionEvaluators[type] || []);

    evaluators.push([option, evaluator, defaultVal]);
  });
}

export function evaluateFieldOption({
  option, schema, value, viewHelperProps, field, options, parentOptions,
}) {
  if (option && option in _optionEvaluators) {
    const evaluators = _optionEvaluators[option];
    evaluators?.forEach(([option, evaluator, defaultVal]) => {
      options[option] = evaluator({
        schema, field, option, value, viewHelperProps, options, defaultVal,
        parentOptions
      });
    });
  }
}

export function evaluateFieldOptions({
  schema, value, viewHelperProps, field, options={}, parentOptions=null
}) {
  evaluateFieldOption({
    option: COMMON_OPTIONS, schema, value, viewHelperProps, field, options,
    parentOptions
  });
  evaluateFieldOption({
    option: field.type, schema, value, viewHelperProps, field, options,
    parentOptions
  });
}

export function schemaOptionsEvalulator({
  schema, data, accessPath=[], viewHelperProps, options, parentOptions=null,
  inGrid=false
}) {
  schema?.fields?.forEach((field) => {
    // We could have multiple entries of same `field.id` for each mode, hence -
    // we should process the options only if the current field is support for
    // the given mode.
    if (!isModeSupportedByField(field, viewHelperProps)) return;

    switch (field.type) {
    case 'nested-tab':
    case 'nested-fieldset':
    case 'inline-groups':
      {
        if (!field.schema) return;
        if (!field.schema.top) field.schema.top = schema.top || schema;

        const path = field.id ? [...accessPath, field.id] : accessPath;

        schemaOptionsEvalulator({
          schema: field.schema, data, path, viewHelperProps, options,
          parentOptions
        });
      }

      break;

    case 'collection':
      {
        if (!field.schema) return;
        if (!field.schema.top) field.schema.top = schema.top || schema;

        const fieldPath = [...accessPath, field.id];
        const fieldOptionsPath = [...fieldPath, FIELD_OPTIONS];
        const fieldOptions = _.get(options, fieldOptionsPath, {});
        const rows = data[field.id];

        evaluateFieldOptions({
          schema, value: data, viewHelperProps, field,
          options: fieldOptions, parentOptions,
        });

        _.set(options, fieldOptionsPath, fieldOptions);

        const rowIndexes = [FIELD_OPTIONS];

        rows?.forEach((row, idx) => {
          const schemaPath = [...fieldPath, idx];
          const schemaOptions = _.get(options, schemaPath, {});

          _.set(options, schemaPath, schemaOptions);

          schemaOptionsEvalulator({
            schema: field.schema, data: row, accessPath: [],
            viewHelperProps, options: schemaOptions,
            parentOptions: fieldOptions, inGrid: true
          });

          const rowPath = [...schemaPath, FIELD_OPTIONS];
          const rowOptions = _.get(options, rowPath, {});
          _.set(options, rowPath, rowOptions);

          evaluateFieldOption({
            option: 'row', schema: field.schema, value: row, viewHelperProps,
            field, options: rowOptions, parentOptions: fieldOptions
          });

          rowIndexes.push(idx);
        });

      }
      break;

    default:
      {
        const fieldPath = [...accessPath, field.id];
        const fieldOptionsPath = [...fieldPath, FIELD_OPTIONS];
        const fieldOptions = _.get(options, fieldOptionsPath, {});

        evaluateFieldOptions({
          schema, value: data, viewHelperProps, field, options: fieldOptions,
          parentOptions,
        });

        if (inGrid) {
          evaluateFieldOption({
            option: 'cell', schema, value: data, viewHelperProps, field,
            options: fieldOptions, parentOptions,
          });
        }

        _.set(options, fieldOptionsPath, fieldOptions);
      }
      break;
    }
  });
}
