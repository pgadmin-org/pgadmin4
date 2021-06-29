/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* This is the base schema class for SchemaView.
 * A UI schema must inherit this to use SchemaView for UI.
 */
export default class BaseUISchema {
  constructor(defaults) {
    /* Pass the initial data to constructor so that
    they will set to defaults */
    this._defaults = defaults;

    this.keys = null; // If set, other fields except keys will be filtered
    this.filterGroups = []; // If set, these groups will be filtered out
    this.informText = null; // Inform text to show after save, this only saves it
    this._top = null;
  }

  /* Top schema is helpful if this is used as child */
  set top(val) {
    this._top = val;
  }

  get top() {
    /* If no top, I'm the top */
    return this._top || this;
  }

  /* The original data before any changes */
  set origData(val) {
    this._origData = val;
  }

  get origData() {
    return this._origData || {};
  }

  /* Property allows to restrict setting this later */
  get defaults() {
    return this._defaults || {};
  }

  /* ID key for the view state */
  get idAttribute() {
    return 'id';
  }

  /* Schema fields, to be defined by inherited UI schema. Override this */
  get baseFields() {
    throw new Error('Property method \'baseFields()\' must be implemented.');
  }

  /* Used by schema view component. Do not override this, it will
  concat base fields with extraFields.
  */
  get fields() {
    return this.baseFields
      .filter((field)=>{
        let retval;

        /* If any groups are to be filtered */
        retval = this.filterGroups.indexOf(field.group) == -1;

        /* Select only keys, if specified */
        if(this.keys) {
          retval = retval && this.keys.indexOf(field.id) > -1;
        }
        return retval;
      });
  }

  /* Check if current data is new or existing */
  isNew(state) {
    if(_.isUndefined(state)) {
      state = this.origData;
    }
    if(_.has(state, this.idAttribute)) {
      return _.isUndefined(state[this.idAttribute])
        || _.isNull(state[this.idAttribute]);
    }
    /* Nested collection rows may or may not have idAttribute.
    So to decide whether row is new or not set, the cid starts with
    nn (not new) for existing rows. Newly added will start with 'c' (created)
    */
    if(_.has(state, 'cid')) {
      return !state.cid.startsWith('nn');
    }
    return true;
  }

  /* Called by SchemaView to validate data, return true indicates invalid.
  validate will receive two params state and setError func
  Eg - setError('fieldname', 'Some error').
  And return true if invalid, otherwise false.
  */
  validate() {
    return false;
  }
}
