/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from 'sources/validators';

export default class ImportExportSelectionSchema extends BaseUISchema {
  constructor(initData = {}) {
    super({
      imp_exp: 'i',
      filename: undefined,
      replace_servers: false,
      ...initData
    });
  }

  get idAttribute() {
    return 'id';
  }

  get baseFields() {
    return [{
      id: 'imp_exp',
      label: gettext('Import/Export'),
      type: 'toggle',
      options: [
        {'label': gettext('Import'), 'value': 'i'},
        {'label': gettext('Export'), 'value': 'e'},
      ]
    }, {
      id: 'filename',
      label: gettext('Filename'),
      type: (state)=>{
        if (state.imp_exp == 'e') {
          return {
            type: 'file',
            controlProps: {
              dialogType: 'create_file',
              supportedTypes: ['json'],
              dialogTitle: 'Create file',
            },
          };
        }
        return {
          type: 'file',
          controlProps: {
            dialogType: 'select_file',
            supportedTypes: ['json'],
            dialogTitle: 'Select file',
          },
        };
      },
      deps: ['imp_exp'],
      depChange: (state, source, topState, actionObj)=> {
        if (state.imp_exp != actionObj.oldState.imp_exp) {
          state.filename = undefined;
        }
      },
      helpMessage: gettext('Supports only JSON format.')
    }, {
      id: 'replace_servers',
      label: gettext('Replace existing servers?'),
      type: 'switch', deps: ['imp_exp'],
      depChange: (state)=> {
        if (state.imp_exp == 'e') {
          state.replace_servers = false;
        }
      },
      disabled: function (state) {
        if (state.imp_exp == 'e') {
          return true;
        }
        return false;
      }
    }];
  }

  validate(state, setError) {
    if (isEmptyString(state.service)) {
      let errmsg = null;
      /* events validation*/
      if (!state.filename) {
        errmsg = gettext('Please provide a filename.');
        setError('filename', errmsg);
        return true;
      } else {
        errmsg = null;
        setError('filename', errmsg);
      }
    }
  }
}
