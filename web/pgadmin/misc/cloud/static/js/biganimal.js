/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import pgAdmin from 'sources/pgadmin';
import { getNodeAjaxOptions, getNodeListById } from 'pgbrowser/node_ajax';
import {BigAnimalClusterSchema, BigAnimalDatabaseSchema, BigAnimalClusterTypeSchema} from './biganimal_schema.ui';
import SchemaView from '../../../../static/js/SchemaView';
import url_for from 'sources/url_for';
import getApiInstance from '../../../../static/js/api_instance';
import { isEmptyString } from 'sources/validators';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';

const axiosApi = getApiInstance();

// BigAnimal Cluster Type
export function BigAnimalClusterType(props) {
  const [bigAnimalClusterType, setBigAnimalClusterType] = React.useState();

  React.useMemo(() => {
    const bigAnimalClusterTypeSchema = new BigAnimalClusterTypeSchema({
      projects: ()=>getNodeAjaxOptions('biganimal_projects', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('biganimal.projects');
        }
      }),
      providers: (project)=>getNodeAjaxOptions('biganimal_providers', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('biganimal.providers', {'project_id':project});
        }
      }),
    }, {
      nodeInfo: props.nodeInfo,
      nodeData: props.nodeData,
      hostIP: props.hostIP,
    });
    setBigAnimalClusterType(bigAnimalClusterTypeSchema);
  }, [props.cloudProvider]);

  return  <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={bigAnimalClusterType}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setBigAnimalClusterTypeData(changedData);
    }}
  />;
}
BigAnimalClusterType.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setBigAnimalClusterTypeData: PropTypes.func,
  hostIP: PropTypes.string
};


// BigAnimal Instance
export function BigAnimalInstance(props) {
  const [bigAnimalInstance, setBigAnimalInstance] = React.useState();

  React.useMemo(() => {
    const bigAnimalSchema = new BigAnimalClusterSchema({
      regions: ()=>getNodeAjaxOptions('biganimal_regions', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('biganimal.regions');
        }
      }),
      instance_types: (region_id, provider_id)=>{
        if (isEmptyString(region_id)) return [];
        return getNodeAjaxOptions('biganimal_instance_types', pgAdmin.Browser.Nodes['server'],
          props.nodeInfo, props.nodeData, {
            useCache:false,
            cacheNode: 'server',
            customGenerateUrl: ()=>{
              return url_for('biganimal.instance_types', {'region_id': region_id || 0, 'provider_id': provider_id || 0});
            }
          });
      },
      volume_types: (region_id, provider_id)=>{
        if (isEmptyString(region_id)) return [];
        return getNodeAjaxOptions('biganimal_volume_types', pgAdmin.Browser.Nodes['server'],
          props.nodeInfo, props.nodeData, {
            useCache:false,
            cacheNode: 'server',
            customGenerateUrl: ()=>{
              return url_for('biganimal.volume_types', {'region_id': region_id || 0, 'provider_id': provider_id || 0});
            }
          });
      },
      volume_properties: (region_id, provider_id, volume_type)=>{
        if (isEmptyString(region_id) || isEmptyString(volume_type)) return [];
        return getNodeAjaxOptions('biganimal_volume_properties', pgAdmin.Browser.Nodes['server'],
          props.nodeInfo, props.nodeData, {
            useCache:false,
            cacheNode: 'server',
            customGenerateUrl: ()=>{
              return url_for('biganimal.volume_properties', {'region_id': region_id || 0, 'provider_id': provider_id || 0, 'volume_type': volume_type || ''});
            }
          });
      },
    }, {
      nodeInfo: props.nodeInfo,
      nodeData: props.nodeData,
      hostIP: props.hostIP,
      provider: props.bigAnimalClusterTypeData.provider,
    });
    setBigAnimalInstance(bigAnimalSchema);
  }, [props.cloudProvider]);

  return  <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={bigAnimalInstance}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setBigAnimalInstanceData(changedData);
    }}
  />;
}
BigAnimalInstance.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setBigAnimalInstanceData: PropTypes.func,
  hostIP: PropTypes.string,
  bigAnimalClusterTypeData: PropTypes.object,
};


