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

export class MiscellaneousSchema extends BaseUISchema {
  constructor(fieldOptions={}) {
    super();

    this.fieldOptions = {
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
      group: gettext('Miscellaneous'),
    }, {
      id: 'dqoute',
      label: gettext('Force double quote on identifiers'),
      type: 'switch',
      disabled: false,
      group: gettext('Miscellaneous')
    }];
  }
}

export function getMiscellaneousSchema() {
  return new MiscellaneousSchema();
}

export default class BackupGlobalSchema extends BaseUISchema {
  constructor(miscellaneousSchema, fieldOptions = {}) {
    super({
      id: null,
      verbose: true,
    });

    this.fieldOptions = {
      role: null,
      ...fieldOptions,
    };

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
      dialog_title: 'Select file',
    }, {
      id: 'role',
      label: gettext('Role name'),
      type: 'select',
      options: obj.fieldOptions.role,
      controlProps: {
        allowClear: false,
      },
    }, {
      type: 'nested-fieldset',
      label: gettext('Miscellaneous'),
      contentClass: 'row',
      schema: obj.getMiscellaneousSchema(),
    }, {
      id: 'globals_note',
      label: gettext('Note'),
      text: gettext('Only objects global to the entire database will be backed up, in PLAIN format'),
      type: 'note',
    }];
  }

  validate(state, setError) {
    if (isEmptyString(state.service)) {
      let errmsg = null;
      /* validation */
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
