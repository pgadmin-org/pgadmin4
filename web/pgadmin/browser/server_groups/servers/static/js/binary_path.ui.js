/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'lodash';
import url_for from 'sources/url_for';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import getApiInstance from '../../../../../static/js/api_instance';
import pgAdmin from 'sources/pgadmin';

export function getBinaryPathSchema() {

  return new BinaryPathSchema();
}

export default class BinaryPathSchema extends BaseUISchema {
  constructor() {
    super({
      isDefault: false,
      serverType: undefined,
      binaryPath: null,
    });
  }

  get baseFields() {
    return [
      {
        id: 'isDefault', label: gettext('Set as default'), type: 'radio',
        width: 32,
        radioType: true,
        disabled: function (state) {
          return state?.binaryPath && state?.binaryPath.length > 0 ? false : true;
        },
        cell: 'radio',
        deps: ['binaryPath'],
      },
      {
        id: 'serverType',
        label: gettext('Database Server'),
        type: 'text', cell: '',
        width: 40,
      },
      {
        id: 'binaryPath', label: gettext('Binary Path'), cell: 'file', type: 'file',
        isvalidate: true,
        controlProps: {
          dialogType: 'select_folder',
          supportedTypes: ['*', 'sql', 'backup'],
          dialogTitle: gettext('Select folder'),
          placeholder: pgAdmin.server_mode == 'False' ? gettext('Select binary path...') : gettext('Enter binary path...')
        },
        hideBrowseButton: pgAdmin.server_mode == 'True',
        validate: (data) => {
          const api = getApiInstance();
          if (_.isNull(data) || data.trim() === '') {
            pgAdmin.Browser.notifier.alert(gettext('Validate Path'), gettext('Path should not be empty.'));
          } else {
            api.post(url_for('misc.validate_binary_path'),
              JSON.stringify({ 'utility_path': data }))
              .then(function (res) {
                pgAdmin.Browser.notifier.alert(gettext('Validate binary path'), gettext(res.data.data));
              })
              .catch(function (error) {
                pgAdmin.Browser.notifier.pgNotifier('error', error, gettext('Failed to validate binary path.'));
              });
          }
          return true;
        }
      },
    ];
  }
}
