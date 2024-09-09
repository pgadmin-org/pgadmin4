/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import { evalFunc } from 'sources/utils';


export const FIELD_OPTIONS = '__fieldOptions';

export const booleanEvaluator = ({
  schema, field, option, value, viewHelperProps, options, defaultVal,
}) => (
  _.isUndefined(field?.[option]) ? defaultVal : 
    Boolean(evalFunc(schema, field[option], value, viewHelperProps, options))
);

export const evalIfNotDisabled = ({ options, ...params }) => (
  !options.disabled &&
  booleanEvaluator({ options, ...params })
);

export const canAddOrDelete = ({
  options, viewHelperProps, field, ...params
}) => (
  viewHelperProps?.mode != 'properties' &&
    !(field?.fixedRow) &&
    !options.disabled &&
    booleanEvaluator({ options, viewHelperProps, field, ...params })
);

export const evalInNonPropertyMode = ({ viewHelperProps, ...params }) => (
  viewHelperProps?.mode != 'properties' &&
  booleanEvaluator({ viewHelperProps, ...params })
);
