/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import ReactDOM from 'react-dom';
import { makeStyles } from '@material-ui/core';
import SchemaView from '../../../../static/js/SchemaView';
import BaseUISchema from '../../../../static/js/SchemaView/base_schema.ui';
import pgAdmin from 'sources/pgadmin';
import Theme from 'sources/Theme';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import PropTypes from 'prop-types';
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import authConstant from 'pgadmin.browser.constants';
import current_user from 'pgadmin.user_management.current_user';
import { isEmptyString } from '../../../../static/js/validators';
import Notify from '../../../../static/js/helpers/Notifier';
import { showChangeOwnership } from '../../../../static/js/Dialogs/index';

class UserManagementCollection extends BaseUISchema {
  constructor(authSources, roleOptions) {
    super({
      id: undefined,
      username: undefined,
      email: undefined,
      active: true,
      role: '2',
      newPassword: undefined,
      confirmPassword: undefined,
      locked: false,
      auth_source: authConstant['INTERNAL']
    });

    this.authOnlyInternal = (current_user['auth_sources'].length  == 1 &&
      current_user['auth_sources'].includes(authConstant['INTERNAL'])) ? true : false;
    this.authSources = authSources;
    this.roleOptions = roleOptions;
  }

  get idAttribute() {
    return 'id';
  }

  isUserNameEnabled(state) {
    return !(this.authOnlyInternal || state.auth_source == authConstant['INTERNAL']);
  }

  isEditable(state) {
    return state.id != current_user['id'];
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'auth_source', label: gettext('Authentication source'), cell: 'select',
        options: obj.authSources, minWidth: 110, width: 110,
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

          return obj.isEditable(state) && state.auth_source != authConstant['INTERNAL'];
        }
      }, {
        id: 'role', label: gettext('Role'), cell: 'select',
        options: obj.roleOptions, minWidth: 95, width: 95,
        controlProps: {
          allowClear: false,
          openOnEnter: false,
          first_empty: false,
        },
        editable: (state)=> {
          return obj.isEditable(state);
        }
      }, {
        id: 'active', label: gettext('Active'), cell: 'switch', width: 60, disableResizing: true,
        editable: (state)=> {
          return obj.isEditable(state);
        }
      }, {
        id: 'newPassword', label: gettext('New password'), cell: 'password',
        minWidth: 90, width: 90, deps: ['auth_source'],
        editable: (state)=> {
          return obj.isEditable(state) && state.auth_source == authConstant['INTERNAL'];
        }
      }, {
        id: 'confirmPassword', label: gettext('Confirm password'), cell: 'password',
        minWidth: 90, width: 90, deps: ['auth_source'],
        editable: (state)=> {
          return obj.isEditable(state) && state.auth_source == authConstant['INTERNAL'];
        }
      }, {
        id: 'locked', label: gettext('Locked'), cell: 'switch', width: 60, disableResizing: true,
        editable: (state)=> {
          return state.locked;
        }
      }
    ];
  }

  validate(state, setError) {
    let msg = undefined;
    let obj = this;
    let minPassLen = pgAdmin.password_length_min;
    if (obj.isUserNameEnabled(state) && isEmptyString(state.username)) {
      msg = gettext('Username cannot be empty');
      setError('username', msg);
      return true;
    } else {
      setError('username', null);
    }

    if (state.auth_source != authConstant['INTERNAL']) {
      if (obj.isNew(state) && obj.top?._sessData?.userManagement) {
        for (let i=0; i < obj.top._sessData.userManagement.length; i++) {
          if (obj.top._sessData.userManagement[i]?.id &&
            obj.top._sessData.userManagement[i].username.toLowerCase() == state.username.toLowerCase() &&
            obj.top._sessData.userManagement[i].auth_source == state.auth_source) {
            msg = gettext('User name \'%s\' already exists', state.username);
            setError('username', msg);
            return true;
          }
        }
      }
    }

    if (state.auth_source == authConstant['INTERNAL']) {
      let email_filter = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
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

      if (obj.isNew(state) && obj.top?._sessData?.userManagement) {
        for (let i=0; i < obj.top._sessData.userManagement.length; i++) {
          if (obj.top._sessData.userManagement[i]?.id &&
            obj.top._sessData.userManagement[i].email?.toLowerCase() == state.email?.toLowerCase()) {
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
  constructor(authSources, roleOptions) {
    super({refreshBrowserTree: false});
    this.userManagementCollObj = new UserManagementCollection(authSources, roleOptions);
    this.changeOwnership = false;
  }

  deleteUser(deleteRow) {
    Notify.confirm(
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
        id: 'userManagement', label: '', type: 'collection', schema: obj.userManagementCollObj,
        canAdd: true, canDelete: true, isFullTab: true, group: 'temp_user',
        canDeleteRow: (row)=>{
          return row['id'] != current_user['id'];
        },
        onDelete: (row, deleteRow)=> {
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
                    Notify.error(err);
                  });
              } else {
                obj.deleteUser(deleteRow);
              }
            })
            .catch((err)=>{
              Notify.error(err);
              obj.deleteUser(deleteRow);
            });
        },
        canSearch: true
      },
      {
        id: 'refreshBrowserTree', visible: false, type: 'boolean',
        deps: ['userManagement'], depChange: ()=> {
          return { refreshBrowserTree: this.changeOwnership };
        }
      }
    ];
  }
}

