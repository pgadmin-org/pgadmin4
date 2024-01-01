/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';
import { isEmptyString } from 'sources/validators';

export class RestoreSectionSchema extends BaseUISchema {
  constructor(fieldOptions={}) {
    super();

    this.fieldOptions = {
      selectedNodeType: undefined,
      ...fieldOptions,
    };

    this.selectedNodeType = this.fieldOptions.selectedNodeType;
  }

  get idAttribute() {
    return 'id';
  }

  isDisabled(state) {
    return this.selectedNodeType !== 'function' &&
          this.selectedNodeType !== 'table' &&
          this.selectedNodeType !== 'trigger' &&
          this.selectedNodeType !== 'trigger_function' &&
          (state.only_data || state.only_schema);
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'pre_data',
      label: gettext('Pre-data'),
      type: 'switch',
      group: gettext('Sections'),
      inlineNext: true,
      deps: ['only_data', 'only_schema'],
      disabled: function(state) {
        return obj.isDisabled(state);
      },
    }, {
      id: 'data',
      label: gettext('Data'),
      type: 'switch',
      group: gettext('Sections'),
      inlineNext: true,
      deps: ['only_data', 'only_schema'],
      disabled: function(state) {
        return obj.isDisabled(state);
      },
    }, {
      id: 'post_data',
      label: gettext('Post-data'),
      type: 'switch',
      group: gettext('Sections'),
      deps: ['only_data', 'only_schema'],
      disabled: function(state) {
        return obj.isDisabled(state);
      },
    }];
  }
}

export function getRestoreSectionSchema(fieldOptions) {
  return new RestoreSectionSchema(fieldOptions);
}

export class RestoreTypeObjSchema extends BaseUISchema {
  constructor(fieldOptions={}) {
    super();

    this.fieldOptions = {
      selectedNodeType: undefined,
      ...fieldOptions,
    };

    this.selectedNodeType = this.fieldOptions.selectedNodeType;
  }

  get idAttribute() {
    return 'id';
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'only_data',
      label: gettext('Only data'),
      type: 'switch',
      group: gettext('Type of objects'),
      inlineNext: true,
      deps: ['pre_data', 'data', 'post_data', 'only_schema'],
      disabled: function(state) {
        if(obj.selectedNodeType == 'table') {
          state.only_data = true;
        }
        return (obj.selectedNodeType !== 'database' && obj.selectedNodeType !== 'schema') ||
          (state.pre_data ||
            state.data ||
            state.post_data ||
            state.only_schema
          );
      },
    }, {
      id: 'only_schema',
      label: gettext('Only schema'),
      type: 'switch',
      group: gettext('Type of objects'),
      deps: ['pre_data', 'data', 'post_data', 'only_data'],
      disabled: function(state) {
        if(obj.selectedNodeType == 'index' || obj.selectedNodeType == 'function') {
          state.only_schema = true;
        }
        return (obj.selectedNodeType !== 'database' && obj.selectedNodeType !== 'schema') ||
          (state.pre_data ||
            state.data ||
            state.post_data ||
            state.only_data
          );
      },
    }];
  }
}

export function getRestoreTypeObjSchema(fieldOptions) {
  return new RestoreTypeObjSchema(fieldOptions);
}

