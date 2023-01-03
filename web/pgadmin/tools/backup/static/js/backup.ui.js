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
import { isEmptyString } from 'sources/validators';

export class SectionSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'id';
  }


  get baseFields() {
    return [
      {
        id: 'pre_data',
        label: gettext('Pre-data'),
        type: 'switch',
        group: gettext('Sections'),
        deps: ['only_data', 'only_schema'],
        disabled: function(state) {
          return state.only_data ||
           state.only_schema;
        },
      }, {
        id: 'data',
        label: gettext('Data'),
        type: 'switch',
        group: gettext('Sections'),
        deps: ['only_data', 'only_schema'],
        disabled: function(state) {
          return state.only_data ||
           state.only_schema;
        },
      }, {
        id: 'post_data',
        label: gettext('Post-data'),
        type: 'switch',
        group: gettext('Sections'),
        deps: ['only_data', 'only_schema'],
        disabled: function(state) {
          return state.only_data ||
           state.only_schema;
        },
      }
    ];
  }
}

export function getSectionSchema() {
  return new SectionSchema();
}

export class TypeObjSchema extends BaseUISchema {
  constructor(fieldOptions={}) {
    super();

    this.fieldOptions = {
      backupType: null,
      ...fieldOptions,
    };

    this.backupType = this.fieldOptions.backupType;
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
      deps: ['pre_data', 'data', 'post_data', 'only_schema'],
      disabled: function(state) {
        return state.pre_data ||
           state.data ||
           state.post_data ||
           state.only_schema;
      },
    }, {
      id: 'only_schema',
      label: gettext('Only schema'),
      type: 'switch',
      group: gettext('Type of objects'),
      deps: ['pre_data', 'data', 'post_data', 'only_data'],
      disabled: function(state) {
        return state.pre_data ||
           state.data ||
           state.post_data ||
           state.only_data;
      },
    }, {
      id: 'blobs',
      label: gettext('Blobs'),
      type: 'switch',
      group: gettext('Type of objects'),
      visible: function(state) {
        if (!_.isUndefined(obj.backupType) && obj.backupType === 'server') {
          state.blobs = false;
          return false;
        }
        return true;
      },
    }];
  }
}

export function getTypeObjSchema(fieldOptions) {
  return new TypeObjSchema(fieldOptions);
}

export class SaveOptSchema extends BaseUISchema {
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
    let obj = this;
    return [{
      id: 'dns_owner',
      label: gettext('Owner'),
      type: 'switch',
      disabled: false,
      group: gettext('Do not save'),
    }, {
      id: 'dns_privilege',
      label: gettext('Privilege'),
      type: 'switch',
      disabled: false,
      group: gettext('Do not save'),
    }, {
      id: 'dns_tablespace',
      label: gettext('Tablespace'),
      type: 'switch',
      disabled: false,
      group: gettext('Do not save'),
    }, {
      id: 'dns_unlogged_tbl_data',
      label: gettext('Unlogged table data'),
      type: 'switch',
      disabled: false,
      group: gettext('Do not save'),
    }, {
      id: 'no_comments',
      label: gettext('Comments'),
      type: 'switch',
      disabled: false,
      group: gettext('Do not save'),
      visible: function() {
        let serverInfo = _.isUndefined(obj.fieldOptions.nodeInfo) ? undefined : obj.fieldOptions.nodeInfo.server;

        return _.isUndefined(serverInfo) ? false : serverInfo.version >= 110000;
      },
    }];
  }
}

export function getSaveOptSchema(fieldOptions) {
  return new SaveOptSchema(fieldOptions);
}

function isVisible () {
  return !(!_.isUndefined(this.backupType) && this.backupType === 'server');
}

