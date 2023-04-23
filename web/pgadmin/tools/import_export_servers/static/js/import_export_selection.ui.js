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
      label: gettext('Remove all the existing servers?'),
      type: 'switch', deps: ['imp_exp'],
      helpMessage: gettext('If this option is turned on then pgAdmin will remove all the existing database servers and then import the selected servers. This setting is applicable only while importing the servers.'),
      depChange: (state)=> {
        if (state.imp_exp == 'e') {
          state.replace_servers = false;
        }
      },
      disabled: function (state) {
        return state.imp_exp == 'e';
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
        setError('filename', null);
      }
    }
  }
}
