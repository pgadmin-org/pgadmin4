/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from 'sources/validators';
export default class CastSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      name: undefined,            // Name of the cast
      encoding: 'UTF8',
      srctyp: undefined,          // Source type
      trgtyp: undefined,          // Target type
      proname: undefined,         // Function
      castcontext: false,     // Context (IMPLICIT/EXPLICIT/ASSIGNMENT)
      syscast: undefined,         // Is this cast is system object? Yes/No
      description: undefined,      // Comment on the cast
      ...initValues,
    });
    this.fieldOptions=fieldOptions;

  }
  get idAttribute() {
    return 'oid';
  }

  getCastName(state) {
    let srctype = state.srctyp;
    let trgtype = state.trgtyp;
    if(srctype != undefined && srctype != '' &&
          trgtype != undefined && trgtype != '') {
      state.name = srctype+'->'+trgtype;
      return state.name;
    }  
    else {
      state.name = '';
      return state.name;
    }
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), cell: 'string',
      editable: false, type: 'text', readonly: true, cellHeaderClasses: 'width_percent_50',
    },{
      id: 'oid', label: gettext('OID'), cell: 'string',
      editable: false, type: 'text', mode: ['properties'],
    },{
      id: 'srctyp', label: gettext('Source type'),
      type: 'select', group: gettext('Definition'), readonly: function(state) {
        return !obj.isNew(state);
      }, mode: ['create'],
      options:this.fieldOptions.getTypeOptions,
      /*
         * Control is extended to create cast name from source type and destination type
         * once their values are changed
         */
      depChange: (state)=>{
        /*
            * On source type change, check if both source type and
            * target type are set, if yes then fetch values from both
            * controls and generate cast name
            */
        return obj.getCastName(state);
      },
    },

    /*
       * Text control for viewing source type in properties and
       * edit mode only
       */
    {
      id: 'srctyp', label: gettext('Source type'), type: 'text',
      group: gettext('Definition'), readonly: true, mode:['properties','edit'],
    },{
      id: 'trgtyp', label: gettext('Target type'),
      type: 'select', group: gettext('Definition'), readonly: function(state) {
        return !obj.isNew(state);
      }, mode: ['create'],
      options:this.fieldOptions.getTypeOptions,

      depChange: (state)=>{
        /*
            * On source type change, check if both source type and
            * target type are set, if yes then fetch values from both
            * controls and generate cast name
            */
        return obj.getCastName(state);
      },
    },
    /*
       * Text control for viewing target type in properties and
       * edit mode only
       */
    {
      id: 'trgtyp', label: gettext('Target type'), type: 'text',
      group: gettext('Definition'), readonly: true, mode:['properties','edit'],
    },

    /*
       * Proname field is dependent on source type and target type.
       * On source and target type changed event,
       * associated functions will be fetch using ajax call
       */
    {
      id: 'proname', label: gettext('Function'), deps:['srctyp', 'trgtyp'],
      readonly: function(state) { return !obj.isNew(state); },
      group: gettext('Definition'), mode: ['create'],
      first_empty: true,
      type: (state)=>{

        let fetchOptionsBasis = state.srctyp + state.trgtyp;
        return {
          type: 'select',
          options: ()=>obj.fieldOptions.getFuncOptions(state.srctyp, state.trgtyp),
          optionsReloadBasis: fetchOptionsBasis,
        };
      },
    },
    /*
     * Text type control for viewing function name in properties and
     * edit mode only
     */
    {
      id: 'proname', label: gettext('Function'), type: 'text',
      group: gettext('Definition'), readonly: true, mode:['properties','edit'],
    },
    {
      id: 'castcontext', label: gettext('Context'),type: 'toggle',
      options: [
        {'label': gettext('IMPLICIT'), value: true},
        {'label': gettext('EXPLICIT'), value: false},
      ],
      group: gettext('Definition'),
      mode:['create'],
    },
    /*
     * Text control for viewing context in properties and
     * edit mode
     */
    {
      id: 'castcontext', label: gettext('Context'), readonly: true,
      options:[{
        label: gettext('IMPLICIT'), value: 'IMPLICIT',
      },{
        label: gettext('EXPLICIT'), value: 'EXPLICIT',
      },{
        label: gettext('ASSIGNMENT'), value: 'ASSIGNMENT',
      }], type: 'select', group: gettext('Definition'),
      mode:['properties', 'edit'],
      controlProps: {
        editable: false,
      },
    },{
      id: 'syscast', label: gettext('System cast?'),
      cell: 'switch', type: 'switch', mode: ['properties'],
    },{
      id: 'description', label: gettext('Comment'),
      type: 'multiline', cellHeaderClasses: 'width_percent_50',
    },
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    if (isEmptyString(state.srctyp)) {
      errmsg = gettext('Source type must be selected.');
      setError('srctyp', errmsg);
      return true;
    } else {
      setError('srctyp', null);
    }

    if (isEmptyString(state.trgtyp)) {
      errmsg = gettext('Target type must be selected.');
      setError('trgtyp', errmsg);
      return true;
    } else {
      setError('trgtyp', null);
    }
    return false;
  }
}