export class QueryOptionSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      id: null,
      ...initValues,
    });

    this.fieldOptions = {
      nodeInfo: null,
      backupType: null,
      ...fieldOptions,
    };
    this.backupType = fieldOptions.backupType;
  }

  get idAttribute() {
    return 'id';
  }


  get baseFields() {
    let obj = this;
    return [{
      id: 'use_column_inserts',
      label: gettext('Use Column Inserts'),
      type: 'switch',
      disabled: false,
      group: gettext('Queries'),
    }, {
      id: 'use_insert_commands',
      label: gettext('Use Insert Commands'),
      type: 'switch',
      disabled: false,
      group: gettext('Queries'),
    }, {
      id: 'include_create_database',
      label: gettext('Include CREATE DATABASE statement'),
      type: 'switch',
      disabled: false,
      group: gettext('Queries'),
      visible: function() {
        return !(!_.isUndefined(obj.backupType) && obj.backupType === 'server');
      },
    }, {
      id: 'include_drop_database',
      label: gettext('Include DROP DATABASE statement'),
      type: 'switch',
      group: gettext('Queries'),
      deps: ['only_data'],
      disabled: function(state) {
        if (state.only_data) {
          state.include_drop_database = false;
          return true;
        }
        return false;
      },
    }, {
      id: 'load_via_partition_root',
      label: gettext('Load Via Partition Root'),
      type: 'switch',
      disabled: false,
      group: gettext('Queries'),
      visible: function() {
        if (!_.isUndefined(obj.backupType) && obj.backupType === 'server')
          return false;

        let serverInfo = _.isUndefined(obj.fieldOptions.nodeInfo) ? undefined : obj.fieldOptions.nodeInfo.server;

        return _.isUndefined(serverInfo) ? false : serverInfo.version >= 110000;
      },
    }];
  }
}

export function getQueryOptionSchema(fieldOptions) {
  return new QueryOptionSchema(fieldOptions);
}

export class DisabledOptionSchema extends BaseUISchema {
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
      label: gettext('Trigger'),
      type: 'switch',
      group: gettext('Disable'),
      deps: ['only_data'],
      disabled: function(state) {
        return !(state.only_data);
      },
    }, {
      id: 'disable_quoting',
      label: gettext('$ quoting'),
      type: 'switch',
      disabled: false,
      group: gettext('Disable'),
    }];
  }
}

export function getDisabledOptionSchema(fieldOptions) {
  return new DisabledOptionSchema(fieldOptions);
}

export class MiscellaneousSchema extends BaseUISchema {
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
    let obj = this;
    return [{
      id: 'with_oids',
      label: gettext('With OID(s)'),
      type: 'switch',
      deps: ['use_column_inserts', 'use_insert_commands'],
      group: gettext('Miscellaneous'),
      disabled: function(state) {
        let serverInfo = _.isUndefined(obj.fieldOptions.nodeInfo) ? undefined : obj.fieldOptions.nodeInfo.server;

        if (!_.isUndefined(serverInfo) && serverInfo.version >= 120000)
          return true;

        if (state.use_column_inserts || state.use_insert_commands) {
          state.with_oids = false;
          return true;
        }
        return false;
      },
    }, {
      id: 'verbose',
      label: gettext('Verbose messages'),
      type: 'switch',
      disabled: false,
      group: gettext('Miscellaneous'),
    }, {
      id: 'dqoute',
      label: gettext('Force double quote on identifiers'),
      type: 'switch',
      disabled: false,
      group: gettext('Miscellaneous'),
    }, {
      id: 'use_set_session_auth',
      label: gettext('Use SET SESSION AUTHORIZATION'),
      type: 'switch',
      disabled: false,
      group: gettext('Miscellaneous'),
    }];
  }
}

export function getMiscellaneousSchema(fieldOptions) {
  return new MiscellaneousSchema(fieldOptions);
}

