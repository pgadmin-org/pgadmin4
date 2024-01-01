/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from 'sources/validators';


class CloudInstanceDetailsSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      name: '',
      public_ip: initValues.hostIP,
      high_availability: false,
      ...initValues
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
    this.initValues = initValues;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Instance name'), type: 'text',
        mode: ['create'], noEmpty: true,
      }, {
        id: 'public_ip', label: gettext('Public IP range'), type: 'text',
        mode: ['create'],
        helpMessage: gettext('IP address range for allowed inbound traffic, for example: 127.0.0.1/32. Add multiple IP addresses/ranges separated with commas.'),
      }, {
        type: 'nested-fieldset', label: gettext('Version & Instance'),
        mode: ['create'],
        schema: new InstanceSchema(this.fieldOptions.version,
          this.fieldOptions.instance_type,
          this.fieldOptions.getInstances),
      }, {
        type: 'nested-fieldset', label: gettext('Storage'),
        mode: ['create'],
        schema: new StorageSchema(),
      }, {
        type: 'nested-fieldset', label: gettext('Availability'),
        mode: ['create'],
        schema: new HighAvailablity(),
      },
    ];
  }
}


class CloudDBCredSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: null,
      region: '',
      access_key: '',
      secret_access_key: '',
      session_token: '',
      is_valid_cred: false,
      ...initValues
    });

    this.fieldOptions = {
      ...fieldOptions,
    };

  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'region', label: gettext('Region'),
        type: 'select',
        options: this.fieldOptions.regions,
        controlProps: { allowClear: false },
        noEmpty: true,
        helpMessage: gettext('The cloud instance will be deployed in the selected region.')
      },{
        id: 'access_key', label: gettext('AWS access key'), type: 'text',
        mode: ['create'], noEmpty: true,
      }, {
        id: 'secret_access_key', label: gettext('AWS secret access key'), type: 'password',
        mode: ['create'], noEmpty: true,
      }, {
        id: 'session_token', label: gettext('AWS session token'), type: 'multiline',
        mode: ['create'], noEmpty: false,
        helpMessage: gettext('Temporary AWS session required session token.')
      }
    ];
  }
}


class DatabaseSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues={}) {
    super({
      oid: undefined,
      gid: undefined,
      db_name: '',
      db_username: '',
      db_password: '',
      db_confirm_password: '',
      db_port: 5432,
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };

  }

  validate(data, setErrMsg) {
    if(!isEmptyString(data.db_password) && !isEmptyString(data.db_confirm_password)
    && data.db_password != data.db_confirm_password) {
      setErrMsg('db_confirm_password', gettext('Passwords do not match.'));
      return true;
    }
    if (!isEmptyString(data.db_confirm_password) && data.db_confirm_password.length < 8) {
      setErrMsg('db_confirm_password', gettext('Password must be 8 characters or more.'));
      return true;
    }
    if (data.db_confirm_password.includes('\'') || data.db_confirm_password.includes('"') ||
    data.db_confirm_password.includes('@') || data.db_confirm_password.includes('/')) {
      setErrMsg('db_confirm_password', gettext('Invalid passowrd.'));
      return true;
    }

    return false;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [{
      id: 'gid', label: gettext('pgAdmin server group'), type: 'select',
      options: this.fieldOptions.server_groups,
      mode: ['create'],
      controlProps: { allowClear: false },
      noEmpty: true,
    }, {
      id: 'db_name', label: gettext('Database name'), type: 'text',
      mode: ['create'], noEmpty: true,
    }, {
      id: 'db_username', label: gettext('Username'), type: 'text',
      mode: ['create'], noEmpty: true,
    }, {
      id: 'db_password', label: gettext('Password'), type: 'password',
      mode: ['create'], noEmpty: true,
      helpMessage: gettext('At least 8 printable ASCII characters. Cannot contain any of the following: / (slash), \'(single quote), "(double quote) and @ (at sign).')
    }, {
      id: 'db_confirm_password', label: gettext('Confirm password'),
      type: 'password',
      mode: ['create'], noEmpty: true,
    }, {
      id: 'db_port', label: gettext('Port'), type: 'text',
      mode: ['create'], noEmpty: true,
    }];
  }
}


export class InstanceSchema extends BaseUISchema {
  constructor(versionOpts, instanceOpts, getInstances) {
    super({
      db_version: '',
      db_instance_class: 'm',
      instance_type: '',
      reload_instances: true,
    });
    this.versionOpts = versionOpts;
    this.instanceOpts = instanceOpts;
    this.getInstances = getInstances;
    this.instanceData = [];
  }

