/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useMemo } from 'react';
import SchemaView from '../../../../static/js/SchemaView';
import BaseUISchema from '../../../../static/js/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import ErrorBoundary from '../../../../static/js/helpers/ErrorBoundary';
import PropTypes from 'prop-types';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';

class RoleSchema extends BaseUISchema {
  constructor() {
    super({
      name: '',
    });
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Name'), type: 'text', noEmpty: true, maxLength: 128,
      },
      {
        id: 'description', label: gettext('Description'), type: 'multiline', noEmpty: true, maxLength: 256,
      }
    ];
  }
}

export default function RoleDialog({role, onClose}) {
  const pgAdmin = usePgAdmin();
  const schema = useMemo(() => new RoleSchema(), []);
  const isEdit = Boolean(role.id);
  const api = getApiInstance();

  const onSaveClick = (_isNew, changeData)=>{
    return new Promise((resolve, reject)=>{
      try {
        api.post(url_for('user_management.role_save'), changeData)
          .then(()=>{
            pgAdmin.Browser.notifier.success(gettext('Role Saved Successfully'));
            resolve();
            onClose(null, true);
          })
          .catch((err)=>{
            reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
          });
      } catch (error) {
        reject(Error(parseApiError(error)));
      }
    });
  };

  return <ErrorBoundary>
    <SchemaView
      formType={'dialog'}
      getInitData={()=>{ return Promise.resolve(role); }}
      schema={schema}
      viewHelperProps={{
        mode: isEdit ? 'edit' : 'create',
      }}
      onSave={onSaveClick}
      onClose={onClose}
      hasSQL={false}
      disableSqlHelp={true}
      disableDialogHelp={true}
      isTabView={false}
    />
  </ErrorBoundary>;
}

RoleDialog.propTypes = {
  role: PropTypes.object,
  onClose: PropTypes.func,
};
