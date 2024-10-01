/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import diffArray from 'diff-arrays-of-objects';
import _ from 'lodash';

import gettext from 'sources/gettext';
import { memoizeFn } from 'sources/utils';
import {
  minMaxValidator, numberValidator, integerValidator, emptyValidator,
  checkUniqueCol, isEmptyString
} from 'sources/validators';

import BaseUISchema from '../base_schema.ui';
import { isModeSupportedByField, isObjectEqual, isValueEqual } from '../common';


export const SCHEMA_STATE_ACTIONS = {
  INIT: 'init',
  SET_VALUE: 'set_value',
  ADD_ROW: 'add_row',
  DELETE_ROW: 'delete_row',
  MOVE_ROW: 'move_row',
  RERENDER: 'rerender',
  CLEAR_DEFERRED_QUEUE: 'clear_deferred_queue',
  DEFERRED_DEPCHANGE: 'deferred_depchange',
  BULK_UPDATE: 'bulk_update',
};

// Remove cid key added by prepareData
const cleanCid = (coll, keepCid=false) => (
  (!coll || keepCid) ? coll : coll.map(
    (o) => _.pickBy(o, (v, k) => (k !== 'cid'))
  )
);


export function getCollectionDiffInEditMode(
  field, origVal, sessVal, keepCid, parseChanges
) {
  let change = {};

  const id = field.id;
  const collIdAttr = field.schema.idAttribute;
  const origColl = _.get(origVal, id) || [];
  const sessColl = _.get(sessVal, id) || [];
  /*
   * Use 'diffArray' package to get the array diff and extract the
   * info. 'cid' attribute is used to identify the rows uniquely.
   */
  const changeDiff = diffArray(
    origColl, sessColl || [], 'cid', { compareFunction: isObjectEqual }
  );

  if(changeDiff.added.length > 0) {
    change['added'] = cleanCid(changeDiff.added, keepCid);
  }

  if(changeDiff.removed.length > 0) {
    change['deleted'] = cleanCid(changeDiff.removed.map((row) => {
      // Deleted records must be from the original data, not the newly added.
      return _.find(_.get(origVal, field.id), ['cid', row.cid]);
    }), keepCid);
  }

  if(changeDiff.updated.length > 0) {
    /*
     * There is a change in collection. Parse further deep to figure
     * out the exact details.
     */
    let changed = [];

    for(const changedRow of changeDiff.updated) {
      const rowIndxSess = _.findIndex(
        _.get(sessVal, id), (row) => (row.cid === changedRow.cid)
      );
      const rowIndxOrig = _.findIndex(
        _.get(origVal, id), (row) => (row.cid==changedRow.cid)
      );
      const finalChangedRow = parseChanges(
        field.schema, _.get(origVal, [id, rowIndxOrig]),
        _.get(sessVal, [id, rowIndxSess])
      );

      if(_.isEmpty(finalChangedRow)) {
        continue;
      }

      /*
       * If the 'id' attribute value is present, then only changed keys
       * can be passed. Otherwise, passing all the keys is useful.
       */
      const idAttrValue = _.get(sessVal, [id, rowIndxSess, collIdAttr]);

      if(_.isUndefined(idAttrValue)) {
        changed.push({ ...changedRow, ...finalChangedRow });
      } else {
        changed.push({ [collIdAttr]: idAttrValue, ...finalChangedRow });
      }
    }

    if(changed.length > 0) {
      change['changed'] = cleanCid(changed, keepCid);
    }
  }

  return change;
}

export function getSchemaDataDiff(
  topSchema, initData, sessData, mode, keepCid,
  stringify=false, includeSkipChange=true
) {
  const isEditMode = mode === 'edit';

  // This will be executed recursively as data can be nested.
  let parseChanges = (schema, origVal, sessVal) => {
    let levelChanges = {};
    parseChanges.depth =
      _.isUndefined(parseChanges.depth) ? 0 : (parseChanges.depth + 1);

    /* The comparator and setter */
    const attrChanged = (id, change, force=false) => {
      if(isValueEqual(_.get(origVal, id), _.get(sessVal, id)) && !force) {
        return;
      }

      change = change || _.get(sessVal, id);

      if(stringify && (_.isArray(change) || _.isObject(change))) {
        change = JSON.stringify(change);
      }

      /*
       * Null values are not passed in URL params, pass it as an empty string.
       * Nested values does not need this.
       */
      if(_.isNull(change) && parseChanges.depth === 0) {
        change = '';
      }

      levelChanges[id] = change;
    };

    schema.fields.forEach((field) => {
      // Never include data from the field in the changes, marked as
      // 'excluded'.
      if (field.exclude) return;
      /*
       * If skipChange is true, then field will not be considered for changed
       * data. This is helpful when 'Save' or 'Reset' should not be enabled on
       * this field change alone. No change in other behaviour.
       */
      if(field.skipChange && !includeSkipChange) return;

      /*
       * At this point the schema assignments like top may not have been done,
       * so - check if mode is supported by this field, or not.
       */
      if (!isModeSupportedByField(field, {mode})) return;

      if(
        typeof(field.type) === 'string' && field.type.startsWith('nested-')
      ) {
        /*
         * Even if its nested, state is on same hierarchical level.
         * Find the changes and merge.
         */
        levelChanges = {
          ...levelChanges,
          ...parseChanges(field.schema, origVal, sessVal),
        };
      } else if(isEditMode && !_.isEqual(
        _.get(origVal, field.id), _.get(sessVal, field.id)
      )) {
        /*
         * Check for changes only if in edit mode, otherwise - everything can
         * go through comparator
         */
        if(field.type === 'collection') {
          const change = getCollectionDiffInEditMode(
            field, origVal, sessVal, keepCid, parseChanges
          );

          if(Object.keys(change).length > 0) {
            attrChanged(field.id, change, true);
          }
        } else {
          attrChanged(field.id);
        }
      } else if(!isEditMode) {
        if(field.type === 'collection') {
          const origColl = _.get(origVal, field.id) || [];
          const sessColl = _.get(sessVal, field.id) || [];

          let changeDiff = diffArray(
            origColl, sessColl, 'cid', {compareFunction: isObjectEqual}
          );

          // Check the updated changes,when:
          // 1. These are the fixed rows.
          // 2. 'canReorder' flag is set to true.
          if((
            !_.isUndefined(field.fixedRows) && changeDiff.updated.length > 0
          ) || (
            _.isUndefined(field.fixedRows) && (
              changeDiff.added.length > 0 || changeDiff.removed.length > 0 ||
              changeDiff.updated.length > 0
            )
          ) || (
            field.canReorder && _.differenceBy(origColl, sessColl, 'cid')
          )) {
            attrChanged(
              field.id, cleanCid(_.get(sessVal, field.id), keepCid), true
            );
            return;
          }

          if(field.canReorder) {
            changeDiff = diffArray(origColl, sessColl);

            if(changeDiff.updated.length > 0) {
              attrChanged(
                field.id, cleanCid(_.get(sessVal, field.id), keepCid), true
              );
            }
          }
        } else {
          attrChanged(field.id);
        }
      }
    });

    parseChanges.depth--;
    return levelChanges;
  };

  let res =  parseChanges(topSchema, initData, sessData);

  return res;
}

