/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {sprintf} from 'sources/utils';
import _ from 'lodash';
import pgAdmin from 'sources/pgadmin';

/* Validate value for min max range */
export function minMaxValidator(label, value, minValue, maxValue) {
  if((_.isUndefined(value) || _.isNull(value) || String(value) === ''))
    return null;
  if (!_.isUndefined(minValue) && value < minValue) {
    return sprintf(pgAdmin.Browser.messages.MUST_GR_EQ, label, minValue);
  } else if (!_.isUndefined(maxValue) && value > maxValue) {
    return sprintf(pgAdmin.Browser.messages.MUST_LESS_EQ, label, maxValue);
  }
  return null;
}

/* Validate value to check if it is a number */
export function numberValidator(label, value) {
  if((_.isUndefined(value) || _.isNull(value) || String(value) === ''))
    return null;
  if (!/^-?\d+(\.?\d*)$/.test(value)) {
    return sprintf(pgAdmin.Browser.messages.MUST_BE_NUM, label);
  }
  return null;
}

/* Validate value to check if it is an integer */
export function integerValidator(label, value) {
  if((_.isUndefined(value) || _.isNull(value) || String(value) === ''))
    return null;
  if (!/^-?\d*$/.test(value)) {
    return sprintf(pgAdmin.Browser.messages.MUST_BE_INT, label);
  }
  return null;
}

/* Validate value to check if it is empty */
export function emptyValidator(label, value) {
  if(isEmptyString(value)) {
    return sprintf(pgAdmin.Browser.messages.CANNOT_BE_EMPTY, label);
  }
  return null;
}

export function isEmptyString(value) {
  return _.isUndefined(value) || _.isNull(value) || String(value).trim() === '' || String(value).replace(/(^\s+)|(\s+$)/g, '') == '';
}

/* Validate rows to check for any duplicate rows based on uniqueCols-columns array */
export function checkUniqueCol(rows, uniqueCols) {
  if(uniqueCols) {
    for(const [i, row] of rows.entries()) {
      for(const checkRow of rows.slice(0, i)) {
        if(_.isEqual(_.pick(checkRow, uniqueCols), _.pick(row, uniqueCols))) return i;
      }
    }
  }
  return -1;
}
