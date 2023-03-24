/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from 'sources/validators';

class GoogleCredSchema extends BaseUISchema{
  constructor(fieldOptions = {}, initValues = {}, eventBus={}) {
    super({
      oid: null,
      client_secret_file: undefined,
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };

    this.eventBus = eventBus;

  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'client_secret_file',
        label: gettext('Client secret file'),
        type: 'file',
        helpMessage: gettext('Select a client secrets file containing the client ID, client secret, and other OAuth 2.0 parameters for google authentication. Refer <a href="https://support.google.com/cloud/answer/6158849?hl=en#userconsent&zippy=%2Cuser-consent%2Cpublic-and-internal-applications" target="_blank">link</a> for creating client secret.'),
        controlProps: {
          dialogType: 'select_file',
          supportedTypes: ['json'],
          dialogTitle: 'Select file',
        },
      },
      {
        id: 'auth_btn',
        mode: ['create'],
        deps: ['client_secret_file'],
        type: 'button',
        btnName: gettext('Click here to authenticate yourself to Google'),
        helpMessage: gettext('After clicking the button above you will be redirected to the Google authentication page in a new browser tab.'),
        disabled: (state)=>{
          return state.client_secret_file ? false : true;
        },
        deferredDepChange: (state, source)=>{
          return new Promise((resolve, reject)=>{
            /* button clicked */
            if(source == 'auth_btn') {
              obj.fieldOptions.authenticateGoogle(state.client_secret_file)
                .then((apiRes)=>{
                  resolve(()=>{
                    if(apiRes){
                      obj.fieldOptions.verification_ack()
                        .then(()=>{
                          resolve();
                        })
                        .catch((err)=>{
                          reject(err);
                        });
                    }
                  });
                })
                .catch((err)=>{
                  reject(err);
                });
            }
          });
        }
      }
    ];}

}

class GoogleProjectDetailsSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      project: '',
      region: '',
      availability_zone: '',
      ...initValues,
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
        id: 'project',
        label: gettext('Project'),
        mode: ['create'],
        allowClear: false,
        noEmpty: true,
        type: () => {
          return {
            type: 'select',
            options: this.fieldOptions.projects
          };
        },
      },
      {
        id: 'region',
        label: gettext('Location'),
        mode: ['create'],
        deps: ['project'],
        noEmpty: true,
        type: (state) => {
          return {
            type: 'select',
            options: state.project
              ? () => this.fieldOptions.regions(state.project)
              : [],
            optionsReloadBasis: state.project,
            allowClear: false,
          };
        },
      },
      {
        id: 'availability_zone',
        label: gettext('Availability zone'),
        deps: ['region'],
        allowClear: false,
        noEmpty: true,
        type: (state) => {
          return {
            type: 'select',
            options: state.region
              ? () => this.fieldOptions.availabilityZones(state.region)
              : [],
            optionsReloadBasis: state.region,
          };
        },
      }
    ];
  }
}

class GoogleInstanceSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      db_version: '',
      instance_type: '',
      storage_size: '',
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
        id: 'db_version',
        label: gettext('Database version'),
        deps: ['availability_zone'],
        type: 'select',
        noEmpty: true,
        options: this.fieldOptions.dbVersions
      },
      {
        id: 'instance_class',
        label: gettext('Instance class'),
        type: 'select',
        noEmpty: true,
        options: [
          {
            label: gettext('Shared core'),
            value: 'shared' },
          {
            label: gettext('Standard'),
            value: 'standard',
          },
          {
            label: gettext('High Memory'),
            value: 'highmem',
          },
        ],
      },
      {
        id: 'instance_type',
        label: gettext('Instance type'),
        deps: ['instance_class'],
        noEmpty: true,
        type: (state) => {
          return {
            type: 'select',
            allowClear: false,
            options: state.instance_class
              ? () => this.fieldOptions.instanceTypes(state.project, state.region, state.instance_class)
              : [],
            optionsReloadBasis: state.instance_class
          };
        },
      }
    ];
  }
}  

class GoogleStorageSchema extends BaseUISchema {
  constructor() {
    super({
      storage_type: 'SSD',
    });
  }

  get baseFields() {
    return [
      {
        id: 'storage_type', 
        label: gettext('Storage type'), 
        type: 'select',
        mode: ['create'],
        noEmpty: true,
        options: [
          {'label': gettext('SSD'), 'value': 'PD_SSD'},
          {'label': gettext('HDD'), 'value': 'PD_HDD'},
        ], 
      },
      {
        id: 'storage_size', 
        label: gettext('Storage capacity'), 
        type: 'int',
        mode: ['create'], 
        noEmpty: true, 
        deps: ['storage_type'],
        helpMessage: gettext('Size in GB.'),
      }
    ];
  }

  validate(data, setErrMsg) {
    if (data.storage_size && (data.storage_size < 9 ||  data.storage_size > 65536)) {
      setErrMsg('storage_size', gettext('Please enter the value between 10 and 65,536.'));
      return true;
    }
    return false;
  }
}

class GoogleNetworkSchema extends BaseUISchema {
  constructor() {
    super();
  }

