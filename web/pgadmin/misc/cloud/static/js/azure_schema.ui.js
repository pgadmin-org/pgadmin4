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
import pgAdmin from 'sources/pgadmin';

class AzureCredSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}, eventBus) {
    super({
      oid: null,
      auth_type: 'interactive_browser_credential',
      azure_tenant_id: '',
      azure_subscription_id: '',
      is_authenticating: false,
      is_authenticated: false,
      auth_code: '',
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

  validate(state, setErrMsg) {
    let isError = false;
    if (state.auth_type == 'interactive_browser_credential' && state.azure_tenant_id == '') {
      isError = true;
      setErrMsg(
        'azure_tenant_id',
        gettext('Azure Tenant ID is required for Azure interactive authentication.')
      );
    }
    return isError;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'auth_type',
        label: gettext('Authenticate via'),
        type: 'toggle',
        mode: ['create'],
        noEmpty: true,
        options: [
          {
            label: gettext('Interactive Browser'),
            value: 'interactive_browser_credential',
          },
          {
            label: gettext('Azure CLI'),
            value: 'azure_cli_credential',
          },
        ],
        disabled: pgAdmin.server_mode == 'True' ? true : false,
        helpMessage: gettext(
          'Azure CLI will use the currently logged in identity through the Azure CLI on the local machine. Interactive Browser will open a browser window to authenticate a user interactively.'
        ),
      },
      {
        id: 'azure_tenant_id',
        label: gettext('Azure tenant id'),
        type: 'text',
        mode: ['create'],
        deps: ['auth_type'],
        helpMessage: gettext(
          'Enter the Azure tenant ID against which the user is authenticated.'
        ),
        disabled: (state) => {
          return state.auth_type == 'interactive_browser_credential'
            ? false
            : true;
        },
        depChange: (state) => {
          if (state.auth_type == 'azure_cli_credential') {
            state.azure_tenant_id = '';
          }
          this.eventBus.fireEvent('SET_CRED_VERIFICATION_INITIATED', false);
          this.eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD',['', '']);
        },
      },
      {
        id: 'auth_btn',
        mode: ['create'],
        deps: ['auth_type', 'azure_tenant_id'],
        type: 'button',
        btnName: gettext('Click here to authenticate yourself to Microsoft Azure'),
        helpMessage: gettext(
          'After clicking the button above you will be redirected to the Microsoft Azure authentication page in a new browser tab if the Interactive Browser option is selected.'
        ),
        depChange: (state, source)=> {
          if(source == 'auth_type' || source == 'azure_tenant_id'){
            return {is_authenticated: false, auth_code: ''};
          }
          if(source == 'auth_btn') {
            return {is_authenticating: true};
          }
        },
        deferredDepChange: (state, source)=>{
          return new Promise((resolve, reject)=>{
            /* button clicked */
            if(source == 'auth_btn') {
              obj.fieldOptions.authenticateAzure(state.auth_type, state.azure_tenant_id)
                .then(()=>{
                  resolve(()=>({
                    is_authenticated: true,
                    is_authenticating: false,
                    auth_code: ''
                  }));
                })
                .catch((err)=>{
                  reject(err);
                });
            }
          });
        },
        disabled: (state)=> {
          if(state.auth_type == 'interactive_browser_credential' && state.azure_tenant_id == ''){
            return true;
          }
          return state.is_authenticating || state.is_authenticated;
        },
      },
      {
        id: 'is_authenticating',
        visible: false,
        type: '',
        deps:['auth_btn'],
        deferredDepChange: (state, source)=>{
          return new Promise((resolve, reject)=>{
            if(source == 'auth_btn' && state.auth_type == 'interactive_browser_credential' && state.is_authenticating ) {
              obj.fieldOptions.getAuthCode()
                .then((res)=>{
                  resolve(()=>{
                    return {
                      is_authenticating: false,
                      auth_code: res.data.data.user_code,
                    };
                  });
                })
                .catch((err)=>{
                  reject(err);
                });
            }
          });
        },
      },
      {
        id: 'auth_code',
        mode: ['create'],
        deps: ['auth_btn'],
        type: (state)=>({
          type: 'note',
          text: `To complete the authenticatation, use a web browser to open the page https://microsoft.com/devicelogin and enter the code : <strong>${state.auth_code}</strong>`,
        }),
        visible: (state)=>{
          return Boolean(state.auth_code);
        },
        controlProps: {
          raw: true,
        }
      }
    ];
  }
}

class AzureProjectDetailsSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      subscription: '',
      new_resource_group: false,
      resource_group: '',
      regions: '',
      availability_zones: '',
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
        id: 'subscription',
        label: gettext('Subscription'),
        mode: ['create'],
        type: () => {
          return {
            type: 'select',
            options: this.fieldOptions.subscriptions,
            controlProps: {
              allowClear: false,
              filter: (options) => {
                if (options.length == 0) return;
                let _options = [];
                options.forEach((option) => {
                  _options.push({
                    label:
                      option.subscription_name + ' | ' + option.subscription_id,
                    value: option.subscription_id,
                  });
                });
                return _options;
              },
            },
          };
        },
      },
      {
        id: 'resource_group',
        label: gettext('Resource group'),
        mode: ['create'],
        deps: ['subscription'],
        type: (state) => {
          return {
            type: 'select',
            options: state.subscription
              ? () => this.fieldOptions.resourceGroups(state.subscription)
              : [],
            optionsReloadBasis: state.subscription,
            controlProps: {
              creatable: true,
              allowClear: false,
            },
          };
        },
      },
      {
        id: 'region',
        label: gettext('Location'),
        mode: ['create'],
        deps: ['subscription'],
        type: (state) => {
          return {
            type: 'select',
            options: state.subscription
              ? () => this.fieldOptions.regions(state.subscription)
              : [],
            optionsReloadBasis: state.subscription,
            allowClear: false,
          };
        },
      },
      {
        id: 'availability_zone',
        label: gettext('Availability zone'),
        deps: ['region'],
        allowClear: false,
        type: (state) => {
          return {
            type: 'select',
            options: state.region
              ? () => this.fieldOptions.availabilityZones(state.region)
              : [],
            optionsReloadBasis: state.region,
          };
        },
      },
    ];
  }
}

class AzureInstanceSchema extends BaseUISchema {
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
        type: (state) => {
          return {
            type: 'select',
            options: state.availability_zone
              ? () => this.fieldOptions.versionOptions(state.availability_zone)
              : [],
            optionsReloadBasis: state.availability_zone,
          };
        },
      },
      {
        id: 'db_instance_class',
        label: gettext('Instance class'),
        type: 'select',
        options: [
          {
            label: gettext('Burstable (1-2 vCores) '),
            value: 'Burstable' },
          {
            label: gettext('General Purpose (2-64 vCores)'),
            value: 'GeneralPurpose',
          },
          {
            label: gettext('Memory Optimized (2-64 vCores)'),
            value: 'MemoryOptimized',
          },
        ],
      },
      {
        id: 'instance_type',
        label: gettext('Instance type'),
        deps: ['db_version', 'db_instance_class'],
        depChange: (state, source)=>{
          if(source[0] == 'db_instance_class'){
            state.instance_type = undefined;
          }
        },
        type: (state) => {
          return {
            type: 'select',
            options: () => this.fieldOptions.instanceOptions(state.db_version,state.availability_zone),
            optionsReloadBasis: state.db_version + state.db_instance_class,
            controlProps: {
              allowClear: false,
              filter: (options) => {
                if (options.length == 0 || state.db_instance_class === undefined)
                  return;
                let _options = [];
                options.forEach((option) => {
                  if (option.type == state.db_instance_class) {
                    _options.push({
                      label: option.label,
                      value: option.value,
                    });
                  }
                });
                return _options;
              },
            },
          };
        },
      },
      {
        id: 'storage_size',
        label: gettext('Storage Size'),
        deps: ['db_version', 'db_instance_class'],
        type: (state) => {
          return {
            type: 'select',
            options: () => this.fieldOptions.storageOptions(state.db_version, state.availability_zone),
            optionsReloadBasis: state.db_version + (state.db_instance_class || 'Burstable'),
            controlProps: {
              allowClear: false,
              filter: (opts) => {
                if (opts.length == 0 || state.db_instance_class === undefined)
                  return;
                let _options = [];
                opts.forEach((opt) => {
                  if (opt.type == state.db_instance_class) {
                    _options.push({
                      label: opt.label,
                      value: opt.value,
                    });
                  }
                });
                return _options;
              },
            },
          };
        },
      },
    ];
  }
}

class AzureDatabaseSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      gid: undefined,
      db_username: '',
      db_password: '',
      db_confirm_password: '',
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  validateDbUserName(data, setErrMsg) {
    if (data.db_username.length < 1 && data.db_username.length > 63 && !/^[A-Za-z0-9]*$/.test(data.db_username)) {
      setErrMsg(
        'db_username',
        gettext('The Admin username must be between 1-63 characters long, and must only contain alphabetic characters and numbers.')
      );
      return true;
    }

    if (
      ['azure_superuser', 'azure_pg_admin', 'admin', 'administrator', 'root', 'guest', 'public'].includes(data.db_username) ||
      data.db_username.startsWith('pg_')) {
      setErrMsg('db_username', gettext('Specified Admin username is not allowed.'));
      return true;
    }
    return false;
  }

  validateDbPassword(data, setErrMsg) {
    if (
      !isEmptyString(data.db_password) &&
      !isEmptyString(data.db_confirm_password) &&
      data.db_password != data.db_confirm_password
    ) {
      setErrMsg('db_confirm_password', gettext('Passwords do not match.'));
      return true;
    }
    if (!isEmptyString(data.db_confirm_password) && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$@!%&*?])[A-Za-z\d#$@!%&*?]{8,128}$/.test(data.db_confirm_password)) {
      setErrMsg(
        'db_confirm_password',
        gettext(
          'The password must be 8-128 characters long and must contain characters from three of the following categories - English uppercase letters, English lowercase letters, numbers (0-9), and non-alphanumeric characters (!, $, #, %, etc.)'
        )
      );
      return true;
    }
    return false;
  }

  validate(data, setErrMsg) {
    return this.validateDbUserName(data, setErrMsg) || this.validateDbPassword(data, setErrMsg);
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
        helpMessage: gettext(
          'The admin username must be 1-63 characters long and can only contain characters, numbers and the underscore character. The username cannot be "azure_superuser", "azure_pg_admin", "admin", "administrator", "root", "guest", "public", or start with "pg_".'
        ),
      },
      {
        id: 'db_password',
        label: gettext('Password'),
        type: 'password',
        mode: ['create'],
        noEmpty: true,
        helpMessage: gettext(
          'The password must be 8-128 characters long and must contain characters from three of the following categories - English uppercase letters, English lowercase letters, numbers (0-9), and non-alphanumeric characters (!, $, #, %, etc.), and cannot contain all or part of the login name'
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
}

class AzureNetworkSchema extends BaseUISchema {
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
        helpMessage: gettext(
          'List of IP addresses or range of IP addresses (start IP Address - end IP address) from which inbound traffic should be accepted. Add multiple IP addresses/ranges separated with commas, for example: "192.168.0.50, 192.168.0.100 -  192.168.0.200"'
        ),
      },
    ];
  }
}

class AzureHighAvailabilitySchema extends BaseUISchema {
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
        label: gettext('Zone redundant high availability'),
        type: 'switch',
        mode: ['create'],
        deps: ['region', 'db_instance_class'],
        depChange: (state, source, topState, actionObj) => {
          state._is_zone_redundant_ha_supported = false;
          if (state.region != actionObj.oldState.region) {
            state.high_availability = false;
            this.fieldOptions
              .zoneRedundantHaSupported(state.region)
              .then((res) => {
                state._is_zone_redundant_ha_supported = res.is_zone_redundant_ha_supported;
              });
          }
          if (state.db_instance_class != 'Burstable') {
            state._is_zone_redundant_ha_supported = true;
          }
        },
        disabled: (state) => {
          if (isEmptyString(state.region) || state.db_instance_class == 'Burstable') {
            state.high_availability = false;
            return true;
          } else {
            return !state._is_zone_redundant_ha_supported;
          }
        },
        helpMessage: gettext(
          'Zone redundant high availability deploys a standby replica in a different zone. The Burstable instance type does not support high availability.'
        ),
      },
    ];
  }
}

class AzureClusterSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      name: '',
      // Need to initilize child class init values in parent class itself
      public_ips: initValues?.hostIP.split('/')[0],
      db_instance_class: 'Burstable',
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
    this.initValues = initValues;

    this.azureProjectDetails = new AzureProjectDetailsSchema(
      {
        subscriptions: this.fieldOptions.subscriptions,
        resourceGroups: this.fieldOptions.resourceGroups,
        regions: this.fieldOptions.regions,
        availabilityZones: this.fieldOptions.availabilityZones,
      },
      {}
    );

    this.azureInstanceDetails = new AzureInstanceSchema(
      {
        versionOptions: this.fieldOptions.versionOptions,
        instanceOptions: this.fieldOptions.instanceOptions,
        storageOptions: this.fieldOptions.storageOptions,
      },
      {}
    );

    this.azureNetworkSchema = new AzureNetworkSchema({}, {});

    this.azureHighAvailabilitySchema = new AzureHighAvailabilitySchema(
      {
        zoneRedundantHaSupported: this.fieldOptions.zoneRedundantHaSupported,
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
        schema: this.azureProjectDetails,
      },
      {
        type: 'nested-fieldset',
        label: gettext('Version & Instance'),
        mode: ['create'],
        schema: this.azureInstanceDetails,
      },
      {
        type: 'nested-fieldset',
        label: gettext('Network Connectivity'),
        mode: ['create'],
        schema: this.azureNetworkSchema,
      },
      {
        type: 'nested-fieldset',
        label: gettext('Availability'),
        mode: ['create'],
        schema: this.azureHighAvailabilitySchema,
      },
    ];
  }

  validateProjectDetails(data, setErr){
    if(isEmptyString(data.subscription)){
      setErr('subscription',gettext('Subscription cannot be empty.'));
      return true;
    }

    if(isEmptyString(data.resource_group)){
      setErr('resource_group',gettext('Resource group cannot be empty.'));
      return true;
    }

    if(isEmptyString(data.region)){
      setErr('region',gettext('Location cannot be empty.'));
      return true;
    }
  }

  validateInstanceDetails(data, setErr){
    if(isEmptyString(data.availability_zone)){
      setErr('availability_zone',gettext('Availability zone cannot be empty.'));
      return true;
    }

    if(isEmptyString(data.db_version)){
      setErr('db_version',gettext('Database version cannot be empty.'));
      return true;
    }

    if(isEmptyString(data.db_instance_class)){
      setErr('db_instance_class',gettext('Instance class cannot be empty.'));
      return true;
    }
  }

  validateNetworkDetails(data, setErr){
    if(isEmptyString(data.instance_type)){
      setErr('instance_type',gettext('Instance type cannot be empty.'));
      return true;
    }

    if(isEmptyString(data.storage_size)){
      setErr('storage_size',gettext('Storage size cannot be empty.'));
      return true;
    }

    if(isEmptyString(data.public_ips)){
      setErr('public_ips',gettext('Public IP range cannot be empty.'));
      return true;
    }
  }

  validate(data, setErr) {
    if ( !isEmptyString(data.name) && (!/^[a-z0-9\-]*$/.test(data.name) || data.name.length < 3)) {
      setErr('name',gettext('Name must be more than 2 characters and must only contain lowercase letters, numbers, and hyphens'));
      return true;
    }

    return (this.validateProjectDetails(data, setErr) || this.validateInstanceDetails(data, setErr) || this.validateNetworkDetails(data, setErr));
  }
}

export { AzureCredSchema, AzureClusterSchema, AzureDatabaseSchema };
