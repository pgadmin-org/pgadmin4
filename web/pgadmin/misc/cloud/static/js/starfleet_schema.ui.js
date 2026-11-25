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
import _ from 'lodash';

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

export const AUTH_USER = 'user';
export const AUTH_API_CLIENT = 'api_client';

// The note shown whilst a sign-in waits for the user, and once it is done.
export function signInNote(state) {
  if (state.is_signed_in) {
    return gettext('Signed in to pgEdge Starfleet.');
  }
  if (!state.user_code) return '';
  const url = state.verification_uri_complete || state.verification_uri;
  const link = `<a href="${_.escape(url)}" target="_blank" rel="noopener noreferrer">${_.escape(url)}</a>`;
  return gettext('Open %s in a web browser on any device, sign in with your pgEdge account, and check that the page shows the code <strong>%s</strong> before confirming it. Only confirm a code that you requested yourself.',
    link, _.escape(state.user_code));
}

export class StarfleetCredSchema extends BaseUISchema {
  // fieldOptions.userSignin says whether user sign-in is available, and
  // fieldOptions.signIn(onCode) runs one, resolving to its result.
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      auth_method: fieldOptions.userSignin ? AUTH_USER : AUTH_API_CLIENT,
      client_id: '', client_secret: '',
      is_signing_in: false, is_signed_in: false,
      user_code: '', verification_uri: '', verification_uri_complete: '',
      tenants: [], tenant_id: '',
      ...initValues,
    });
    this.fieldOptions = {...fieldOptions};
  }

  setData(data) {
    const schemaState = this.state;
    if (!schemaState) return;
    // Through the schema state, so that the fields depending on these
    // values are re-evaluated.
    Object.entries(data).forEach(([key, value]) => {
      schemaState.setUnpreparedData([key], value);
    });
  }

  signIn() {
    this.setData({is_signing_in: true, is_signed_in: false, user_code: '',
      verification_uri: '', verification_uri_complete: '', tenants: [],
      tenant_id: ''});
    return this.fieldOptions.signIn((code)=>{
      this.setData({
        user_code: code.user_code,
        verification_uri: code.verification_uri,
        verification_uri_complete: code.verification_uri_complete || '',
      });
    }).then((result)=>{
      if (!result) return;
      this.setData({is_signing_in: false, is_signed_in: true,
        user_code: '', tenants: result.tenants || [],
        tenant_id: result.tenant_id || ''});
    }).catch(()=>{
      this.setData({is_signing_in: false, user_code: ''});
    });
  }

  get baseFields() {
    const isUser = (state)=>state.auth_method == AUTH_USER;
    return [
      {
        id: 'auth_method', label: gettext('Authenticate with'), type: 'toggle',
        mode: ['create'], noEmpty: true,
        options: [
          {label: gettext('Sign in with pgEdge'), value: AUTH_USER},
          {label: gettext('API client credentials'), value: AUTH_API_CLIENT},
        ],
        visible: ()=>Boolean(this.fieldOptions.userSignin),
        disabled: (state)=>state.is_signing_in,
        helpMessage: gettext('Sign in with your pgEdge account in a web browser, or use the credentials of a pgEdge Starfleet API client.'),
      },
      {
        id: 'signin_btn', mode: ['create'], type: 'button',
        deps: ['auth_method', 'is_signing_in'],
        btnName: gettext('Sign in'),
        visible: isUser,
        disabled: (state)=>state.is_signing_in,
        onClick: ()=>{
          // After the click has been handled, as Azure's sign-in does.
          setTimeout(()=>this.signIn(), 0);
        },
      },
      {
        id: 'signin_note', mode: ['create'],
        deps: ['auth_method', 'user_code', 'is_signed_in'],
        type: (state)=>({type: 'note', text: signInNote(state)}),
        visible: (state)=>isUser(state) && Boolean(signInNote(state)),
        controlProps: {raw: true},
      },
      {
        id: 'tenant_id', label: gettext('Tenant'), mode: ['create'],
        deps: ['auth_method', 'tenants', 'is_signed_in'],
        type: (state)=>({type: 'select', options: state.tenants || [],
          controlProps: {allowClear: false}}),
        visible: (state)=>isUser(state) && state.is_signed_in &&
          (state.tenants || []).length > 1,
        helpMessage: gettext('The pgEdge Starfleet tenant to create the database in.'),
      },
      {
        id: 'client_id', label: gettext('Auth ID'), type: 'text',
        mode: ['create'], deps: ['auth_method'],
        visible: (state)=>!isUser(state),
        helpMessage: gettext('Create an API client in the pgEdge Starfleet console under Settings > API Clients.'),
      },
      {
        id: 'client_secret', label: gettext('Auth secret'), type: 'password',
        mode: ['create'], deps: ['auth_method'],
        visible: (state)=>!isUser(state),
        controlProps: { autoComplete: 'new-password' },
      },
      // Sign-in state that the wizard reads from the changed data.
      ...['is_signing_in', 'is_signed_in', 'user_code', 'verification_uri',
        'verification_uri_complete', 'tenants'].map((id)=>({
        id, mode: ['create'], visible: false, type: '',
      })),
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