  get baseFields() {
    return [{
      id: 'db_version', label: gettext('Database version'),
      type: 'select',
      options: this.versionOpts,
      controlProps: { allowClear: false },
      deps: ['name'],
      noEmpty: true,
    },{
      id: 'db_instance_class', label: gettext('Instance class'),
      type: 'select',
      options: [
        {'label': gettext('Standard classes (includes m classes)'), value: 'm'},
        {'label': gettext('Memory optimized classes (includes r & x classes)'), value: 'x'},
        {'label': gettext('Burstable classes (includes t classes)'), value: 't'},
      ],  noEmpty: true
    },{
      id: 'instance_type', label: gettext('Instance type'),
      options: this.instanceOpts,
      deps: ['db_version', 'db_instance_class'],
      depChange: (state, source)=> {
        if (source[0] == 'db_instance_class') {
          return {reload_instances: false};
        } else {
          state.instanceData = [];
          return {reload_instances: true};
        }
      },
      type: (state) => {
        return {
          type: 'select',
          options: ()=>this.getInstances(state.db_version,
            state.reload_instances, state.instanceData),
          optionsLoaded: (options) => { state.instanceData = options; },
          optionsReloadBasis: state.db_version + (state.db_instance_class || 'm'),
          controlProps: {
            allowClear: false,
            filter: (options) => {
              if (options.length == 0) return;
              let pattern = 'db.m';
              let pattern_1 = 'db.m';

              if (state.db_instance_class) {
                pattern = 'db.' + state.db_instance_class;
                pattern_1 = 'db.' + state.db_instance_class;
              }
              if (state.db_instance_class == 'x') {
                pattern_1 = 'db.' + 'r';
              }
              return options.filter((option) => {
                return (option.value.includes(pattern) || option.value.includes(pattern_1));
              });
            },
          }
        };
      },
    }];
  }
}


export class StorageSchema extends BaseUISchema {
  constructor() {
    super({
      storage_type: 'io1',
      storage_size: 100,
      storage_IOPS: 3000,
      storage_msg: 'Minimum: 20 GiB. Maximum: 16,384 GiB.'
    });
  }

  get baseFields() {
    return [
      {
        id: 'storage_type', label: gettext('Storage type'), type: 'select',
        mode: ['create'],
        options: [
          {'label': gettext('General Purpose SSD (gp3)'), 'value': 'gp3'},
          {'label': gettext('General Purpose SSD (gp2)'), 'value': 'gp2'},
          {'label': gettext('Provisioned IOPS SSD (io1)'), 'value': 'io1'},
          {'label': gettext('Magnetic'), 'value': 'standard'}
        ], noEmpty: true,
      },{
        id: 'storage_size', label: gettext('Allocated storage'), type: 'text',
        mode: ['create'], noEmpty: true, deps: ['storage_type'],
        depChange: (state, source)=> {
          if (source[0] !== 'storage_size')
            if(state.storage_type === 'io1') {
              return {storage_size: 100};
            } else if(state.storage_type === 'gp2' || state.storage_type === 'gp3') {
              return {storage_size: 20};
            } else {
              return {storage_size: 5};
            }
        },
        helpMessage: gettext('Size in GiB.')
      }, {
        id: 'storage_IOPS', label: gettext('Provisioned IOPS'), type: 'text',
        mode: ['create'],
        visible: (state) => {
          return state.storage_type === 'io1';
        } , deps: ['storage_type'],
        depChange: (state, source) => {
          if (source[0] !== 'storage_IOPS') {
            if(state.storage_type === 'io1') {
              return {storage_IOPS: 3000};
            }
          }
        },
      },
    ];
  }

  validate(data, setErrMsg) {
    if(!isEmptyString(data.storage_type) && (data.storage_type === 'gp2' || data.storage_type === 'gp3') && !isEmptyString(data.storage_size) && (data.storage_size < 4 || data.storage_size > 65536)) {
      setErrMsg('storage_size', gettext('Allocated storage should be between 20 - 65536 GiB.'));
      return true;
    }
    if(!isEmptyString(data.storage_type) && data.storage_type === 'io1' && !isEmptyString(data.storage_size) && (data.storage_size < 100 || data.storage_size > 65536)) {
      setErrMsg('storage_size', gettext('Allocated storage should be between 100 - 65536 GiB.'));
      return true;
    }
    if(!isEmptyString(data.storage_type) && data.storage_type === 'standard' && !isEmptyString(data.storage_size) && (data.storage_size < 5 || data.storage_size > 3072)) {
      setErrMsg('storage_size', gettext('Allocated storage should be between 5 - 3072 GiB.'));
      return true;
    }
    return false;
  }
}

export class HighAvailablity extends BaseUISchema {
  constructor() {
    super({
      high_availability: false
    });
  }
  get baseFields() {
    return [
      {
        id: 'high_availability',
        label: gettext('High availability'),
        type: 'switch',
        mode: ['create'],
        helpMessage: gettext(
          'Creates a standby in a different Availability Zone (AZ) to provide data redundancy, eliminate I/O freezes, and minimize latency spikes during system backups.'
        ),
      },
    ];
  }
}

export {
  CloudInstanceDetailsSchema,
  CloudDBCredSchema,
  DatabaseSchema
};
