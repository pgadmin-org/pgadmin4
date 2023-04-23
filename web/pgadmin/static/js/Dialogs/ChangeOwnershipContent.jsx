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
import { isEmptyString } from 'sources/validators';

class ChangeOwnershipSchema extends BaseUISchema {
  constructor(deletedUser, adminUserList, noOfSharedServers) {
    super({
      newUser: '',
    });
    this.deletedUser = deletedUser;
    this.adminUserList = adminUserList;
    this.noOfSharedServers = noOfSharedServers;
  }

  get baseFields() {
    let self = this;
    return [
      {
        id: 'note', type: 'note',
        text: gettext('Select the user that will take ownership of the shared servers created by <b>' + self.deletedUser + '</b>. <b>' + self.noOfSharedServers + '</b> shared servers are currently owned by this user. </br></br> Clicking on the “Change” button will either change ownership if a user is selected or delete any shared servers if no user is selected. There is no way to reverse this action.'),
      }, {
        id: 'newUser', label: gettext('User'),
        type: 'select', controlProps: {allowClear: true},
        options: self.adminUserList
      }
    ];
  }
  validate(state) {
    let obj = this;

    /* mview definition validation*/
    if (isEmptyString(state.newUser)) {
      obj.warningText = gettext('The shared servers owned by <b>'+ obj.deletedUser +'</b> will be deleted. Do you wish to continue?');
    } else {
      obj.warningText = null;
    }
  }
}

const useStyles = makeStyles((theme)=>({
  root: {
    ...theme.mixins.tabPanel,
  },
}));

export default function ChangeOwnershipContent({onSave, onClose, deletedUser, userList, noOfSharedServers}) {
  const classes = useStyles();
  const objChangeOwnership = new ChangeOwnershipSchema(deletedUser, userList, noOfSharedServers);

  return<SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    schema={objChangeOwnership}
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
ChangeOwnershipContent.propTypes = {
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  currentUser: PropTypes.string,
  userList: PropTypes.array,
  noOfSharedServers: PropTypes.number,
  deletedUser: PropTypes.string
};