export function validateCollectionSchema(
  field, sessData, accessPath, setError
) {
  const rows = sessData[field.id] || [];
  const currPath = accessPath.concat(field.id);

  // Loop through data.
  for(const [rownum, row] of rows.entries()) {
    if(validateSchema(
      field.schema, row, setError, currPath.concat(rownum), field.label
    )) {
      return true;
    }
  }

  // Validate duplicate rows.
  const dupInd = checkUniqueCol(rows, field.uniqueCol);

  if(dupInd > 0) {
    const uniqueColNames = _.filter(
      field.schema.fields, (uf) => field.uniqueCol.indexOf(uf.id) > -1
    ).map((uf)=>uf.label).join(', ');

    if (isEmptyString(field.label)) {
      setError(currPath, gettext('%s must be unique.', uniqueColNames));
    } else {
      setError(
        currPath,
        gettext('%s in %s must be unique.', uniqueColNames, field.label)
      );
    }
    return true;
  }

  return false;
}

export function validateSchema(
  schema, sessData, setError, accessPath=[], collLabel=null
) {
  sessData = sessData || {};

  for(const field of schema.fields) {
    // Skip id validation
    if(schema.idAttribute === field.id) {
      continue;
    }
    // If the field is has nested schema, then validate the child schema.
    if(field.schema && (field.schema instanceof BaseUISchema)) {
      if (!field.schema.top) field.schema.top = schema;

      // A collection is an array.
      if(field.type === 'collection') {
        if (validateCollectionSchema(field, sessData, accessPath, setError))
          return true;
      }
      // A nested schema ? Recurse
      else if(validateSchema(field.schema, sessData, setError, accessPath)) {
        return true;
      }
    } else {
      // Normal field, default validations.
      const value = sessData[field.id];

      const fieldPath = accessPath.concat(field.id);

      const setErrorOnMessage = (message) => {
        if (message) {
          setError(fieldPath, message);
          return true;
        }
        return false;
      };

      if(field.noEmpty) {
        const label = (
          collLabel && gettext('%s in %s', field.label, collLabel)
        ) || field.noEmptyLabel || field.label;

        if (setErrorOnMessage(emptyValidator(label, value)))
          return true;
      }

      if(field.type === 'int') {
        if (setErrorOnMessage(
          integerValidator(field.label, value) ||
          minMaxValidator(field.label, value, field.min, field.max)
        ))
          return true;
      } else if(field.type === 'numeric') {
        if (setErrorOnMessage(
          numberValidator(field.label, value) ||
          minMaxValidator(field.label, value, field.min, field.max)
        ))
          return true;
      }
    }
  }

  return schema.validate(
    sessData, (id, message) => setError(accessPath.concat(id), message)
  );
}

export const getDepChange = (currPath, newState, oldState, action) => {
  if(action.depChange) {
    newState = action.depChange(currPath, newState, {
      type: action.type,
      path: action.path,
      value: action.value,
      oldState: _.cloneDeep(oldState),
      listener: action.listener,
    });
  }
  return newState;
};

// It will help us generating the flat path, and it will return the same
// object for the same path, which will help with the React componet rendering,
// as it uses `Object.is(...)` for the comparison of the arguments.
export const flatPathGenerator = (separator = '.' ) => {
  const flatPathMap = new Map;

  const setter = memoizeFn((path) => {
    const flatPath = path.join(separator);
    flatPathMap.set(flatPath, path);
    return flatPath;
  });

  const getter = (flatPath) => {
    return flatPathMap.get(flatPath);
  };

  return {
    flatPath: setter,
    path: getter,
    // Get the same object every time.
    cached: (path) => (getter(setter(path))),
  };
};
