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
import {AUTH_METHODS} from 'pgadmin.browser.constants';
import current_user from 'pgadmin.user_management.current_user';
import { isEmptyString } from '../../../../static/js/validators';
import ErrorBoundary from '../../../../static/js/helpers/ErrorBoundary';
import PropTypes from 'prop-types';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';

class UserSchema extends BaseUISchema {
  constructor(options, pgAdmin) {
    super({
      auth_source: 'internal',
      role: 1,
      active: true,
      refreshBrowserTree: false
    });
    this.options = options;
    this.pgAdmin = pgAdmin;

    this.authOnlyInternal = (current_user['auth_sources'].length  == 1 &&
      current_user['auth_sources'].includes(AUTH_METHODS['INTERNAL']));
  }

  isUserNameEnabled(state) {
    return this.isNew(state) && state.auth_source != AUTH_METHODS['INTERNAL'];
  }

  isNotCurrentUser(state) {
    return state.id != current_user['id'];
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'auth_source', label: gettext('Authentication source'),
        type: (state) => {
          return {
            type: 'select',
            options: () => {
              if (obj.isNew(state)) {
                return Promise.resolve(obj.options.authSources.filter((s) => current_user['auth_sources'].includes(s.value)));
              }
              return Promise.resolve(obj.options.authSources);
            },
            optionsReloadBasis: obj.isNew(state)
          };
        },
        controlProps: {
          allowClear: false,
          openOnEnter: false,
        },
        readonly: function (state) {
          return !obj.isNew(state) || obj.authOnlyInternal;
        }
      }, {
        id: 'username', label: gettext('Username'), type: 'text',
        deps: ['auth_source'],
        depChange: (state) => {
          if (!obj.isUserNameEnabled(state)) {
            return { username: undefined };
          }
        },
        readonly: (state) => {
          return !obj.isUserNameEnabled(state);
        }
      }, {
        id: 'email', label: gettext('Email'), type: 'text',
        deps: ['id'],
        readonly: (state) => {
          if (obj.isNew(state)) {
            return false;
          } else {
            return !obj.isNotCurrentUser(state) || state.auth_source == AUTH_METHODS['INTERNAL'];
          }
        }
      }, {
        id: 'role', label: gettext('Role'), type: 'select',
        options: obj.options.roles,
        controlProps: {
          allowClear: false,
          openOnEnter: false,
        },
        readonly: (state) => {
          if (obj.isNew(state)) {
            return false;
          }
          return !obj.isNotCurrentUser(state);
        }
      }, {
        id: 'active', label: gettext('Active'), type: 'switch',
        readonly: (state) => {
          if (obj.isNew(state)) {
            return false;
          }
          return !obj.isNotCurrentUser(state);
        }
      }, {
        id: 'newPassword', label: gettext('New password'), type: 'password',
        deps: ['auth_source'], controlProps: {
          autoComplete: 'new-password',
        },
        visible: (state)=>obj.isNotCurrentUser(state) && state.auth_source == AUTH_METHODS['INTERNAL'],
      }, {
        id: 'confirmPassword', label: gettext('Confirm password'), type: 'password',
        deps: ['auth_source'], controlProps: {
          autoComplete: 'new-password',
        },
        visible: (state)=>obj.isNotCurrentUser(state) && state.auth_source == AUTH_METHODS['INTERNAL'],
      }, {
        id: 'locked', label: gettext('Locked'), type: 'switch',
        readonly: (state) => {
          return !state.locked;
        }
      }
    ];
  }

  validate(state, setError) {
    let msg;
    let obj = this;
    let minPassLen = this.pgAdmin.password_length_min;
    if (obj.isUserNameEnabled(state) && isEmptyString(state.username)) {
      msg = gettext('Username cannot be empty');
      setError('username', msg);
      return true;
    } else {
      setError('username', null);
    }

    if (state.auth_source == AUTH_METHODS['INTERNAL']) {
      let email_filter = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (isEmptyString(state.email)) {
        msg = gettext('Email cannot be empty');
        setError('email', msg);
        return true;
      } else if (!email_filter.test(state.email)) {
        msg = gettext('Invalid email address: %s', state.email);
        setError('email', msg);
        return true;
      } else {
        setError('email', null);
      }

      if (obj.isNew(state) && isEmptyString(state.newPassword)) {
        msg = gettext('Password cannot be empty for user %s', state.email);
        setError('newPassword', msg);
        return true;
      } else if (state.newPassword?.length < minPassLen) {
        msg = gettext('Password must be at least %s characters for user %s', minPassLen, state.email);
        setError('newPassword', msg);
        return true;
      } else {
        setError('newPassword', null);
      }

      if (obj.isNew(state) && isEmptyString(state.confirmPassword)) {
        msg = gettext('Confirm Password cannot be empty for user %s', state.email);
        setError('confirmPassword', msg);
        return true;
      } else {
        setError('confirmPassword', null);
      }

      if (state.newPassword !== state.confirmPassword) {
        msg = gettext('Passwords do not match for user %s', state.email);
        setError('confirmPassword', msg);
        return true;
      } else {
        setError('confirmPassword', null);
      }
    }

    return false;
  }
}

export default function UserDialog({user, options, onClose}) {
  const pgAdmin = usePgAdmin();
  const schema = useMemo(() => new UserSchema(options, pgAdmin), []);
  const isEdit = Boolean(user.id);
  const api = getApiInstance();

  const onSaveClick = (_isNew, changeData)=>{
    return new Promise((resolve, reject)=>{
      try {
        api.post(url_for('user_management.save'), changeData)
          .then(()=>{
            pgAdmin.Browser.notifier.success(gettext('Users Saved Successfully'));
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
      getInitData={()=>{ return Promise.resolve(user); }}
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

UserDialog.propTypes = {
  user: PropTypes.object,
  options: PropTypes.object,
  onClose: PropTypes.func,
};