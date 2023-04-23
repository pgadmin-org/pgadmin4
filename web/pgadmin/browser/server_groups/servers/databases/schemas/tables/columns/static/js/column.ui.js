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
import VariableSchema from 'top/browser/server_groups/servers/static/js/variable.ui';
import SecLabelSchema from 'top/browser/server_groups/servers/static/js/sec_label.ui';
import _ from 'lodash';
import { isEmptyString } from '../../../../../../../../../static/js/validators';
import { getNodePrivilegeRoleSchema } from '../../../../../../static/js/privilege.ui';
import { getNodeAjaxOptions } from '../../../../../../../../static/js/node_ajax';

export function getNodeColumnSchema(treeNodeInfo, itemNodeData, pgBrowser) {
  return new ColumnSchema(
    (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
    treeNodeInfo,
    ()=>getNodeAjaxOptions('get_types', pgBrowser.Nodes['table'], treeNodeInfo, itemNodeData, {
      cacheLevel: 'table',
    }),
    ()=>getNodeAjaxOptions('get_collations', pgBrowser.Nodes['collation'], treeNodeInfo, itemNodeData),
  );
}

export default class ColumnSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, nodeInfo, cltypeOptions, collspcnameOptions, inErd=false) {
    super({
      name: undefined,
      attowner: undefined,
      atttypid: undefined,
      attnum: undefined,
      cltype: undefined,
      collspcname: undefined,
      attacl: undefined,
      description: undefined,
      parent_tbl: undefined,
      min_val_attlen: undefined,
      min_val_attprecision: undefined,
      max_val_attlen: undefined,
      max_val_attprecision: undefined,
      edit_types: undefined,
      is_primary_key: false,
      inheritedfrom: undefined,
      attstattarget:undefined,
      attnotnull: false,
      attlen: null,
      attprecision: null,
      attidentity: 'a',
      attoptions: [],
      seqincrement: undefined,
      seqstart: undefined,
      seqmin: undefined,
      seqmax: undefined,
      seqcache: undefined,
      seqcycle: undefined,
      colconstype: 'n',
      genexpr: undefined,
    });

    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.nodeInfo = nodeInfo;
    this.cltypeOptions = cltypeOptions;
    this.collspcnameOptions = collspcnameOptions;
    this.inErd = inErd;

