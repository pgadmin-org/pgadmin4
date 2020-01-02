/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'underscore';
import {Address4, Address6} from 'ip-address';

export class ModelValidation {
  constructor(model) {
    this.err = {};
    this.errmsg = '';
    this.model = model;
  }

  validate() {
    const serviceId = this.model.get('service');

    if (!this.model.isNew() && 'id' in this.model.sessAttrs) {
      this.err['id'] = gettext('The ID cannot be changed.');
      this.errmsg = this.err['id'];
    } else {
      this.model.errorModel.unset('id');
    }

    this.checkForEmpty('name', gettext('Name must be specified.'));

    if (ModelValidation.isEmptyString(serviceId)) {
      // Do not sent empty string
      this.setNullValueForEmptyString('service');
      this.checkHostAndHostAddress();

      this.checkForEmpty('db', gettext('Maintenance database must be specified.'));
      this.checkForEmpty('username', gettext('Username must be specified.'));
      this.checkForEmpty('port', gettext('Port must be specified.'));
    } else {
      this.checkForEmpty('db', gettext('Maintenance database must be specified.'));
      this.clearHostAddressAndDbErrors();
    }

    if (this.model.get('use_ssh_tunnel')) {
      this.checkForEmpty('tunnel_host', gettext('SSH Tunnel host must be specified.'));
      this.checkForEmpty('tunnel_port', gettext('SSH Tunnel port must be specified.'));
      this.checkForEmpty('tunnel_username', gettext('SSH Tunnel username must be specified.'));
      if (this.model.get('tunnel_authentication')) {
        this.checkForEmpty('tunnel_identity_file', gettext('SSH Tunnel identity file must be specified.'));
      }
    }

    this.model.errorModel.set(this.err);

    if (_.size(this.err)) {
      return this.errmsg;
    }

    return null;
  }

  setNullValueForEmptyString(field) {
    let val = this.model.get(field);
    if (_.isUndefined(val) || _.isNull(val))
      return;

    // To avoid passing empty string to connection parameter
    if(String(val).trim() === '') {
      this.model.set(field, null);
    }
  }

  clearHostAddressAndDbErrors() {
    _.each(['host', 'hostaddr', 'db', 'username', 'port'], (item) => {
      this.setNullValueForEmptyString(item);
      this.model.errorModel.unset(item);
    });
  }

  checkHostAndHostAddress() {
    const translatedStr = gettext('Either Host name, Address or Service must ' +
      'be specified.');
    if (this.checkForEmpty('host', translatedStr) &&
      this.checkForEmpty('hostaddr', translatedStr)) {
      this.errmsg = this.errmsg || translatedStr;
    } else {
      this.errmsg = undefined;
      delete this.err['host'];
      delete this.err['hostaddr'];
    }

    this.checkForValidIp(this.model.get('hostaddr'),
      gettext('Host address must be valid IPv4 or IPv6 address.'));
  }

  checkForValidIp(ipAddress, msg) {
    if (ipAddress) {
      const isIpv6Address = new Address6(ipAddress).isValid();
      const isIpv4Address = new Address4(ipAddress).isValid();
      if (!isIpv4Address && !isIpv6Address) {
        this.err['hostaddr'] = msg;
        this.errmsg = msg;
      }
    } else {
      this.model.errorModel.unset('hostaddr');
    }
  }

  checkForEmpty(id, msg) {
    const value = this.model.get(id);

    if (ModelValidation.isEmptyString(value)) {
      this.err[id] = msg;
      this.errmsg = this.errmsg || msg;
      return true;
    } else {
      this.model.errorModel.unset(id);
      return false;
    }
  }

  static isEmptyString(string) {
    return _.isUndefined(string) || _.isNull(string) || String(string).trim() === '';
  }
}
