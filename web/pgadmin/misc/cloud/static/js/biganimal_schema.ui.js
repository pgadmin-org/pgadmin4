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
import { CLOUD_PROVIDERS } from './cloud_constants';

class BigAnimalClusterTypeSchema extends BaseUISchema {

  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      project: '',
      cluster_type: '',
      replicas: 0,
      provider: '',
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

  validate(data, setErrMsg) {
    if (data.cluster_type == 'ha' && data.replicas == 0) {
      setErrMsg('replicas', gettext('Please select number of stand by replicas.'));
      return true;
    }
    return false;
  }

  get baseFields() {
    return [
      { id: 'project',
        label: gettext('Project'),
        mode: ['create'],
        noEmpty: true,
        type: () => {
          return {
            type: 'select',
            options: this.fieldOptions.projects
          };
        },

      },
      {
        id: 'cluster_type', label: gettext('Cluster type'),  noEmpty: true,
        type: () => {
          return {
            type: 'toggle',
            options: [
              {'label': gettext('Single Node'), value: 'single'},
              {'label': gettext('High Availability'), value: 'ha'},
              {'label': gettext('Extreme High Availability'), value: 'eha'},
            ],
          };
        },
      }, {
        id: 'replicas', label: gettext('Number of standby replicas'), type: 'select',
        mode: ['create'], deps: ['cluster_type'],
        controlProps: { allowClear: false },
        helpMessage: gettext('Adding standby replicas will increase your number of CPUs, as well as your cost.'),
        options: [
          {'label': gettext('1'), 'value': 1},
          {'label': gettext('2'), 'value': 2},
        ],
        disabled: (state) => {
          return state.cluster_type != 'ha';
        }
      }, { id: 'provider', label: gettext('Cluster provider'),  noEmpty: true,
        deps:['project'],
        type: (state) => {
          return {
            type: 'select',
            options: state.project
              ? () => this.fieldOptions.providers(state.project)
              : [],
            optionsReloadBasis: state.project,
            allowClear: false,
          };
        }
      },
    ];
  }
}

class BigAnimalInstanceSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues={}) {
    super({
      oid: undefined,
      instance_type: '',
      instance_series: '',
      instance_size: '',
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
        id: 'instance_type', label: gettext('Instance type'),
        mode: ['create'],
        deps: [['region']],
        type: (state) => {
          return {
            type: 'select',
            options: ()=>this.fieldOptions.instance_types(state.region, state.provider),
            optionsReloadBasis: state.region,
            optionsLoaded: (options) => { state.instanceData = options; },
            controlProps: {
              allowClear: false,
              filter: (options) => {
                if (options.length == 0) return;
                let _types = _.uniq(_.map(options, 'category')),
                  _options = [];
                _.forEach(_types, (region) => {
                  _options.push({
                    'label': region,
                    'value': region
                  });
                });
                return _options;
              },
            }
          };
        },
        noEmpty: true,
      },{
        id: 'instance_series', label: gettext('Instance series'),
        mode: ['create'], deps: ['instance_type'],
        type: (state) => {
          return {
            type: 'select',
            options: state.instanceData,
            optionsReloadBasis: state.instance_type,
            controlProps: {
              allowClear: false,
              filter: (options) => {
                if (options.length == 0) return;
                let _types = _.filter(options, {'category': state.instance_type}),
                  _options = [];
                _types = _.uniq(_.map(_types, 'familyName'));
                _.forEach(_types, (value) => {
                  _options.push({
                    'label': value,
                    'value': value
                  });
                });
                return _options;
              },
            }
          };
        },
        noEmpty: true,
      },{
        id: 'instance_size', label: gettext('Instance size'),
        mode: ['create'], deps: ['instance_series'],
        type: (state) => {
          return {
            type: 'select',
            options: state.instanceData,
            optionsReloadBasis: state.instance_series,
            controlProps: {
              allowClear: false,
              filter: (options) => {
                if (options.length == 0) return;
                let _types = _.filter(options, {'familyName': state.instance_series}),
                  _options = [];
                _.forEach(_types, (value) => {
                  _options.push({
                    'label': value.instanceTypeName + ' (' + value.cpu + 'vCPU, ' + value.ram + 'GB RAM)',
                    'value': value.instanceTypeName + ' (' + value.cpu + 'vCPU, ' + value.ram + 'GB RAM)' + '||' + value.instanceTypeId,
                  });
                });
                return _options;
              },
            }
          };
        }, noEmpty: true,
      },
    ];
  }
}


class BigAnimalVolumeSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      volume_type: '',
      volume_properties: '',
      volume_size: 4,
      volume_IOPS: '',
      ...initValues
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
    this.initValues = initValues;
    this.volumeType = '';
  }

  get idAttribute() {
    return 'oid';
  }

  validate(data, setErrMsg) {
    if (data.provider != CLOUD_PROVIDERS.AWS && isEmptyString(data.volume_properties)) {
      setErrMsg('replicas', gettext('Please select volume properties.'));
      return true;
    }
    if (data.provider == CLOUD_PROVIDERS.AWS) {
      if (isEmptyString(data.volume_IOPS)) {
        setErrMsg('replicas', gettext('Please select volume IOPS.'));
        return true;
      }
      if (!isEmptyString(data.volume_size)) {
        if( data.volume_IOPS != 'io2' && (data.volume_size < 1 ||  data.volume_size > 16384)) {
          setErrMsg('replicas', gettext('Please enter the volume size in the range between 1 tp 16384.'));
          return true;
        }
        if (data.volume_IOPS == 'io2' && (data.volume_size < 4 ||  data.volume_size > 16384)) {
          setErrMsg('replicas', gettext('Please enter the volume size in the range between 4 tp 16384.'));
          return true;
        }
      }
      if (!isEmptyString(data.volume_IOPS)) {
        if(data.volume_IOPS != 'io2' && data.volume_IOPS != 3000) {
          setErrMsg('replicas', gettext('Please enter the volume IOPS 3000.'));
          return true;
        }
        if(data.volume_IOPS == 'io2' && (data.volume_IOPS < 100 ||  data.volume_IOPS > 2000)) {
          setErrMsg('replicas', gettext('Please enter the volume IOPS in the range between 100 tp 2000.'));
          return true;
        }
      }
    }
    return false;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'volume_type', label: gettext('Volume type'),
        mode: ['create'], deps: [['region'], ['instance_series']],
        type: (state) => {
          return {
            type: 'select',
            options: ()=>this.fieldOptions.volume_types(state.region, state.provider),
            optionsReloadBasis: state.region,
            controlProps: {
              allowClear: false,
              filter: (options) => {
                if (options.length == 0) return;
                return options.filter((option) => {
                  return (option.supportedInstanceFamilyNames.includes(state.instance_series));
                });
              },
            }
          };
        }, noEmpty: true,
      },{
        id: 'volume_properties', label: gettext('Volume properties'),
        mode: ['create'], deps: ['volume_type', 'provider'],
        type: (state) => {
          return {
            type: 'select',
            options: ()=>this.fieldOptions.volume_properties(state.region, state.provider, state.volume_type),
            optionsReloadBasis: state.volume_type,
          };
        },
        visible: (state) => {
          return state.provider !== CLOUD_PROVIDERS.AWS;
        },
      }, {
        id: 'volume_size', label: gettext('Size'), type: 'text',
        mode: ['create'], noEmpty: true, deps: ['volume_type'],
        depChange: (state, source)=> {
          obj.volumeType = state.volume_type;
          if (source[0] !== 'volume_size') {
            if(state.volume_type == 'io2' || state.provider === CLOUD_PROVIDERS.AZURE) {
              return {volume_size: 4};
            } else {
              return {volume_size: 1};
            }
          }
        },
        visible: (state) => {
          return state.provider === CLOUD_PROVIDERS.AWS;
        },
        helpMessage: obj.volumeType == 'io2' ? gettext('Size (4-16,384 GiB)') : gettext('Size (1-16,384 GiB)')
      }, {
        id: 'volume_IOPS', label: gettext('IOPS'), type: 'text',
        mode: ['create'],
        helpMessage: obj.volumeType == 'io2' ? gettext('IOPS (100-2,000)') : gettext('IOPS (3,000-3,000)'),
        visible: (state) => {
          return state.provider === CLOUD_PROVIDERS.AWS;
        }, deps: ['volume_type'],
        depChange: (state, source) => {
          obj.volumeType = state.volume_type;
          if (source[0] !== 'volume_IOPS') {
            if (state.provider === CLOUD_PROVIDERS.AWS) {
              if(state.volume_type === 'io2') {
                return {volume_IOPS: 100};
              } else {
                return {volume_IOPS: 3000};
              }
            } else {
              return {volume_IOPS: 120};
            }
          }
        },
      },
    ];
  }
}


class BigAnimalDatabaseSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      password: '',
      confirm_password: '',
      database_type: '',
      postgres_version: '',
      high_availability: false,
      replicas: 0,
      ...initValues
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
    this.initValues = initValues;
  }


  validate(data, setErrMsg) {
    if(!isEmptyString(data.password) && !isEmptyString(data.confirm_password)
    && data.password != data.confirm_password) {
      setErrMsg('confirm_password', gettext('Passwords do not match.'));
      return true;
    }
    if (!isEmptyString(data.confirm_password) && data.confirm_password.length < 12) {
      setErrMsg('confirm_password', gettext('Password must be 12 characters or more.'));
      return true;
    }
    if (data.high_availability && (isEmptyString(data.replicas) || data.replicas <= 0)) {
      setErrMsg('replicas', gettext('Please select number of stand by replicas.'));
      return true;
    }
    return false;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'gid', label: gettext('pgAdmin server group'), type: 'select',
        options: this.fieldOptions.server_groups,
        mode: ['create'],
        controlProps: { allowClear: false },
        noEmpty: true,
      }, {
        id: 'database_type', label: gettext('Database type'), mode: ['create'],
        type: 'select',
        options: this.fieldOptions.db_types,
        noEmpty: true, orientation: 'vertical',
      },{
        id: 'postgres_version', label: gettext('Database version'),
        mode: ['create'], noEmpty: true, deps: ['database_type'],
        type: (state) => {
          return {
            type: 'select',
            options: ()=>this.fieldOptions.db_versions(this.initValues.cluster_type, state.database_type),
            optionsReloadBasis: state.database_type,
          };
        },
      },{
        id: 'password', label: gettext('Database password'), type: 'password',
        mode: ['create'], noEmpty: true,
      },{
        id: 'confirm_password', label: gettext('Confirm password'), type: 'password',
        mode: ['create'], noEmpty: true,
      },

    ];
  }
}


class BigAnimalClusterSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      oid: undefined,
      name: '',
      region: '',
      cloud_type: 'public',
      biganimal_public_ip: initValues.hostIP,
      ...initValues
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
    this.initValues = initValues;

    this.instance_types = new BigAnimalInstanceSchema({
      instance_types: this.fieldOptions.instance_types,
    });
    this.volume_types = new BigAnimalVolumeSchema({
      volume_types: this.fieldOptions.volume_types,
      volume_properties: this.fieldOptions.volume_properties
    });
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Cluster name'), type: 'text',
        mode: ['create'], noEmpty: true,
      },{
        id: 'region', label: gettext('Region'),
        controlProps: { allowClear: false },
        noEmpty: true,
        mode: ['create'],
        dep: [this.initValues.provider],
        type: () => {
          return {
            type: 'select',
            options: ()=>this.fieldOptions.regions()
          };
        },
      },{
        id: 'biganimal_public_ip', label: gettext('Public IP range'), type: 'text',
        mode: ['create'],
        helpMessage: gettext('IP address range for allowed inbound traffic, for example: 127.0.0.1/32. Add multiple IP addresses/ranges separated with commas. Leave blank for 0.0.0.0/0'),
      },{
        type: 'nested-fieldset', label: gettext('Instance Type'),
        mode: ['create'], deps: ['region'],
        schema: this.instance_types,
      },{
        type: 'nested-fieldset', label: gettext('Storage'),
        mode: ['create'], deps: ['region'],
        schema: this.volume_types,
      }
    ];
  }
}


export {
  BigAnimalClusterSchema,
  BigAnimalDatabaseSchema,
  BigAnimalClusterTypeSchema
};