export class RestoreSaveOptSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      id: null,
      ...initValues,
    });

    this.fieldOptions = {
      nodeInfo: null,
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'id';
  }


  get baseFields() {
    return [{
      id: 'dns_owner',
      label: gettext('Owner'),
      type: 'switch',
      disabled: false,
      inlineNext: true,
      group: gettext('Do not save'),
    }, {
      id: 'dns_privilege',
      label: gettext('Privileges'),
      type: 'switch',
      disabled: false,
      inlineNext: true,
      group: gettext('Do not save'),
    }, {
      id: 'dns_tablespace',
      label: gettext('Tablespaces'),
      type: 'switch',
      disabled: false,
      inlineNext: true,
      group: gettext('Do not save'),
    }, {
      id: 'dns_comments',
      label: gettext('Comments'),
      type: 'switch',
      disabled: false,
      inlineNext: true,
      group: gettext('Do not save'),
      min_version: 110000
    }, {
      id: 'dns_publications',
      label: gettext('Publications'),
      type: 'switch',
      disabled: false,
      group: gettext('Do not save'),
      inlineNext: true,
      min_version: 110000
    }, {
      id: 'dns_subscriptions',
      label: gettext('Subscriptions'),
      type: 'switch',
      disabled: false,
      group: gettext('Do not save'),
      inlineNext: true,
      min_version: 110000
    }, {
      id: 'dns_security_labels',
      label: gettext('Security labels'),
      type: 'switch',
      disabled: false,
      group: gettext('Do not save'),
      inlineNext: true,
      min_version: 110000
    }, {
      id: 'dns_table_access_method',
      label: gettext('Table access methods'),
      type: 'switch',
      disabled: false,
      group: gettext('Do not save'),
      inlineNext: true,
      min_version: 150000
    }];
  }
}

export function getRestoreSaveOptSchema(fieldOptions) {
  return new RestoreSaveOptSchema(fieldOptions);
}

export class RestoreDisableOptionSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      id: null,
      ...initValues,
    });

    this.fieldOptions = {
      nodeInfo: null,
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'id';
  }


  get baseFields() {
    return [{
      id: 'disable_trigger',
      label: gettext('Triggers'),
      type: 'switch',
      disable: false,
      group: gettext('Disable')
    }];
  }
}

export function getRestoreDisableOptionSchema(fieldOptions) {
  return new RestoreDisableOptionSchema(fieldOptions);
}

export class RestoreMiscellaneousSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      id: null,
      verbose: true,
      ...initValues,
    });

    this.fieldOptions = {
      nodeInfo: null,
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'id';
  }

  get baseFields() {
    return [{
      id: 'verbose',
      label: gettext('Verbose messages'),
      type: 'switch',
      disabled: false,
      group: gettext('Miscellaneous / Behavior'),
    }, {
      id: 'use_set_session_auth',
      label: gettext('Use SET SESSION AUTHORIZATION'),
      type: 'switch',
      disabled: false,
      group: gettext('Miscellaneous / Behavior'),
    }, {
      id: 'exit_on_error',
      label: gettext('Exit on error'),
      type: 'switch',
      disabled: false,
      group: gettext('Miscellaneous / Behavior'),
    }, {
      id: 'exclude_schema',
      label: gettext('Exclude schema'),
      type: 'text',
      disabled: false,
      group: gettext('Miscellaneous / Behavior')
    }];
  }
}

export function getRestoreMiscellaneousSchema(fieldOptions) {
  return new RestoreMiscellaneousSchema(fieldOptions);
}

//Restore Schema
export default class RestoreSchema extends BaseUISchema {

  constructor(restoreSectionSchema, restoreTypeObjSchema, restoreSaveOptSchema, restoreDisableOptionSchema, restoreMiscellaneousSchema, fieldOptions = {}, treeNodeInfo={}, pgBrowser=null) {
    super({
      custom: false,
      file: undefined,
      role: undefined,
      format: 'custom',
      verbose: true,
      blobs: true,
      encoding: undefined,
      database: undefined,
      schemas: undefined,
      tables: undefined,
      functions: undefined,
      triggers: undefined,
      trigger_funcs: undefined,
      indexes: undefined
    });

    this.fieldOptions = {
      encoding: null,
      role: null,
      ...fieldOptions,
    };

    this.getSectionSchema = restoreSectionSchema;
    this.getRestoreTypeObjSchema = restoreTypeObjSchema;
    this.getRestoreSaveOptSchema = restoreSaveOptSchema;
    this.getRestoreDisableOptionSchema = restoreDisableOptionSchema;
    this.getRestoreMiscellaneousSchema = restoreMiscellaneousSchema;
    this.treeNodeInfo = treeNodeInfo;
    this.pgBrowser = pgBrowser;
  }