export default class BackupSchema extends BaseUISchema {
  constructor(sectionSchema, typeObjSchema, saveOptSchema, queryOptionSchema, disabledOptionSchema, miscellaneousSchema, fieldOptions = {}, treeNodeInfo=[], pgBrowser=null, backupType='server') {
    super({
      file: undefined,
      format: 'custom',
      id: null,
      blobs: true,
      verbose: true,
    });

    this.fieldOptions = {
      encoding: null,
      role: null,
      ...fieldOptions,
    };

    this.treeNodeInfo = treeNodeInfo;
    this.pgBrowser = pgBrowser;
    this.backupType = backupType;
    this.getSectionSchema = sectionSchema;
    this.getTypeObjSchema = typeObjSchema;
    this.getSaveOptSchema = saveOptSchema;
    this.getQueryOptionSchema = queryOptionSchema;
    this.getDisabledOptionSchema = disabledOptionSchema;
    this.getMiscellaneousSchema = miscellaneousSchema;
  }

  get idAttribute() {
    return 'id';
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'file',
      label: gettext('Filename'),
      type: 'file',
      disabled: false,
      controlProps: {
        dialogType: 'create_file',
        supportedTypes: ['*', 'sql', 'backup'],
        dialogTitle: 'Select file',
      },
      deps: ['format'],
    }, {
      id: 'format',
      label: gettext('Format'),
      type: 'select',
      disabled: false,
      controlProps: { allowClear: false, width: '100%' },
      options: [
        {
          label: gettext('Custom'),
          value: 'custom',
        },
        {
          label: gettext('Tar'),
          value: 'tar',
        },
        {
          label: gettext('Plain'),
          value: 'plain',
        },
        {
          label: gettext('Directory'),
          value: 'directory',
        },
      ],
      visible: function(state) {
        if (!_.isUndefined(obj.backupType) && obj.backupType === 'server') {
          state.format = 'plain';
          return false;
        }
        return true;
      },
    }, {
      id: 'ratio',
      label: gettext('Compression ratio'),
      type: 'int',
      min: 0,
      max: 9,
      deps: ['format'],
      disabled: function(state) {
        return (state.format === 'tar');
      },
      visible: isVisible,
    }, {
      id: 'encoding',
      label: gettext('Encoding'),
      type: 'select',
      disabled: false,
      options: obj.fieldOptions.encoding,
      visible: function() {
        if (!_.isUndefined(obj.backupType) && obj.backupType === 'server') {
          let dbNode = obj.pgBrowser.serverInfo[obj.treeNodeInfo.server._id];
          return _.isUndefined(dbNode) ? false : dbNode.version >= 110000;
        }
        return true;
      },
    }, {
      id: 'no_of_jobs',
      label: gettext('Number of jobs'),
      type: 'int',
      deps: ['format'],
      disabled: function(state) {
        return (state.format !== 'directory');
      },
      visible: isVisible,
    }, {
      id: 'role',
      label: gettext('Role name'),
      type: 'select',
      options: obj.fieldOptions.role,
      controlProps: {
        allowClear: false,
      },
    }, {
      id: 'server_note',
      label: gettext('Note'),
      text: gettext('The backup format will be PLAIN'),
      type: 'note',
      visible: function() {
        return obj.backupType === 'server';
      },
    }, {
      type: 'nested-fieldset',
      label: gettext('Sections'),
      group: gettext('Data/Objects'),
      schema:new getSectionSchema(),
      visible: isVisible,
    }, {
      type: 'nested-fieldset',
      label: gettext('Type of objects'),
      group: gettext('Data/Objects'),
      schema: obj.getTypeObjSchema()
    }, {
      type: 'nested-fieldset',
      label: gettext('Do not save'),
      group: gettext('Data/Objects'),
      schema: obj.getSaveOptSchema(),
    }, {
      type: 'nested-fieldset',
      label: gettext('Queries'),
      group: gettext('Options'),
      schema: obj.getQueryOptionSchema(),
    }, {
      type: 'nested-fieldset',
      label: gettext('Disable'),
      group: gettext('Options'),
      schema: obj.getDisabledOptionSchema(),
    }, {
      type: 'nested-fieldset',
      label: gettext('Miscellaneous'),
      group: gettext('Options'),
      schema: obj.getMiscellaneousSchema(),
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
