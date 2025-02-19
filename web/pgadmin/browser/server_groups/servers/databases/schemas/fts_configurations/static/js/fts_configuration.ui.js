/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { DataGridFormHeader } from 'sources/SchemaView/DataGridView';
import { isEmptyString } from '../../../../../../../../static/js/validators';

class TokenHeaderSchema extends BaseUISchema {
  constructor(tokenOptions) {
    super({
      token: undefined,
      isNew: true,
    });

    this.tokenOptions = tokenOptions;
  }

  set isNewFTSConf(flag) {
    if (this.state)
      this.state.data = {...this.state.data, isNew: flag};
  }

  getNewData(data) {
    return {
      token: data.token,
      dictname: [],
    };
  }

  get baseFields() {
    return [{
      id: 'token', label: gettext('Tokens'), deps: ['isNew'],
      type: () => ({
        type: 'select',
        options: this.tokenOptions,
      }),
      disabled: function() {
        return this.state ? this.state.data.isNew : true;
      }
    },{
      id: 'isNew', visible: false, type: 'text', exclude: true,
    }];
  }
}

class TokenSchema extends BaseUISchema {
  constructor(dictOptions) {
    super({
      token: undefined,
      dictname: undefined,
    });

    this.dictOptions = dictOptions;
  }

  get baseFields() {
    return [
      {
        id: 'token', label: gettext('Token'), type:'text',
        editable: false, cell: '', minWidth: 150, noEmpty: true,
      }, {
        id: 'dictname', label: gettext('Dictionaries'),
        editable: true, controlProps: {multiple: true}, cell:'select',
        options: this.dictOptions, minWidth: 260, noEmpty: true,
      }
    ];
  }
}

export default class FTSConfigurationSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      name: undefined,        // FTS Configuration name
      owner: undefined,       // FTS Configuration owner
      is_sys_obj: undefined,  // Is system object
      description: undefined, // Comment on FTS Configuration
      schema: undefined,      // Schema name FTS Configuration belongs to
      prsname: undefined,    // FTS parser list for FTS Configuration node
      copy_config: undefined, // FTS configuration list to copy from
      tokens: undefined,      // token/dictionary pair list for node
      ...initValues
    });
    this.fieldOptions = {
      role: [],
      schema: [],
      parsers: [],
      copyConfig: [],
      tokens: [],
      dictionaries: [],
      ...fieldOptions,
    };

    this.tokHeaderSchema = new TokenHeaderSchema(this.fieldOptions.tokens);
    this.tokColumnSchema = new TokenSchema(this.fieldOptions.dictionaries);
  }

  get idAttribute() {
    return 'oid';
  }

  initialise(data) {
    this.tokHeaderSchema.isNewFTSConf = this.isNew(data);
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text', type: 'text',
        noEmpty: true,
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        editable: false, type: 'text', mode:['properties'],
      }, {
        id: 'owner', label: gettext('Owner'), cell: 'text',
        editable: false, type: 'select', options: this.fieldOptions.role,
        mode: ['properties', 'edit','create'], noEmpty: true,
      }, {
        id: 'schema', label: gettext('Schema'),
        editable: false, type: 'select', options: this.fieldOptions.schema,
        mode: ['create', 'edit'], noEmpty: true,
      }, {
        id: 'is_sys_obj', label: gettext('System FTS configuration?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      }, {
        id: 'description', label: gettext('Comment'), cell: 'text',
        type: 'multiline',
      }, {
        id: 'prsname', label: gettext('Parser'),
        editable: false, type: 'select', group: gettext('Definition'),
        deps: ['copy_config'],
        options: this.fieldOptions.parsers,
        //disable parser when user select copy_config manually and vica-versa
        disabled: function(state) {
          let copy_config = state.copy_config;
          return !(_.isNull(copy_config) ||
                  _.isUndefined(copy_config) ||
                  copy_config === '');
        },
        readonly: function(state) { return !obj.isNew(state); },
      }, {
        id: 'copy_config', label: gettext('Copy config'),
        editable: false, type: 'select', group: gettext('Definition'),
        mode: ['create'], deps: ['prsname'],
        options: this.fieldOptions.copyConfig,
        //disable copy_config when user select parser manually and vica-versa
        disabled: function(state) {
          let parser = state.prsname;
          return !(_.isNull(parser) ||
                  _.isUndefined(parser) ||
                  parser === '');
        },
        readonly: function(state) { return !obj.isNew(state); },
      }, {
        id: 'tokens', label: '', type: 'collection',
        group: gettext('Tokens'), mode: ['create','edit'],
        schema: this.tokColumnSchema,
        headerSchema: this.tokHeaderSchema,
        headerFormVisible: true,
        GridHeader: DataGridFormHeader,
        uniqueCol : ['token'],
        canAdd: (state, helpderProps) => (helpderProps.mode !== 'create'),
        canDelete: true,
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null,
      parser = state.prsname,
      config = state.copy_config;

    let copy_config_or_parser = !(parser === '' || _.isUndefined(parser)
                  || _.isNull(parser)) ? parser : config;

    if(isEmptyString(copy_config_or_parser)) {
      errmsg = gettext('Select parser or configuration to copy.');
      setError('prsname', errmsg);
      return true;
    } else {
      setError('prsname', null);
    }
  }
}
