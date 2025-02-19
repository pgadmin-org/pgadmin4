/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import SchemaView from '../../../../static/js/SchemaView';
import BaseUISchema from '../../../../static/js/SchemaView/base_schema.ui';
import pgAdmin from 'sources/pgadmin';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import PropTypes from 'prop-types';
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import {AUTH_METHODS} from 'pgadmin.browser.constants';
import current_user from 'pgadmin.user_management.current_user';
import { isEmptyString } from '../../../../static/js/validators';
import { showChangeOwnership } from '../../../../static/js/Dialogs/index';
import _ from 'lodash';

const StyledBox = styled(Box)(() => ({
  height: '100%',
  '& .UserManagementDialog-root': {
    padding: 0 + ' !important',
  }
}));

class UserManagementCollection extends BaseUISchema {
  constructor() {
    super({
      id: undefined,
      username: undefined,
      email: undefined,
      active: true,
      role: '2',
      newPassword: undefined,
      confirmPassword: undefined,
      locked: false,
      auth_source: AUTH_METHODS['INTERNAL']
    });

    this.authOnlyInternal = (current_user['auth_sources'].length  == 1 &&
      current_user['auth_sources'].includes(AUTH_METHODS['INTERNAL']));
  }

  setAuthSources(src) {
    this.authSources = src;
  }

  setRoleOptions(src) {
    this.roleOptions = src;
  }

  get idAttribute() {
    return 'id';
  }

  isUserNameEnabled(state) {
    return !(this.authOnlyInternal || state.auth_source == AUTH_METHODS['INTERNAL']);
  }

