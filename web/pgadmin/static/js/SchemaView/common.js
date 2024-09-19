/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


export function generateTimeBasedRandomNumberString() {
  return new Date().getTime() + '' +  Math.floor(Math.random() * 1000001);
}

export const isModeSupportedByField = (field, helperProps) => (
  !field.mode || field.mode.indexOf(helperProps.mode) > -1
);


/*
 * Compare the sessData with schema.origData.
 * schema.origData is set to incoming or default data
 */
export function isValueEqual(val1, val2) {
  let attrDefined = (
    !_.isUndefined(val1) && !_.isUndefined(val2) &&
    !_.isNull(val1) && !_.isNull(val2)
  );

  /*
   * 1. If the orig value was null and new one is empty string, then its a
   *    "no change".
   * 2. If the orig value and new value are of different datatype but of same
   *    value(numeric) "no change".
   * 3. If the orig value is undefined or null and new value is boolean false
   *    "no change".
   */
  return (
    _.isEqual(val1, val2) || (
      (val1 === null || _.isUndefined(val1)) && val2 === ''
    ) || (
      (val1 === null || _.isUndefined(val1)) &&
        typeof(val2) === 'boolean' && !val2
    ) || (
      attrDefined ? (
        !_.isObject(val1) && _.isEqual(val1.toString(), val2.toString())
      ) : false
    )
  );
}

/*
 * Compare two objects.
 */
export function isObjectEqual(val1, val2) {
  const allKeys = Array.from(
    new Set([...Object.keys(val1), ...Object.keys(val2)])
  );
  return !allKeys.some((k) => {
    return !isValueEqual(val1[k], val2[k]);
  });
}

export function getForQueryParams(data) {
  let retData = {...data};
  Object.keys(retData).forEach((key)=>{
    let value = retData[key];
    if(_.isObject(value) || _.isNull(value)) {
      retData[key] = JSON.stringify(value);
    }
  });
  return retData;
}

export function prepareData(val, createMode=false) {
  if(_.isPlainObject(val)) {
    _.forIn(val, function (el) {
      if (_.isObject(el)) {
        prepareData(el, createMode);
      }
    });
  } else if(_.isArray(val)) {
    val.forEach(function(el) {
      if (_.isPlainObject(el)) {
        /* The each row in collection need to have an id to identify them uniquely
        This helps in easily getting what has changed */
        /* Nested collection rows may or may not have idAttribute.
        So to decide whether row is new or not set, the cid starts with
        nn (not new) for existing rows. Newly added will start with 'c' (created)
        */
        el['cid'] = createMode ? _.uniqueId('c') : _.uniqueId('nn');
        prepareData(el, createMode);
      }
    });
  }
  return val;
}

export const flatternObject = (obj, base=[]) => Object.keys(obj).sort().reduce(
  (r, k) => {
    r = r.concat(k);
    const value = obj[k];
    if (_.isFunction(value)) return r;
    if (_.isArray(value)) return r.concat(...value);
    if (_.isPlainObject(value)) return flatternObject(value, r);
    return r.concat(value);
  }, base
);
