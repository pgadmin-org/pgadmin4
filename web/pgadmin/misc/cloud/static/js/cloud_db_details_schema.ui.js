/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
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
      aws_name: '',
      aws_public_ip: initValues.hostIP,
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
        id: 'aws_name', label: gettext('Instance name'), type: 'text',
        mode: ['create'], noEmpty: true,
      }, {
        id: 'aws_public_ip', label: gettext('Public IP range'), type: 'text',
        mode: ['create'],
        helpMessage: gettext('IP Address range for permitting the inbound traffic. Ex: 127.0.0.1/32, add multiple ip addresses/ranges by comma separated.'),
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
      },
    ];
  }
}


class CloudDBCredSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: null,
      aws_region: '',
      aws_access_key: '',
      aws_secret_access_key: '',
      aws_session_token: '',
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
        id: 'aws_region', label: gettext('Region'),
        type: 'select',
        options: this.fieldOptions.regions,
        controlProps: { allowClear: false },
        noEmpty: true,
        helpMessage: gettext('The cloud instance will be deployed in the selected region.')
      },{
        id: 'aws_access_key', label: gettext('AWS access key'), type: 'text',
        mode: ['create'], noEmpty: true,
      }, {
        id: 'aws_secret_access_key', label: gettext('AWS secret access key'), type: 'text',
        mode: ['create'], noEmpty: true,
      }, {
        id: 'aws_session_token', label: gettext('AWS session token'), type: 'multiline',
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
      aws_db_name: '',
      aws_db_username: '',
      aws_db_password: '',
      aws_db_confirm_password: '',
      aws_db_port: 5432,
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };

  }

  validate(data, setErrMsg) {
    if(!isEmptyString(data.aws_db_password) && !isEmptyString(data.aws_db_confirm_password)
    && data.aws_db_password != data.aws_db_confirm_password) {
      setErrMsg('aws_db_confirm_password', gettext('Passwords do not match.'));
      return true;
    }
    if (!isEmptyString(data.aws_db_confirm_password) && data.aws_db_confirm_password.length < 8) {
      setErrMsg('aws_db_confirm_password', gettext('Password must be 8 characters or more.'));
      return true;
    }
    if (data.aws_db_confirm_password.includes('\'') || data.aws_db_confirm_password.includes('"') ||
    data.aws_db_confirm_password.includes('@') || data.aws_db_confirm_password.includes('/')) {
      setErrMsg('aws_db_confirm_password', gettext('Invalid passowrd.'));
      return true;
    }

    return false;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [{
      id: 'gid', label: gettext('Server group'), type: 'select',
      options: this.fieldOptions.server_groups,
      mode: ['create'],
      controlProps: { allowClear: false },
      noEmpty: true,
    }, {
      id: 'aws_db_name', label: gettext('Database name'), type: 'text',
      mode: ['create'], noEmpty: true,
    }, {
      id: 'aws_db_username', label: gettext('Username'), type: 'text',
      mode: ['create'], noEmpty: true,
    }, {
      id: 'aws_db_password', label: gettext('Password'), type: 'password',
      mode: ['create'], noEmpty: true,
      helpMessage: gettext('At least 8 printable ASCII characters. Can not contain any of the following: / \(slash\), \'\(single quote\), "\(double quote\) and @ \(at sign\).')
    }, {
      id: 'aws_db_confirm_password', label: gettext('Confirm password'),
      type: 'password',
      mode: ['create'], noEmpty: true,
    }, {
      id: 'aws_db_port', label: gettext('Port'), type: 'text',
      mode: ['create'], noEmpty: true,
    }];
  }
}

export class InstanceSchema extends BaseUISchema {
  constructor(versionOpts, instanceOpts, getInstances) {
    super({
      aws_db_version: '',
      aws_db_instance_class: 'm',
      aws_instance_type: '',
      reload_instances: true,
    });
    this.versionOpts = versionOpts;
    this.instanceOpts = instanceOpts;
    this.getInstances = getInstances;
    this.instanceData = [];
  }

  get baseFields() {
    return [{
      id: 'aws_db_version', label: gettext('Database version'),
      type: 'select',
      options: this.versionOpts,
      controlProps: { allowClear: false },
      deps: ['aws_name'],
      noEmpty: true,
    },{
      id: 'aws_db_instance_class', label: gettext('Instance class'),
      type: 'toggle',
      options: [
        {'label': gettext('Standard classes (includes m classes)'), value: 'm'},
        {'label': gettext('Memory optimized classes (includes r & x classes)'), value: 'x'},
        {'label': gettext('Burstable classes (includes t classes)'), value: 't'},
      ],  noEmpty: true, orientation: 'vertical',
    },{
      id: 'aws_instance_type', label: gettext('Instance type'),
      options: this.instanceOpts,  noEmpty: true,
      controlProps: { allowClear: false },
      deps: ['aws_db_version', 'aws_db_instance_class'],
      depChange: (state, source)=> {
        if (source[0] == 'aws_db_instance_class') {
          return {reload_instances: false};
        } else {
          state.instanceData = [];
          return {reload_instances: true};
        }
      },
      type: (state) => {
        return {
          type: 'select',
          options: ()=>this.getInstances(state.aws_db_version,
            state.reload_instances, state.instanceData),
          optionsLoaded: (options) => { state.instanceData = options; },
          optionsReloadBasis: state.aws_db_version + (state.aws_db_instance_class || 'm'),
          controlProps: {
            allowClear: false,
            filter: (options) => {
              if (options.length == 0) return;
              let pattern = 'db.m';
              let pattern_1 = 'db.m';

              if (state.aws_db_instance_class) {
                pattern = 'db.' + state.aws_db_instance_class;
                pattern_1 = 'db.' + state.aws_db_instance_class;
              }
              if (state.aws_db_instance_class == 'x') {
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
      aws_storage_type: 'io1',
      aws_storage_size: 100,
      aws_storage_IOPS: 3000,
      aws_storage_msg: 'Minimum: 20 GiB. Maximum: 16,384 GiB.'
    });
  }

  get baseFields() {
    return [
      {
        id: 'aws_storage_type', label: gettext('Storage type'), type: 'select',
        mode: ['create'],
        options: [
          {'label': gettext('General Purpose SSD (gp2)'), 'value': 'gp2'},
          {'label': gettext('Provisioned IOPS SSD (io1)'), 'value': 'io1'},
          {'label': gettext('Magnetic'), 'value': 'standard'}
        ], noEmpty: true,
      },{
        id: 'aws_storage_size', label: gettext('Allocated storage'), type: 'text',
        mode: ['create'], noEmpty: true, deps: ['aws_storage_type'],
        depChange: (state, source)=> {
          if (source[0] !== 'aws_storage_size')
            if(state.aws_storage_type === 'io1') {
              return {aws_storage_size: 100};
            } else if(state.aws_storage_type === 'gp2') {
              return {aws_storage_size: 20};
            } else {
              return {aws_storage_size: 5};
            }
        },
        helpMessage: gettext('Size in GiB.')
      }, {
        id: 'aws_storage_IOPS', label: gettext('Provisioned IOPS'), type: 'text',
        mode: ['create'],
        visible: (state) => {
          if(state.aws_storage_type === 'io1') return true;
          return false;
        } , deps: ['aws_storage_type'],
        depChange: (state, source) => {
          if (source[0] !== 'aws_storage_IOPS') {
            if(state.aws_storage_type === 'io1') {
              return {aws_storage_IOPS: 3000};
            }
          }
        },
      },
    ];
  }
}

export {
  CloudInstanceDetailsSchema,
  CloudDBCredSchema,
  DatabaseSchema,
};
