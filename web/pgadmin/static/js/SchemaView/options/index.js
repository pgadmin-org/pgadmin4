/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { evalFunc } from 'sources/utils';
import {
  booleanEvaluator,
  canAddOrDelete,
  evalIfNotDisabled,
  evalInNonPropertyMode,
  FIELD_OPTIONS
} from './common';
import {
  isFieldSupportedByPgVersion,
  isModeSupportedByField
} from '../common';
import {
  evaluateFieldOptions,
  evaluateFieldsOption, 
  registerOptionEvaluator,
  schemaOptionsEvalulator,
} from './registry';

export {
  FIELD_OPTIONS,
  booleanEvaluator,
  canAddOrDelete,
  evaluateFieldOptions,
  evaluateFieldsOption, 
  evalIfNotDisabled,
  registerOptionEvaluator,
  schemaOptionsEvalulator,
};

const VISIBLE = 'visible';

// Default evaluators
// 1. disabled
// 2. visible (It also checks for the supported mode)
// 3. readonly

registerOptionEvaluator('disabled');
registerOptionEvaluator(
  VISIBLE,
  // Evaluator
  ({schema, field, value, viewHelperProps}) => (
    isModeSupportedByField(field, viewHelperProps) 
    && isFieldSupportedByPgVersion(field, viewHelperProps) 
    && (
      _.isUndefined(field[VISIBLE]) ?  true :
        Boolean(evalFunc(schema, field[VISIBLE], value))
    )),
);

registerOptionEvaluator(
  'readonly',
  // Evaluator
  ({viewHelperProps, ...args}) => (
    viewHelperProps.inCatalog ||
    viewHelperProps.mode === 'properties' ||
    booleanEvaluator({viewHelperProps, ...args })
  ),
  // Default value
  false 
);


// Collection evaluators
// 1. canAdd
// 2. canEdit
// 3. canAddRow
// 4. expandEditOnAdd
// 5. addOnTop
// 6. canSearch
registerOptionEvaluator(
  'canAdd',
  // Evaluator
  canAddOrDelete,
  // Default value
  true,
  ['collection']
);

registerOptionEvaluator(
  'canEdit',
  // Evaluator
  ({viewHelperProps, options, ...args}) => (
    !viewHelperProps.inCatalog &&
    viewHelperProps.mode !== 'properties' &&
    !options.disabled &&
    booleanEvaluator({viewHelperProps, options, ...args })
  ),
  // Default value
  false,
  ['collection']
);

registerOptionEvaluator(
  'canAddRow',
  // Evaluator
  ({options, ...args}) => (
    options.canAdd &&
    booleanEvaluator({options, ...args })
  ),
  // Default value
  true,
  ['collection']
);

registerOptionEvaluator(
  'expandEditOnAdd',
  // Evaluator
  evalInNonPropertyMode,
  // Default value
  false,
  ['collection']
);

registerOptionEvaluator(
  'addOnTop',
  // Evaluator
  evalInNonPropertyMode,
  // Default value
  false,
  ['collection']
);

registerOptionEvaluator(
  'canSearch',
  // Evaluator
  evalInNonPropertyMode,
  // Default value
  false,
  ['collection']
);

// Row evaluators
// 1. canEditRow
registerOptionEvaluator(
  'canEditRow',
  // Evaluator
  evalInNonPropertyMode,
  // Default value
  true,
  ['row']
);

// Grid cell evaluatiors
// 1. editable
registerOptionEvaluator(
  'editable',
  // Evaluator
  ({viewHelperProps, ...args}) => (
    !viewHelperProps.inCatalog &&
    viewHelperProps.mode !== 'properties' &&
    booleanEvaluator({viewHelperProps, ...args })
  ),
  // Default value
  true,
  ['cell']
);