  get baseFields() {
    return [
      {
        id: 'public_ips',
        label: gettext('Public IP range'),
        type: 'text',
        mode: ['create'],
        noEmpty: true,
        helpMessage: gettext('IP address range for allowed inbound traffic, for example: 127.0.0.1/32. Add multiple IP addresses/ranges separated with commas.'
        ),
      },
    ];
  }
}

class GoogleHighAvailabilitySchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      high_availability: false,
      ...initValues,
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
        id: 'high_availability',
        label: gettext('High availability?'),
        type: 'switch',
        helpMessage: gettext(''),
      },
      {
        id: 'secondary_availability_zone',
        label: gettext('Secondary availability zone'),
        deps: ['high_availability'],
        allowClear: false,
        disabled:(state)=> {
          if (!state.high_availability){
            state.secondary_availability_zone = '';
          }
          return!state.high_availability;},
        type: (state) => {
          return {
            type: 'select',
            options: state.region
              ? () => this.fieldOptions.availabilityZones(state.region)
              : [],
            optionsReloadBasis: state.region,
          };
        },
        helpMessage: gettext(''),
      }
    ];
  }

  validate(data, setErrMsg) {
    if (data.high_availability && (isEmptyString(data.secondary_availability_zone)) || (data.secondary_availability_zone == data.availability_zone)) {
      setErrMsg('secondary_availability_zone', gettext('Please select Secondary availability zone different than primary.'));
      return true;
    }
    return false;
  }
}

class GoogleDatabaseSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      gid: undefined,
      db_username: 'postgres',
      db_password: '',
      db_confirm_password: '',
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
  }


  get baseFields() {
    return [
      {
        id: 'gid',
        label: gettext('pgAdmin server group'),
        type: 'select',
        options: this.fieldOptions.server_groups,
        mode: ['create'],
        controlProps: { allowClear: false },
        noEmpty: true,
      },
      {
        id: 'db_username',
        label: gettext('Admin username'),
        type: 'text',
        mode: ['create'],
        noEmpty: true,
        disabled: true,
        helpMessage: gettext(
          'Admin username for your Google Cloud Sql PostgreSQL instance.'),
      },
      {
        id: 'db_password',
        label: gettext('Password'),
        type: 'password',
        mode: ['create'],
        noEmpty: true,
        helpMessage: gettext(
          'Set a password for the default admin user "postgres".'
        ),
      },
      {
        id: 'db_confirm_password',
        label: gettext('Confirm password'),
        type: 'password',
        mode: ['create'],
        noEmpty: true,
      },
    ];
  }

  validate(data, setErrMsg) {
    if (!isEmptyString(data.db_password) && !isEmptyString(data.db_confirm_password) && data.db_password != data.db_confirm_password) {
      setErrMsg('db_confirm_password', gettext('Passwords do not match.'));
      return true;
    }
    return false;
  }
}

class GoogleClusterSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      name: '',
      // Need to initilize child class init values in parent class itself
      public_ips: initValues?.hostIP,
      db_instance_class: undefined,
      high_availability: false,
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
    this.initValues = initValues;

    this.googleProjectDetails = new GoogleProjectDetailsSchema(
      {
        projects: this.fieldOptions.projects,
        regions: this.fieldOptions.regions,
        availabilityZones: this.fieldOptions.availabilityZones,
      },
      {}
    );

    this.googleInstanceDetails = new GoogleInstanceSchema(
      {
        dbVersions: this.fieldOptions.dbVersions,
        instanceTypes: this.fieldOptions.instanceTypes,
      },
      {}
    );
    
    this.googleStorageDetails = new GoogleStorageSchema(
      {},
      {}
    );  

    this.googleNetworkDetails = new GoogleNetworkSchema({}, {});

    this.googleHighAvailabilityDetails = new GoogleHighAvailabilitySchema(
      {
        availabilityZones: this.fieldOptions.availabilityZones,
      },
      {}
    );
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'name',
        label: gettext('Cluster name'),
        type: 'text',
        mode: ['create'],
        noEmpty: true,
      },
      {
        type: 'nested-fieldset',
        label: gettext('Project Details'),
        mode: ['create'],
        schema: this.googleProjectDetails,
      },
      {
        type: 'nested-fieldset',
        label: gettext('Version & Instance'),
        mode: ['create'],
        schema: this.googleInstanceDetails,
      },
      {
        type: 'nested-fieldset',
        label: gettext('Storage'),
        mode: ['create'],
        schema: this.googleStorageDetails,
      },
      {
        type: 'nested-fieldset',
        label: gettext('Network Connectivity'),
        mode: ['create'],
        schema: this.googleNetworkDetails,
      },
      {
        type: 'nested-fieldset',
        label: gettext('Availability'),
        mode: ['create'],
        schema: this.googleHighAvailabilityDetails,
      },
    ];
  }

  validate(data, setErr) {
    if ( !isEmptyString(data.name) && (!/^(?=[a-z])[a-z0-9\-]*$/.test(data.name) || data.name.length > 97)) {
      setErr('name',gettext('Name must only contain lowercase letters, numbers, and hyphens.Should start with a letter and must be 97 characters or less'));
      return true;
    }
    return false;
  }
}

export {GoogleCredSchema, GoogleClusterSchema, GoogleDatabaseSchema};
