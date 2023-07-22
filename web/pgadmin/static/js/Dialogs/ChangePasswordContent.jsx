/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { makeStyles } from '@material-ui/core';
import React from 'react';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import BaseUISchema from '../SchemaView/base_schema.ui';
import SchemaView from '../SchemaView';

class ChangePasswordSchema extends BaseUISchema {
  constructor(user, isPgpassFileUsed, hasCsrfToken=false, showUser=true) {
    super({
      user: user,
      password: '',
      newPassword: '',
      confirmPassword: ''
    });
    this.isPgpassFileUsed = isPgpassFileUsed;
    this.hasCsrfToken = hasCsrfToken;
    this.showUser = showUser;
  }

  get baseFields() {
    let self = this;
    return [
      {
        id: 'user', label: gettext('User'), type: 'text', disabled: true, visible: this.showUser
      }, {
        id: 'password', label: gettext('Current Password'), type: 'password',
        disabled: self.isPgpassFileUsed, noEmpty: self.isPgpassFileUsed ? false : true,
        controlProps: {
          maxLength: null
        }
      }, {
        id: 'newPassword', label: gettext('New Password'), type: 'password',
        noEmpty: true,
        controlProps: {
          maxLength: null
        }
      }, {
        id: 'confirmPassword', label: gettext('Confirm Password'), type: 'password',
        noEmpty: true,
        controlProps: {
          maxLength: null
        }
      }
    ].concat(this.hasCsrfToken ? [
      {
        id: 'csrf_token', visible: false, type: 'text'
      }
    ]: []);
  }

  validate(state, setError) {
    let errmsg = null;
    if (state.newPassword !== state.confirmPassword) {
      errmsg = gettext('Passwords do not match.');
      setError('confirmPassword', errmsg);
      return true;
    } else {
      setError('confirmPassword', null);
    }

    return false;
  }
}

const useStyles = makeStyles((theme)=>({
  root: {
    ...theme.mixins.tabPanel,
  },
}));

export default function ChangePasswordContent({getInitData=() => { /*This is intentional (SonarQube)*/ },
  onSave, onClose, hasCsrfToken=false, showUser=true}) {
  const classes = useStyles();

  return<SchemaView
    formType={'dialog'}
    getInitData={getInitData}
    schema={new ChangePasswordSchema('', false, hasCsrfToken, showUser)}
    viewHelperProps={{
      mode: 'create',
    }}
    customSaveBtnName={'Change'}
    onSave={onSave}
    onClose={onClose}
    hasSQL={false}
    disableSqlHelp={true}
    disableDialogHelp={true}
    isTabView={false}
    formClassName={classes.root}
  />;
}
ChangePasswordContent.propTypes = {
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  userName: PropTypes.string,
  isPgpassFileUsed: PropTypes.bool,
  getInitData: PropTypes.func,
  hasCsrfToken: PropTypes.bool,
  showUser: PropTypes.bool
};
