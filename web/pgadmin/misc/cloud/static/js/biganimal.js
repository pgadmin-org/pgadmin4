/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import pgAdmin from 'sources/pgadmin';
import { getNodeAjaxOptions, getNodeListById } from 'pgbrowser/node_ajax';
import {BigAnimalClusterSchema, BigAnimalDatabaseSchema} from './cloud_db_details_schema.ui';
import SchemaView from '../../../../static/js/SchemaView';
import url_for from 'sources/url_for';
import getApiInstance from '../../../../static/js/api_instance';
import { isEmptyString } from 'sources/validators';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';

const axiosApi = getApiInstance();

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
      instance_types: (region_id)=>{
        if (isEmptyString(region_id)) return [];
        return getNodeAjaxOptions('biganimal_instance_types', pgAdmin.Browser.Nodes['server'],
          props.nodeInfo, props.nodeData, {
            useCache:false,
            cacheNode: 'server',
            customGenerateUrl: ()=>{
              return url_for('biganimal.instance_types', {'region_id': region_id || 0});
            }
          });
      },
      volume_types: (region_id)=>{
        if (isEmptyString(region_id)) return [];
        return getNodeAjaxOptions('biganimal_volume_types', pgAdmin.Browser.Nodes['server'],
          props.nodeInfo, props.nodeData, {
            useCache:false,
            cacheNode: 'server',
            customGenerateUrl: ()=>{
              return url_for('biganimal.volume_types', {'region_id': region_id || 0});
            }
          });
      },
      volume_properties: (region_id, volume_type)=>{
        if (isEmptyString(region_id) || isEmptyString(volume_type)) return [];
        return getNodeAjaxOptions('biganimal_volume_properties', pgAdmin.Browser.Nodes['server'],
          props.nodeInfo, props.nodeData, {
            useCache:false,
            cacheNode: 'server',
            customGenerateUrl: ()=>{
              return url_for('biganimal.volume_properties', {'region_id': region_id || 0, 'volume_type': volume_type || ''});
            }
          });
      },
    }, {
      nodeInfo: props.nodeInfo,
      nodeData: props.nodeData,
      hostIP: props.hostIP,
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
};


// BigAnimal Instance
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
      db_versions: ()=>getNodeAjaxOptions('biganimal_db_versions', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('biganimal.db_versions');
        }
      }),
      server_groups: ()=>getNodeListById(pgAdmin.Browser.Nodes['server_group'], props.nodeInfo, props.nodeData),
    }, {gid: props.nodeInfo['server_group']._id});
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
};


export function validateBigAnimal() {
  return new Promise((resolve, reject)=>{
    let _url = url_for('biganimal.verification') ;
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

export function getBigAnimalSummary(cloud, bigAnimalInstanceData, bigAnimalDatabaseData) {
  const rows1 = [
    createData(gettext('Cloud'), cloud),
    createData(gettext('Instance name'), bigAnimalInstanceData.name),
    createData(gettext('Region'), bigAnimalInstanceData.region),
    createData(gettext('Cluster type'), bigAnimalInstanceData.cloud_type),
    createData(gettext('Public IPs'), bigAnimalInstanceData.biganimal_public_ip),
  ];

  let instance_size = bigAnimalInstanceData.instance_size.split('||');

  const rows2 = [
    createData(gettext('Instance type'), bigAnimalInstanceData.instance_type),
    createData(gettext('Instance series'), bigAnimalInstanceData.instance_series),
    createData(gettext('Instance size'), instance_size[0]),
  ];

  const rows3 = [
    createData(gettext('Volume type'), bigAnimalInstanceData.volume_type),
    createData(gettext('Volume properties'), bigAnimalInstanceData.volume_properties),
  ];

  const rows4 = [
    createData(gettext('Password'), 'xxxxxxx'),
    createData(gettext('Database Type'),  bigAnimalDatabaseData.database_type),
    createData(gettext('Database Version'),  bigAnimalDatabaseData.postgres_version),
    createData(gettext('High Availability'),  bigAnimalDatabaseData.high_availability),
    createData(gettext('No. of Standby Replicas'),  bigAnimalDatabaseData.replicas),
  ];

  return [rows1, rows2, rows3, rows4];
}

export function validateBigAnimalStep2(cloudInstanceDetails) {
  let isError = false;
  if (isEmptyString(cloudInstanceDetails.name) ||
  isEmptyString(cloudInstanceDetails.region) || isEmptyString(cloudInstanceDetails.instance_type) ||
  isEmptyString(cloudInstanceDetails.instance_series)|| isEmptyString(cloudInstanceDetails.instance_size) ||
  isEmptyString(cloudInstanceDetails.volume_type)|| isEmptyString(cloudInstanceDetails.volume_properties)) {
    isError = true;
  }

  return isError;
}

export function validateBigAnimalStep3(cloudDBDetails, nodeInfo) {
  let isError = false;
  if (isEmptyString(cloudDBDetails.password) ||
  isEmptyString(cloudDBDetails.database_type) || isEmptyString(cloudDBDetails.postgres_version)) {
    isError = true;
  }

  if(cloudDBDetails.high_availability && (isEmptyString(cloudDBDetails.replicas) || cloudDBDetails.replicas <= 0)) {
    isError = true;
  }
  if (isEmptyString(cloudDBDetails.gid)) cloudDBDetails.gid = nodeInfo['server_group']._id;
  return isError;
}