// BigAnimal Database
export function BigAnimalDatabase(props) {
  const [bigAnimalDatabase, setBigAnimalDatabase] = React.useState();

  React.useMemo(() => {
    const bigAnimalDBSchema = new BigAnimalDatabaseSchema({
      db_types: ()=>getNodeAjaxOptions('biganimal_db_types', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('biganimal.db_types');
        }
      }),
      db_versions: (cluster_type, pg_type)=>getNodeAjaxOptions('biganimal_db_versions', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('biganimal.db_versions', {'cluster_type': cluster_type || 'single', 'pg_type': pg_type || 'pg'});
        }
      }),
      server_groups: ()=>getNodeListById(pgAdmin.Browser.Nodes['server_group'], props.nodeInfo, props.nodeData),
    }, {
      gid: props.nodeInfo['server_group']._id,
      cluster_type: props.bigAnimalClusterTypeData.cluster_type,
    });
    setBigAnimalDatabase(bigAnimalDBSchema);
  }, [props.cloudProvider]);

  return  <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={bigAnimalDatabase}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setBigAnimalDatabaseData(changedData);
    }}
  />;
}
BigAnimalDatabase.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setBigAnimalDatabaseData: PropTypes.func,
  bigAnimalClusterTypeData: PropTypes.object
};


export function validateBigAnimal() {
  return new Promise((resolve, reject)=>{
    let _url = url_for('biganimal.verification');
    axiosApi.get(_url)
      .then((res) => {
        if (res.data.data) {
          resolve(res.data.data);
        }
      })
      .catch((error) => {
        reject(`Error while fetching EDB BigAnimal verification URI: ${error.response.data.errormsg}`);
      });
  });
}

function createData(name, value) {
  if (typeof(value) == 'boolean') {
    value = (value === true) ? 'True' : 'False';
  }
  return { name, value };
}

export function getBigAnimalSummary(cloud, bigAnimalClusterTypeData, bigAnimalInstanceData, bigAnimalDatabaseData) {
  const rows1 = [
    createData(gettext('Cloud'), cloud),
    createData(gettext('Instance name'), bigAnimalInstanceData.name),
    createData(gettext('Region'), bigAnimalInstanceData.region),
    createData(gettext('Cluster type'), bigAnimalInstanceData.cloud_type),
    createData(gettext('Public IPs'), bigAnimalInstanceData.biganimal_public_ip),
  ];

  let instance_size = bigAnimalInstanceData.instance_size.split('||');

  const rows2 = [
    createData(gettext('Cluster type'), bigAnimalClusterTypeData.cluster_type),
    createData(gettext('No. of Standby Replicas'), bigAnimalClusterTypeData.replicas),
    createData(gettext('Provider'), bigAnimalClusterTypeData.provider),
  ];

  const rows3 = [
    createData(gettext('Instance type'), bigAnimalInstanceData.instance_type),
    createData(gettext('Instance series'), bigAnimalInstanceData.instance_series),
    createData(gettext('Instance size'), instance_size[0]),
  ];

  const rows4 = [
    createData(gettext('Volume type'), bigAnimalInstanceData.volume_type),
    createData(gettext('Volume size'), bigAnimalInstanceData.volume_size)
  ];
  if(bigAnimalClusterTypeData.provider.includes('aws')){
    rows4.push(createData(gettext('Volume IOPS'), bigAnimalInstanceData.volume_IOPS));
    rows4.push(createData(gettext('Disk Throuhgput'), bigAnimalInstanceData.disk_throughput));
  }

  const rows5 = [
    createData(gettext('Password'), 'xxxxxxx'),
    createData(gettext('Database Type'),  bigAnimalDatabaseData.database_type),
    createData(gettext('Database Version'),  bigAnimalDatabaseData.postgres_version),
  ];

  return [rows1, rows2, rows3, rows4, rows5];
}

export function validateBigAnimalStep2(cloudTypeDetails) {
  let isError = false;
  if (isEmptyString(cloudTypeDetails.cluster_type) || isEmptyString(cloudTypeDetails.provider) ||
    (cloudTypeDetails.cluster_type == 'ha' && cloudTypeDetails.replicas == 0)
  ) {
    isError = true;
  }

  return isError;
}

export function validateBigAnimalStep3(cloudDetails) {
  let isError = false;
  if (isEmptyString(cloudDetails.name) ||
  isEmptyString(cloudDetails.region) || isEmptyString(cloudDetails.instance_type) ||
  isEmptyString(cloudDetails.instance_series)|| isEmptyString(cloudDetails.instance_size) ||
  isEmptyString(cloudDetails.volume_type) || (!cloudDetails.provider.includes('aws') && isEmptyString(cloudDetails.volume_properties)) ) {
    isError = true;
  }
  return isError;
}

export function validateBigAnimalStep4(cloudDBDetails, nodeInfo) {
  let isError = false;
  if (isEmptyString(cloudDBDetails.password) ||
  isEmptyString(cloudDBDetails.database_type) || isEmptyString(cloudDBDetails.postgres_version)) {
    isError = true;
  }

  if (isEmptyString(cloudDBDetails.gid)) cloudDBDetails.gid = nodeInfo['server_group']._id;
  return isError;
}