    this.datatypes = [];
  }

  get idAttribute() {
    return 'attnum';
  }

  inSchemaWithColumnCheck(state) {
    // disable all fields if column is listed under view or mview
    if (this.nodeInfo && ('view' in this.nodeInfo || 'mview' in this.nodeInfo)) {
      return true;
    }

    if(this.nodeInfo &&  ('schema' in this.nodeInfo)) {
      // We will disable control if it's system columns
      // inheritedfrom check is useful when we use this schema in table node
      // inheritedfrom has value then we should disable it
      if(!_.isUndefined(state.inheritedfrom)) {
        return true;
      }

      if(this.isNew(state)) {
        return false;
      }
      // ie: it's position is less than 1
      return !(!_.isUndefined(state.attnum) && state.attnum > 0);
    }
    return false;
  }

  editableCheckForTable(state) {
    return !this.inSchemaWithColumnCheck(state);
  }

  // Check whether the column is identity column or not
  isIdentityColumn(state) {
    let isIdentity = state.attidentity;
    return !(!_.isUndefined(isIdentity) && !_.isNull(isIdentity) && !_.isEmpty(isIdentity));
  }

  // Check whether the column is a identity column
  isTypeIdentity(state) {
    let colconstype = state.colconstype;
    return (!_.isUndefined(colconstype) && !_.isNull(colconstype) && colconstype == 'i');
  }

  // Check whether the column is a generated column
  isTypeGenerated(state) {
    let colconstype = state.colconstype;
    return (!_.isUndefined(colconstype) && !_.isNull(colconstype) && colconstype == 'g');
  }

  // We will check if we are under schema node & in 'create' mode
  inSchemaWithModelCheck(state) {
    if(this.nodeInfo && 'schema' in this.nodeInfo)
    {
      // We will disable control if it's in 'edit' mode
      return !(this.isNew(state));
    }
    return true;
  }

  attlenRange(state) {
    for(let o of this.datatypes) {
      if ( state.cltype == o.value ) {
        if(o.length) return {min: o.min_val || 0, max: o.max_val};
      }
    }
    return null;
  }

  attprecisionRange(state) {
    for(let o of this.datatypes) {
      if ( state.cltype == o.value ) {
        if(o.precision) return {min: o.min_val || 0, max: o.max_val};
      }
    }
    return null;
  }

  attCell(state) {
    return { cell: this.attlenRange(state) ? 'int' : '' };
  }

  get baseFields() {
    let obj = this;

    return [{
      id: 'name', label: gettext('Name'), cell: 'text',
      type: 'text', readonly: obj.inSchemaWithColumnCheck,
      editable: this.editableCheckForTable, noEmpty: true,
      width: 115,
    },{
      // Need to show this field only when creating new table
      // [in SubNode control]
      id: 'is_primary_key', label: gettext('Primary key?'),
      cell: 'switch', type: 'switch',  width: 100, disableResizing: true, deps:['name'],
      visible: ()=>{
        return obj.top?.nodeInfo && _.isUndefined(
          obj.top.nodeInfo['table'] || obj.top.nodeInfo['view'] ||
          obj.top?.nodeInfo['mview']
        );
      },
      readonly: (state)=>{
        // Disable it, when one of this:
        // - Primary key already exist
        // - Table is a partitioned table
        if (
          obj.top && ((
            !_.isUndefined(obj.top.origData['oid'])
              && !_.isUndefined(obj.top.origData['primary_key'])
              && obj.top.origData['primary_key'].length > 0
              && !_.isUndefined(obj.top.origData['primary_key'][0]['oid'])
          ) || (
            'is_partitioned' in obj.top.origData
            && obj.top.origData['is_partitioned']
            && obj.getServerVersion() < 11000
          ))
        ) {
          return true;
        }

        let name = state.name;

        return (!obj.inSchemaWithColumnCheck(state)
          && (_.isUndefined(name)  || _.isNull(name) || name == ''));
      },
      editable: function(state) {
        // If primary key already exist then disable.
        if (
          obj.top && (
            !_.isUndefined(obj.top.origData['oid'])
              && !_.isUndefined(obj.top.origData['primary_key'])
              && obj.top.origData['primary_key'].length > 0
              && !_.isUndefined(obj.top.origData['primary_key'][0]['oid'])
          )
        ) {
          return false;
        }

        // If table is partitioned table then disable
        if(
          obj.top && (
            'is_partitioned' in obj.top.origData
          && obj.top.origData['is_partitioned']
          && obj.getServerVersion() < 11000)
        ) {
          return false;
        }

        return !obj.inSchemaWithColumnCheck(state);
      },
    },{
      id: 'attnum', label: gettext('Position'), cell: 'text',
      type: 'text', disabled: this.inCatalog, mode: ['properties'],
    },{
      id: 'cltype', label: gettext('Data type'),
      readonly: obj.inSchemaWithColumnCheck, width: 150,
      group: gettext('Definition'), noEmpty: true,
      editable: this.editableCheckForTable,
      options: this.cltypeOptions, optionsLoaded: (options)=>{obj.datatypes = options;},
      type: (state)=>{
        return {
          type: 'select',
          options: this.cltypeOptions,
          controlProps: {
            allowClear: false,
            filter: (options)=>{
              let result = options;
              let edit_types = state?.edit_types || [];
              if(!obj.isNew(state) && !this.inErd) {
                result = _.filter(options, (o)=>edit_types.indexOf(o.value) > -1);
              }
              return result;
            },
          }
        };
      },
      cell: (row)=>{
        return {
          cell: 'select',
          options: this.cltypeOptions,
          controlProps: {
            allowClear: false,
            filter: (options)=>{
              let result = options;
              let edit_types = row?.edit_types || [];
              if(!obj.isNew(row) && !this.inErd) {
                result = _.filter(options, (o)=>edit_types.indexOf(o.value) > -1);
              }
              return result;
            },
          }
        };
      }
    },{
      /* This field is required to send it to back end */
      id: 'inheritedid', label: gettext(''), type: 'text', visible: false,
    },{
      // Need to show this field only when creating new table [in SubNode control]
      id: 'inheritedfrom', label: gettext('Inherited from table'),
      type: 'text', readonly: true, editable: false,
      visible: function() {
        if(this.nodeInfo) {
          return _.isUndefined(this.nodeInfo['table'] || this.nodeInfo['view'] || this.nodeInfo['mview']);
        }
        return false;
      },
    },{
      id: 'attlen', label: gettext('Length/Precision'),
      deps: ['cltype'], type: 'int', group: gettext('Definition'), width: 120, disableResizing: true,
      cell: (state)=>{
        return obj.attCell(state);
      },
      depChange: (state)=>{
        let range = this.attlenRange(state);
        if(range) {
          return {
            ...state, min_val_attlen: range.min, max_val_attlen: range.max,
          };
        } else {
          return {
            ...state, attlen: null,
          };
        }
      },
      disabled: function(state) {
        return !obj.attlenRange(state);
      },
      editable: function(state) {
        // inheritedfrom has value then we should disable it
        if (!isEmptyString(state.inheritedfrom)) {
          return false;
        }
        return Boolean(obj.attlenRange(state));
      },
    },{
      id: 'min_val_attlen', skipChange: true, visible: false, type: '',
    },{
      id: 'max_val_attlen', skipChange: true, visible: false, type: '',
    },{
      id: 'attprecision', label: gettext('Scale'), width: 60, disableResizing: true,
      deps: ['cltype'], type: 'int', group: gettext('Definition'),
      cell: (state)=>{
        return obj.attCell(state);
      },
      depChange: (state)=>{
        let range = this.attprecisionRange(state);
        if(range) {
          return {
            ...state, min_val_attprecision: range.min, max_val_attprecision: range.max,
          };
        } else {
          return {
            ...state, attprecision: null,
          };
        }
      },
      disabled: function(state) {
        return !this.attprecisionRange(state);
      },
      editable: function(state) {
        // inheritedfrom has value then we should disable it
        if (!isEmptyString(state.inheritedfrom)) {
          return false;
        }
        return Boolean(this.attprecisionRange(state));
      },
    },{
      id: 'min_val_attprecision', skipChange: true, visible: false, type: '',
    },{
      id: 'max_val_attprecision', skipChange: true, visible: false, type: '',
    },{
      id: 'collspcname', label: gettext('Collation'), cell: 'select',
      type: 'select', group: gettext('Definition'),
      deps: ['cltype'], options: this.collspcnameOptions,
      disabled: (state)=>{
        for(let o of this.datatypes) {
          if ( state.cltype == o.value ) {
            if(o.is_collatable) return false;
          }
        }
        return true;
      }, depChange: (state)=>{
        for(let o of this.datatypes) {
          if ( state.cltype == o.value ) {
            if(o.is_collatable) return {};
          }
        }
        return {collspcname: null};
      }
    },{
      id: 'attstattarget', label: gettext('Statistics'), cell: 'text',
      type: 'text', readonly: obj.inSchemaWithColumnCheck, mode: ['properties', 'edit'],
      group: gettext('Definition'),
    },{
      id: 'attstorage', label: gettext('Storage'), group: gettext('Definition'),
      type: 'select', mode: ['properties', 'edit'],
      cell: 'select', readonly: obj.inSchemaWithColumnCheck,
      controlProps: { placeholder: gettext('Select storage'),
        allowClear: false,
      },
      options: [
        {label: 'PLAIN', value: 'p'},
        {label: 'MAIN', value: 'm'},
        {label: 'EXTERNAL', value: 'e'},
        {label: 'EXTENDED', value: 'x'},
      ],
    },{
      id: 'defval', label: gettext('Default'), cell: 'text',
      type: 'text', group: gettext('Constraints'), deps: ['cltype', 'colconstype'],
      readonly: obj.inSchemaWithColumnCheck,
      disabled: function(state) {
        let isDisabled = ['serial', 'bigserial', 'smallserial'].indexOf(state.cltype) > -1;
        isDisabled = isDisabled || state.colconstype != 'n';
        return isDisabled;
      }, depChange: (state)=>{
        let isDisabled = false;
        if(!obj.inSchemaWithModelCheck(state)) {
          isDisabled = ['serial', 'bigserial', 'smallserial'].indexOf(state.cltype) > -1;
        }
        isDisabled = isDisabled || state.colconstype != 'n';
        if (isDisabled && obj.isNew(state)) {
          return {defval: undefined};
        }
      }, editable: function(state) {
        // inheritedfrom has value then we should disable it
        return !(!isEmptyString(state.inheritedfrom) || !this.editableCheckForTable(state));
      },
    },{
      id: 'attnotnull', label: gettext('Not NULL?'), cell: 'switch',
      type: 'switch', width: 80, disableResizing: true,
      group: gettext('Constraints'), editable: this.editableCheckForTable,
      deps: ['colconstype'],
      readonly: (state) => {
        return obj.inSchemaWithColumnCheck(state);
      }, depChange:(state)=>{
        if (state.colconstype == 'i') {
          return {attnotnull: true};
        }
      }
    }, {
      id: 'colconstype',
      label: gettext('Type'),
      cell: 'text',
      group: gettext('Constraints'),
      type: (state)=>{
        let options = [
          {'label': gettext('NONE'), 'value': 'n'},
          {'label': gettext('IDENTITY'), 'value': 'i'},
        ];

        if (this.getServerVersion() >= 120000) {
          // You can't change the existing column to Generated column.
          if (this.isNew(state)) {
            options.push({
              'label': gettext('GENERATED'),
              'value': 'g',
            });
          } else {
            options.push({
              'label': gettext('GENERATED'),
              'value': 'g',
              'disabled': true,
            });
          }
        }

        return {
          type: 'toggle',
          options: options,
        };
      },
      disabled: function(state) {
        return (!this.isNew(state) && state.colconstype == 'g');
      }, min_version: 100000,
    }, {
      id: 'attidentity', label: gettext('Identity'),
      cell: 'select', type: 'select',
      controlProps: {placeholder: gettext('Select identity'), allowClear: false},
      min_version: 100000, group: gettext('Constraints'),
      options: [
        {label: gettext('ALWAYS'), value: 'a'},
        {label: gettext('BY DEFAULT'), value: 'd'},
      ],
      deps: ['colconstype'],
      visible: this.isTypeIdentity,
      disabled: false,
    },{
      id: 'seqincrement', label: gettext('Increment'), type: 'int',
      mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
      min: 1, deps: ['attidentity', 'colconstype'], disabled: this.isIdentityColumn,
      visible: this.isTypeIdentity,
    },{
      id: 'seqstart', label: gettext('Start'), type: 'int',
      mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
      disabled: this.isIdentityColumn, deps: ['attidentity', 'colconstype'],
      visible: this.isTypeIdentity,
    },{
      id: 'seqmin', label: gettext('Minimum'), type: 'int',
      mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
      deps: ['attidentity', 'colconstype'], disabled: this.isIdentityColumn,
      visible: this.isTypeIdentity,
    },{
      id: 'seqmax', label: gettext('Maximum'), type: 'int',
      mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
      deps: ['attidentity', 'colconstype'], disabled: this.isIdentityColumn,
      visible: this.isTypeIdentity,
    },{
      id: 'seqcache', label: gettext('Cache'), type: 'int',
      mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
      min: 1, deps: ['attidentity', 'colconstype'], disabled: this.isIdentityColumn,
      visible: this.isTypeIdentity,
    },{
      id: 'seqcycle', label: gettext('Cycled'), type: 'switch',
      mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
      deps: ['attidentity', 'colconstype'], disabled: this.isIdentityColumn,
      visible: this.isTypeIdentity,
    },{
      id: 'genexpr', label: gettext('Expression'), type: 'text',
      mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
      min_version: 120000, deps: ['colconstype'], visible: this.isTypeGenerated,
      readonly: function(state) {
        return !this.isNew(state);
      },
    },{
      id: 'is_pk', label: gettext('Primary key?'),
      type: 'switch', mode: ['properties'],
      group: gettext('Definition'),
    },{
      id: 'is_fk', label: gettext('Foreign key?'),
      type: 'switch', mode: ['properties'],
      group: gettext('Definition'),
    },{
      id: 'is_inherited', label: gettext('Inherited?'),
      type: 'switch', mode: ['properties'],
      group: gettext('Definition'),
    },{
      id: 'tbls_inherited', label: gettext('Inherited from table(s)'),
      type: 'text', mode: ['properties'], deps: ['is_inherited'],
      group: gettext('Definition'),
      visible: function(state) {
        return !_.isUndefined(state.is_inherited) && state.is_inherited;
      },
    },{
      id: 'is_sys_column', label: gettext('System column?'), cell: 'text',
      type: 'switch', mode: ['properties'],
    },{
      id: 'description', label: gettext('Comment'), cell: 'text',
      type: 'multiline', mode: ['properties', 'create', 'edit'],
      disabled: this.inCatalog,
    },{
      id: 'attoptions', label: gettext('Variables'), type: 'collection',
      group: gettext('Variables'),
      schema: new VariableSchema([
        {label: 'n_distinct', value: 'n_distinct', vartype: 'string'},
        {label: 'n_distinct_inherited', value: 'n_distinct_inherited', vartype: 'string'}
      ], null, null, ['name', 'value']),
      uniqueCol : ['name'], mode: ['edit', 'create'],
      canAdd: true, canEdit: false, canDelete: true,
    },{
      id: 'security', label: gettext('Security'), type: 'group',
      visible: !this.inErd,
    },{
      id: 'attacl', label: gettext('Privileges'), type: 'collection',
      group: 'security',
      schema: this.getPrivilegeRoleSchema(['a','r','w','x']),
      mode: ['edit'], canAdd: true, canDelete: true,
      uniqueCol : ['grantee'],
    },{
      id: 'seclabels', label: gettext('Security labels'), canAdd: true,
      schema: new SecLabelSchema(), group: 'security',
      mode: ['edit', 'create'], editable: false, type: 'collection',
      min_version: 90100, canEdit: false, canDelete: true,
      uniqueCol : ['provider'],
    }];
  }

  validate(state, setError) {
    let msg = undefined;

    if (!_.isUndefined(state.cltype) && !isEmptyString(state.attlen)) {
      // Validation for Length field
      if (state.attlen < state.min_val_attlen)
        msg = gettext('Length/Precision should not be less than: ') + state.min_val_attlen;
      if (state.attlen > state.max_val_attlen)
        msg = gettext('Length/Precision should not be greater than: ') + state.max_val_attlen;
      // If we have any error set then throw it to user
      if(msg) {
        setError('attlen', msg);
        return true;
      }
    }

    if (!_.isUndefined(state.cltype) && !isEmptyString(state.attprecision)) {
      // Validation for precision field
      if (state.attprecision < state.min_val_attprecision)
        msg = gettext('Scale should not be less than: ') + state.min_val_attprecision;
      if (state.attprecision > state.max_val_attprecision)
        msg = gettext('Scale should not be greater than: ') + state.max_val_attprecision;
      // If we have any error set then throw it to user
      if(msg) {
        setError('attprecision', msg);
        return true;
      }
    }

    if (state.colconstype == 'g' && isEmptyString(state.genexpr)) {
      msg = gettext('Expression value cannot be empty.');
      setError('genexpr', msg);
      return true;
    }

    if (!this.isNew(state) && state.colconstype == 'i'
      && (this.origData.attidentity == 'a' || this.origData.attidentity == 'd')
        && (state.attidentity == 'a' || state.attidentity == 'd')) {
      if(isEmptyString(state.seqincrement)) {
        msg = gettext('Increment value cannot be empty.');
        setError('seqincrement', msg);
        return true;
      }

      if(isEmptyString(state.seqmin)) {
        msg = gettext('Minimum value cannot be empty.');
        setError('seqmin', msg);
        return true;
      }

      if(isEmptyString(state.seqmax)) {
        msg = gettext('Maximum value cannot be empty.');
        setError('seqmax', msg);
        return true;
      }

      if(isEmptyString(state.seqcache)) {
        msg = gettext('Cache value cannot be empty.');
        setError('seqcache', msg);
        return true;
      }
    }

    if (isEmptyString(state.seqmin) || isEmptyString(state.seqmax))
      return false;

    if ((state.seqmin == 0 && state.seqmax == 0) ||
        (parseInt(state.seqmin, 10) >= parseInt(state.seqmax, 10))) {
      setError('seqmin', gettext('Minimum value must be less than maximum value.'));
      return true;
    }

    if (state.seqstart && state.seqmin && parseInt(state.seqstart) < parseInt(state.seqmin)) {
      setError('seqstart', gettext('Start value cannot be less than minimum value.'));
      return true;
    }

    if (state.seqstart && state.seqmax && parseInt(state.seqstart) > parseInt(state.seqmax)) {
      setError('seqstart', gettext('Start value cannot be greater than maximum value.'));
      return true;
    }

    return false;
  }
}
