/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from 'sources/validators';

const MAX_ALLOWLIST = 50;
const IPV4_OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_CIDR = new RegExp(
  `^${IPV4_OCTET}(\\.${IPV4_OCTET}){3}(\\/(3[0-2]|[12]?\\d))?$`);

export function isValidStarfleetName(name) {
  return /^[a-z][a-z0-9]{0,49}$/.test(name || '');
}

export function parseAllowlist(text) {
  const cidrs = (text || '').split(',').map((s)=>s.trim()).filter((s)=>s);
  if (cidrs.length == 0) {
    return {cidrs, error: gettext('Add at least one IPv4 address or range, or the database will not accept any connections.')};
  }
  if (cidrs.length > MAX_ALLOWLIST) {
    return {cidrs, error: gettext('At most %s addresses or ranges are allowed.', MAX_ALLOWLIST)};
  }
  const bad = cidrs.find((c)=>!IPV4_CIDR.test(c));
  if (bad) {
    return {cidrs, error: gettext('"%s" is not a valid IPv4 address or CIDR range.', bad)};
  }
  return {cidrs, error: null};
}

export class StarfleetCredSchema extends BaseUISchema {
  constructor(initValues = {}) {
    super({client_id: '', client_secret: '', ...initValues});
  }

  get baseFields() {
    return [
      {
        id: 'client_id', label: gettext('Auth ID'), type: 'text',
        mode: ['create'], noEmpty: true,
        helpMessage: gettext('Create an API client in the pgEdge Starfleet console under Settings > API Clients.'),
      },
      {
        id: 'client_secret', label: gettext('Auth secret'), type: 'password',
        mode: ['create'], noEmpty: true,
        controlProps: { autoComplete: 'new-password' },
      },
    ];
  }
}

export class StarfleetInstanceSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      name: '', display_name: '', region: '', size: '',
      pg_version: '', ip_allowlist: '', role: 'admin',
      ...initValues,
    });
    this.fieldOptions = {...fieldOptions};
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Database name'), type: 'text',
        mode: ['create'], noEmpty: true,
        helpMessage: gettext('Lowercase letters and digits only, starting with a letter; up to 50 characters.'),
      },
      {
        id: 'display_name', label: gettext('Display name'), type: 'text',
        mode: ['create'], helpMessage: gettext('Optional; up to 25 characters.'),
      },
      {
        id: 'region', label: gettext('Region'), mode: ['create'],
        type: 'select', options: this.fieldOptions.regions,
        controlProps: { allowClear: false },
      },
      {
        id: 'size', label: gettext('Size'), mode: ['create'],
        type: 'select', options: this.fieldOptions.sizes,
        controlProps: { allowClear: false },
      },
      {
        id: 'pg_version', label: gettext('PostgreSQL version'), mode: ['create'],
        type: 'select', options: this.fieldOptions.pgVersions,
        controlProps: { allowClear: false },
      },
      {
        id: 'ip_allowlist', label: gettext('Allowed IP addresses'), type: 'text',
        mode: ['create'],
        helpMessage: gettext('IPv4 addresses or CIDR ranges allowed to connect, separated by commas. Prefilled with your public IP address.'),
      },
      {
        id: 'role', label: gettext('Connect as'), type: 'select',
        mode: ['create'], controlProps: { allowClear: false },
        options: [
          {label: gettext('admin (database administrator, not a superuser)'), value: 'admin'},
          {label: gettext('app (application user)'), value: 'app'},
        ],
      },
    ];
  }

  validate(state, setError) {
    if (!isEmptyString(state.name) && !isValidStarfleetName(state.name)) {
      setError('name', gettext('Use lowercase letters and digits only, starting with a letter; up to 50 characters.'));
      return true;
    }
    if ((state.display_name || '').length > 25) {
      setError('display_name', gettext('The display name can be at most 25 characters.'));
      return true;
    }
    const {error} = parseAllowlist(state.ip_allowlist);
    if (error) {
      setError('ip_allowlist', error);
      return true;
    }
    return false;
  }
}

export class StarfleetDatabaseSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({gid: undefined, ...initValues});
    this.fieldOptions = {...fieldOptions};
  }

  get baseFields() {
    return [
      {
        id: 'gid', label: gettext('pgAdmin server group'), type: 'select',
        options: this.fieldOptions.server_groups, mode: ['create'],
        controlProps: { allowClear: false }, noEmpty: true,
        helpMessage: gettext('pgEdge Starfleet generates the database password. It is shown once when the deployment finishes, with an option to save it.'),
      },
    ];
  }
}
