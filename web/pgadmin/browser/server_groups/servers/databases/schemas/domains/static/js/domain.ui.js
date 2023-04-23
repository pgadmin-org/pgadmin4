/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SecLabelSchema from '../../../../../static/js/sec_label.ui';
import { isEmptyString } from 'sources/validators';
import _ from 'lodash';

export class DomainConstSchema extends BaseUISchema {
  constructor() {
    super({
      conoid: undefined,
      conname: undefined,
      consrc: undefined,
      convalidated: true,
    });
  }

  get idAttribute() {
    return 'conoid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'conname', label: gettext('Name'), cell: 'text', type: 'text',
      }, {
        id: 'consrc', label: gettext('Check'), cell: 'text', type: 'text',
        editable: function(state) {return obj.isNew(state);},
      }, {
        id: 'convalidated', label: gettext('Validate?'), cell: 'checkbox',
        type: 'checkbox',
        readonly: function(state) {
          let currCon = _.find(obj.top.origData.constraints, (con)=>con.conoid == state.conoid);
          if (!obj.isNew(state) && currCon.convalidated) {
            return true;
          }
          return false;
        },
      }
    ];
  }

  validate(state, setError) {
    if (isEmptyString(state.conname)) {
      setError('conname', 'Constraint Name cannot be empty.');
      return true;
    } else {
      setError('conname', null);
    }

    if (isEmptyString(state.consrc)) {
      setError('consrc', 'Constraint Check cannot be empty.');
      return true;
    } else {
      setError('consrc', null);
    }
  }
}

export default class DomainSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      owner: undefined,
      basensp: undefined,
      description: undefined,
      basetype: undefined,
      typlen: undefined,
      precision: undefined,
      typdefault: undefined,
      typnotnull: undefined,
      sysdomain: undefined,
      collname: undefined,
      constraints: [],
      seclabels: [],
      ...initValues,
    });
    this.fieldOptions = {
      role: [],
      schema: [],
      basetype: [],
      collation: [],
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', mode: ['properties', 'create', 'edit'],
        noEmpty: true,
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text' , mode: ['properties'],
      }, {
        id: 'owner', label: gettext('Owner'),
        editable: false, type: 'select', options: this.fieldOptions.role,
        controlProps: { allowClear: false },
      }, {
        id: 'basensp', label: gettext('Schema'),
        editable: false, type: 'select', options: this.fieldOptions.schema,
        controlProps: { allowClear: false },
        mode: ['create', 'edit'],
      }, {
        id: 'sysdomain', label: gettext('System domain?'), cell: 'boolean',
        type: 'switch', mode: ['properties'],
      }, {
        id: 'description', label: gettext('Comment'), cell: 'text',
        type: 'multiline',
      }, {
        id: 'basetype', label: gettext('Base type'),
        type: 'select', options: this.fieldOptions.basetype,
        optionsLoaded: (options) => { obj.type_options = options; },
        mode:['properties', 'create', 'edit'], group: gettext('Definition'),
        readonly: function(state) {return !obj.isNew(state);}, noEmpty: true,
      }, {
        id: 'typlen', label: gettext('Length'), cell: 'text',
        type: 'text', group: gettext('Definition'), deps: ['basetype'],
        readonly: function(state) {return !obj.isNew(state);},
        disabled: function(state) {
          // We will store type from selected from combobox
          let of_type = state.basetype;
          if(obj.type_options) {
            // iterating over all the types
            _.each(obj.type_options, function(o) {
              // if type from selected from combobox matches in options
              if ( of_type == o.value ) {
                // if length is allowed for selected type
                if(o.length) {
                  // set the values in model
                  state.is_tlength = true;
                  state.min_val = o.min_val;
                  state.max_val = o.max_val;
                }
                else
                  state.is_tlength = false;
              }
            });

            if(!state.is_tlength) {
              if(state.typlen) {
                state.typlen = null;
              }
            }
          }
          return !state.is_tlength;
        },
      }, {
        id: 'precision', label: gettext('Precision'), cell: 'text',
        type: 'text', group: gettext('Definition'), deps: ['basetype'],
        readonly: function(state) {return !obj.isNew(state);},
        disabled: function(state) {
          // We will store type from selected from combobox
          let of_type = state.basetype;
          if(obj.type_options) {
            // iterating over all the types
            _.each(obj.type_options, function(o) {
              // if type from selected from combobox matches in options
              if ( of_type == o.value ) {
                // if precession is allowed for selected type
                if(o.precision)
                {
                  // set the values in model
                  state.is_precision = true;
                  state.min_val = o.min_val;
                  state.max_val = o.max_val;
                }
                else
                  state.is_precision = false;
              }
            });

            if (!state.is_precision) {
              if(state.precision) {
                state.precision = null;
              }
            }
          }
          return !state.is_precision;
        },
      }, {
        id: 'typdefault', label: gettext('Default'), cell: 'text',
        type: 'text', group: gettext('Definition'),
        controlProps: {placeholder: gettext('Enter an expression or a value.')},
      }, {
        id: 'typnotnull', label: gettext('Not NULL?'), cell: 'boolean',
        type: 'switch', group: gettext('Definition'),
      }, {
        id: 'collname', label: gettext('Collation'), cell: 'text',
        type: 'select', group: gettext('Definition'),
        options: this.fieldOptions.collation,
        readonly: function(state) {return !obj.isNew(state);},
      }, {
        id: 'constraints', label: gettext('Constraints'), type: 'collection',
        schema: new DomainConstSchema(),
        editable: false, group: gettext('Constraints'),
        mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
        uniqueCol : ['conname'],
      }, {
        id: 'seclabels', label: gettext('Security labels'), type: 'collection',
        schema: new SecLabelSchema(),
        editable: false, group: gettext('Security'),
        mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
        uniqueCol : ['provider'],
        min_version: 90200,
      }
    ];
  }
}