const useStyles = makeStyles((theme)=>({
  root: {
    ...theme.mixins.tabPanel,
    padding: 0,
  },
}));

function UserManagementDialog({onClose}) {
  const classes = useStyles();
  const [authSources, setAuthSources] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const api = getApiInstance();

  React.useEffect(async ()=>{
    try {
      api.get(url_for('user_management.auth_sources'))
        .then(res=>{
          setAuthSources(res.data);
        })
        .catch((err)=>{
          Notify.error(err);
        });

      api.get(url_for('user_management.roles'))
        .then(res=>{
          setRoles(res.data);
        })
        .catch((err)=>{
          Notify.error(err);
        });
    } catch (error) {
      Notify.error(parseApiError(error));
    }
  }, []);

  const onSaveClick = (_isNew, changeData)=>{
    return new Promise((resolve, reject)=>{
      try {
        if (changeData['refreshBrowserTree']) {
          // Confirmation dialog to refresh the browser tree.
          Notify.confirm(
            gettext('Browser tree refresh required'),
            gettext('The ownership of the shared server was changed or the shared server was deleted, so a browser tree refresh is required. Do you wish to refresh the tree?'),
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
            Notify.success('Users Saved Successfully');
            resolve();
            onClose();
          })
          .catch((err)=>{
            reject(err);
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

  if(authSourcesOptions.length <= 0) {
    return <></>;
  }

  const roleOptions = roles.map((m)=>({
    label: m.name,
    value: m.id,
  }));

  if(roleOptions.length <= 0) {
    return <></>;
  }

  const onDialogHelp = () => {
    window.open(url_for('help.static', { 'filename': 'user_management.html' }), 'pgadmin_help');
  };

  return <SchemaView
    formType={'dialog'}
    getInitData={()=>{ return new Promise((resolve, reject)=>{
      api.get(url_for('user_management.users'))
        .then((res)=>{
          resolve({userManagement:res.data});
        })
        .catch((err)=>{
          reject(err);
        });
    }); }}
    schema={new UserManagementSchema(authSourcesOptions, roleOptions)}
    viewHelperProps={{
      mode: 'edit',
    }}
    onSave={onSaveClick}
    onClose={onClose}
    onHelp={onDialogHelp}
    hasSQL={false}
    disableSqlHelp={true}
    isTabView={false}
    formClassName={classes.root}
  />;
}

UserManagementDialog.propTypes = {
  onClose: PropTypes.func
};

export function showUserManagement() {
  pgAdmin.Browser.Node.registerUtilityPanel();
  let panel = pgAdmin.Browser.Node.addUtilityPanel(980, pgAdmin.Browser.stdH.md),
    j = panel.$container.find('.obj_properties').first();
  panel.title(gettext('User Management'));

  const onClose = ()=> {
    ReactDOM.unmountComponentAtNode(j[0]);
    panel.close();
  };

  ReactDOM.render(
    <Theme>
      <UserManagementDialog
        onClose={onClose}
      />
    </Theme>, j[0]);
}