  isEditable(state) {
    return state.id != current_user['id'];
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'auth_source', label: gettext('Authentication source'),
        cell: (state)=> {
          return {
            cell: 'select',
            options: ()=> {
              if (obj.isNew(state)) {
                return Promise.resolve(obj.authSources.filter((s)=> current_user['auth_sources'].includes(s.value)));
              }
              return Promise.resolve(obj.authSources);
            },
            optionsReloadBasis: obj.isNew(state)
          };
        },
        minWidth: 110, width: 110,
        controlProps: {
          allowClear: false,
          openOnEnter: false,
          first_empty: false,
        },
        visible: function() {
          return !obj.authOnlyInternal;
        },
        editable: function(state) {
          return (obj.isNew(state) && !obj.authOnlyInternal);
        }
      }, {
        id: 'username', label: gettext('Username'), cell: 'text',
        minWidth: 90, width: 90,
        deps: ['auth_source'],
        depChange: (state)=>{
          if (obj.isUserNameEnabled(state) && obj.isNew(state) && !isEmptyString(obj.username)) {
            return {username: undefined};
          }
        },
        editable: (state)=> {
          return obj.isUserNameEnabled(state);
        }
      }, {
        id: 'email', label: gettext('Email'), cell: 'text',
        minWidth: 90, width: 90, deps: ['id'],
        editable: (state)=> {
          if (obj.isNew(state))
            return true;

          return obj.isEditable(state) && state.auth_source != AUTH_METHODS['INTERNAL'];
        }
      }, {
        id: 'role', label: gettext('Role'),
        cell: () => ({
          cell: 'select',
          options: obj.roleOptions,
          controlProps: {
            allowClear: false,
            openOnEnter: false,
            first_empty: false,
          },
        }),
        minWidth: 95, width: 95,
        editable: (state)=> {
          return obj.isEditable(state);
        }
      }, {
        id: 'active', label: gettext('Active'), cell: 'switch', width: 60, enableResizing: false,
        editable: (state)=> {
          return obj.isEditable(state);
        }
      }, {
        id: 'newPassword', label: gettext('New password'), cell: 'password',
        minWidth: 90, width: 90, deps: ['auth_source'], controlProps: {
          autoComplete: 'new-password',
        },
        editable: (state)=> {
          return obj.isEditable(state) && state.auth_source == AUTH_METHODS['INTERNAL'];
        }
      }, {
        id: 'confirmPassword', label: gettext('Confirm password'), cell: 'password',
        minWidth: 90, width: 90, deps: ['auth_source'], controlProps: {
          autoComplete: 'new-password',
        },
        editable: (state)=> {
          return obj.isEditable(state) && state.auth_source == AUTH_METHODS['INTERNAL'];
        }
      }, {
        id: 'locked', label: gettext('Locked'), cell: 'switch', width: 60, enableResizing: false,
        editable: (state)=> {
          return state.locked;
        }
      }
    ];
  }

  validate(state, setError) {
    let msg;
    let obj = this;
    let minPassLen = pgAdmin.password_length_min;
    if (obj.isUserNameEnabled(state) && isEmptyString(state.username)) {
      msg = gettext('Username cannot be empty');
      setError('username', msg);
      return true;
    } else {
      setError('username', null);
    }

    if (state.auth_source != AUTH_METHODS['INTERNAL']) {
      if (obj.isNew(state) && obj.top?.sessData?.userManagement) {
        for (let user of obj.top.sessData.userManagement) {
          if (user?.id &&
            user.username.toLowerCase() == state.username.toLowerCase() &&
            user.auth_source == state.auth_source) {
            msg = gettext('User name \'%s\' already exists', state.username);
            setError('username', msg);
            return true;
          }
        }
      }
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

      if (obj.isNew(state) && obj.top?.sessData?.userManagement) {
        for (let user of obj.top.sessData.userManagement) {
          if (user?.id &&
            user.email?.toLowerCase() == state.email?.toLowerCase()) {
            msg = gettext('Email address \'%s\' already exists', state.email);
            setError('email', msg);
            return true;
          }
        }
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

class UserManagementSchema extends BaseUISchema {
  constructor() {
    super({refreshBrowserTree: false});
    this.userManagementCollObj = new UserManagementCollection();
    this.changeOwnership = false;
  }

  setAuthSources(src) {
    this.userManagementCollObj.setAuthSources(src);
  }

  setRoleOptions(src) {
    this.userManagementCollObj.setRoleOptions(src);
  }

  deleteUser(deleteRow) {
    pgAdmin.Browser.notifier.confirm(
      gettext('Delete user?'),
      gettext('Are you sure you wish to delete this user?'),
      deleteRow,
      function() {
        return true;
      }
    );
  }

  get baseFields() {
    let obj = this;
    const api = getApiInstance();
    return [
      {
        id: 'userManagement', label: '', type: 'collection',
        schema: obj.userManagementCollObj,
        canAdd: true, canDelete: true, isFullTab: true,
        addOnTop: true,
        canDeleteRow: (row)=>{
          return row['id'] != current_user['id'];
        },
        onDelete: (row, deleteRow)=> {
          if (_.isUndefined(row['id'])) {
            deleteRow();
            return;
          }
          let deletedUser = {'id': row['id'], 'name': !isEmptyString(row['email']) ? row['email'] : row['username']};
          api.get(url_for('user_management.shared_servers', {'uid': row['id']}))
            .then((res)=>{
              if (res.data?.data?.shared_servers > 0) {
                api.get(url_for('user_management.admin_users', {'uid': row['id']}))
                  .then((result)=>{
                    showChangeOwnership(gettext('Change ownership'),
                      result?.data?.data?.result?.data,
                      res?.data?.data?.shared_servers,
                      deletedUser,
                      ()=> {
                        this.changeOwnership = true;
                        deleteRow();
                      }
                    );
                  })
                  .catch((err)=>{
                    pgAdmin.Browser.notifier.error(parseApiError(err));
                  });
              } else {
                obj.deleteUser(deleteRow);
              }
            })
            .catch((err)=>{
              pgAdmin.Browser.notifier.error(parseApiError(err));
              obj.deleteUser(deleteRow);
            });
        },
        canSearch: true
      },
      {
        id: 'refreshBrowserTree', visible: false, type: 'switch',
        mode: ['non_supported'],
        deps: ['userManagement'], depChange: ()=> {
          return { refreshBrowserTree: this.changeOwnership };
        }
      }
    ];
  }
}

function UserManagementDialog({onClose}) {

  const [authSources, setAuthSources] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const api = getApiInstance();
  const schema = React.useRef(null);
  const fetchData = async () => {
    try {
      api.get(url_for('user_management.auth_sources'))
        .then(res=>{
          setAuthSources(res.data);
        })
        .catch((err)=>{
          pgAdmin.Browser.notifier.error(err);
        });

      api.get(url_for('user_management.roles'))
        .then(res=>{
          setRoles(res.data);
        })
        .catch((err)=>{
          pgAdmin.Browser.notifier.error(parseApiError(err));
        });
    } catch (error) {
      pgAdmin.Browser.notifier.error(parseApiError(error));
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const onSaveClick = (_isNew, changeData)=>{
    return new Promise((resolve, reject)=>{
      try {
        if (changeData['refreshBrowserTree']) {
          // Confirmation dialog to refresh the browser tree.
          pgAdmin.Browser.notifier.confirm(
            gettext('Object explorer tree refresh required'),
            gettext('The ownership of the shared server was changed or the shared server was deleted, so the object explorer tree refresh is required. Do you wish to refresh the tree?'),
            function () {
              pgAdmin.Browser.tree.destroy();
            },
            function () {
              return true;
            },
            gettext('Refresh'),
            gettext('Later')
          );
        }
        api.post(url_for('user_management.save'), changeData['userManagement'])
          .then(()=>{
            pgAdmin.Browser.notifier.success('Users Saved Successfully');
            resolve();
            onClose();
          })
          .catch((err)=>{
            reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
          });
      } catch (error) {
        reject(parseApiError(error));
      }
    });
  };

  const authSourcesOptions = authSources.map((m)=>({
    label: m.label,
    value: m.value,
  }));

  const roleOptions = roles.map((m) => ({
    label: m.name,
    value: m.id,
  }));

  if (!schema.current)
    schema.current = new UserManagementSchema();

  if(authSourcesOptions.length <= 0) {
    return <></>;
  }

  if(roleOptions.length <= 0) {
    return <></>;
  }

  schema.current.setAuthSources(authSourcesOptions);
  schema.current.setRoleOptions(roleOptions);

  const onDialogHelp = () => {
    window.open(
      url_for('help.static', { 'filename': 'user_management.html' }),
      'pgadmin_help'
    );
  };

  return <StyledBox><SchemaView
    formType={'dialog'}
    getInitData={()=>{ return new Promise((resolve, reject)=>{
      api.get(url_for('user_management.users'))
        .then((res)=>{
          resolve({userManagement:res.data});
        })
        .catch((err)=>{
          reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
        });
    }); }}
    schema={schema.current}
    viewHelperProps={{
      mode: 'edit',
    }}
    onSave={onSaveClick}
    onClose={onClose}
    onHelp={onDialogHelp}
    hasSQL={false}
    disableSqlHelp={true}
    isTabView={false}
    formClassName='UserManagementDialog-root'
  /></StyledBox>;
}

UserManagementDialog.propTypes = {
  onClose: PropTypes.func
};

export function showUserManagement() {
  const title = gettext('User Management');

  pgAdmin.Browser.notifier.showModal(title, (onClose) => {
    return <UserManagementDialog
      onClose={()=>{onClose();}}
    />;
  },
  { isFullScreen: false, isResizeable: true, showFullScreen: false, isFullWidth: true,
    dialogWidth: pgAdmin.Browser.stdW.lg, dialogHeight: pgAdmin.Browser.stdH.md});
}