  get idAttribute() {
    return 'id';
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'format',
      label: gettext('Format'),
      disabled: false,type: 'select',
      controlProps: { allowClear: false, width: '100%' },
      options: [{
        label: gettext('Custom or tar'),
        value: 'custom',
      },
      {
        label: gettext('Directory'),
        value: 'directory',
      }],
    }, {
      id: 'file',
      label: gettext('Filename'),
      type: (state) => {
        return {
          type: 'file',
          controlProps: {
            dialogType: state.format == 'directory' ? 'select_folder' : 'select_file',
            supportedTypes: ['*', 'backup', 'sql', 'patch'],
            dialogTitle: 'Select file',
          }
        };
      },
      disabled: false,
      deps: ['format']
    }, {
      id: 'no_of_jobs',
      label: gettext('Number of jobs'),
      type: 'int',
    }, {
      id: 'role',
      label: gettext('Role name'),
      node: 'role',
      type: 'select',
      options: obj.fieldOptions.role,
      controlProps: {
        allowClear: false,
      },
    }, {
      type: 'nested-fieldset',
      label: gettext('Sections'),
      group: gettext('Data Options'),
      schema:obj.getSectionSchema(),
      visible: true
    }, {
      type: 'nested-fieldset',
      label: gettext('Type of objects'),
      group: gettext('Data Options'),
      schema:obj.getRestoreTypeObjSchema(),
      visible: true
    }, {
      type: 'nested-fieldset',
      label: gettext('Do not save'),
      group: gettext('Data Options'),
      schema:obj.getRestoreSaveOptSchema(),
      visible: true
    }, {
      id: 'include_create_database',
      label: gettext('Include CREATE DATABASE statement'),
      type: 'switch',
      disabled: false,
      group: gettext('Query Options')
    }, {
      id: 'clean',
      label: gettext('Clean before restore'),
      type: 'switch',
      group: gettext('Query Options'),
      inlineNext: true,
      disabled: function(state) {
        if(obj.selectedNodeType === 'function' || obj.selectedNodeType === 'trigger_function') {
          state.clean = true;
          return true;
        }
      },
    }, {
      id: 'if_exists',
      label: gettext('Include IF EXISTS clause'),
      type: 'switch',
      group: gettext('Query Options'),
      deps: ['clean'],
      disabled: function(state) {
        if (state.clean) {
          return false;
        }
        state.if_exists = false;
        return true;
      },
    }, {
      id: 'single_transaction',
      label: gettext('Single transaction'),
      type: 'switch',
      disabled: false,
      group: gettext('Query Options'),
    }, {
      id: 'enable_row_security',
      label: gettext('Enable row security'),
      type: 'switch',
      disabled: false,
      group: gettext('Table Options'),
    }, {
      id: 'no_data_fail_table',
      label: gettext('No data for failed tables'),
      type: 'switch',
      disabled: false,
      group: gettext('Table Options'),
    }, {
      type: 'nested-fieldset',
      label: gettext('Disable'),
      group: gettext('Options'),
      schema:obj.getRestoreDisableOptionSchema(),
      visible: true
    }, {
      type: 'nested-fieldset',
      label: gettext('Miscellaneous / Behavior'),
      group: gettext('Options'),
      schema:obj.getRestoreMiscellaneousSchema(),
      visible: true
    }];
  }

  validate(state, setError) {
    if (isEmptyString(state.service)) {
      let errmsg = null;
      /* events validation*/
      if (!state.file) {
        errmsg = gettext('Please provide a filename.');
        setError('file', errmsg);
        return true;
      } else {
        setError('file', null);
      }
    }
  }
}
