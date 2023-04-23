/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import {AzureCredSchema, AzureClusterSchema, AzureDatabaseSchema} from './azure_schema.ui';
import pgAdmin from 'sources/pgadmin';
import { getNodeAjaxOptions, getNodeListById } from 'pgbrowser/node_ajax';
import SchemaView from '../../../../static/js/SchemaView';
import url_for from 'sources/url_for';
import { isEmptyString } from 'sources/validators';
import PropTypes from 'prop-types';
import getApiInstance from '../../../../static/js/api_instance';
import { CloudWizardEventsContext } from './CloudWizard';
import {MESSAGE_TYPE } from '../../../../static/js/components/FormComponents';
import gettext from 'sources/gettext';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() =>
  ({
    formClass: {
      overflow: 'auto',
    }
  }),
);

// Azure credentials
export function AzureCredentials(props) {
  const [cloudDBCredInstance, setCloudDBCredInstance] = React.useState();

  let _eventBus = React.useContext(CloudWizardEventsContext);
  React.useMemo(() => {
    const azureCloudDBCredSchema = new AzureCredSchema({
      authenticateAzure:(auth_type, azure_tenant_id) => {
        let loading_icon_url = url_for(
          'static', { 'filename': 'img/loading.gif'}
        );
        const axiosApi = getApiInstance();
        _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD', [MESSAGE_TYPE.INFO, 'Microsoft Azure authentication process is in progress..<img src="' + loading_icon_url + '" alt="' + gettext('Loading...') + '">']);
        let _url = url_for('azure.verify_credentials');
        const post_data = {
          cloud: 'azure',
          secret: {'auth_type':auth_type, 'azure_tenant_id':azure_tenant_id}
        };
        return new Promise((resolve, reject)=>{axiosApi.post(_url, post_data)
          .then((res) => {
            if (res.data && res.data.success == 1 ) {
              _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD',[MESSAGE_TYPE.SUCCESS, gettext('Authentication completed successfully. Click the Next button to proceed.')]);
              _eventBus.fireEvent('SET_CRED_VERIFICATION_INITIATED',true);
              resolve(true);
            }
            else if (res.data && res.data.success == 0) {
              _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD',[MESSAGE_TYPE.ERROR, res.data.errormsg]);
              _eventBus.fireEvent('SET_CRED_VERIFICATION_INITIATED',false);
              resolve(false);
            }
          })
          .catch((error) => {
            _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD',[MESSAGE_TYPE.ERROR, gettext(`Error while verifying Microsoft Azure: ${error}`)]);
            reject(false);
          });
        });
      },
      getAuthCode:()=>{
        let _url_get_azure_verification_codes = url_for('azure.get_azure_verification_codes');
        const axiosApi = getApiInstance();
        return new Promise((resolve, reject)=>{
          const interval = setInterval(()=>{
            axiosApi.get(_url_get_azure_verification_codes)
              .then((res)=>{
                if (res.data.success){
                  clearInterval(interval);
                  let params = 'scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no, width=550,height=650,left=920,top=150';
                  window.open(res.data.data.verification_uri, 'azure_authentication', params);
                  resolve(res);
                }
              })
              .catch((error)=>{
                clearInterval(interval);
                reject(error);
              });
          }, 1000);
        });
      }
    }, {}, _eventBus);
    setCloudDBCredInstance(azureCloudDBCredSchema);
  }, [props.cloudProvider]);

  return  <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={cloudDBCredInstance}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setAzureCredData(changedData);
    }}
  />;
}
AzureCredentials.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setAzureCredData: PropTypes.func
};


// Azure Instance
export function AzureInstanceDetails(props) {
  const [azureInstanceSchema, setAzureInstanceSchema] = React.useState();
  const classes = useStyles();

  React.useMemo(() => {
    const AzureSchema = new AzureClusterSchema({
      subscriptions: () => getNodeAjaxOptions('get_subscriptions', {}, {}, {},{
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('azure.subscriptions');
        }
      }),
      resourceGroups: (subscription)=>getNodeAjaxOptions('ge_resource_groups', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('azure.resource_groups', {'subscription_id': subscription});
        }
      }),
      regions: (subscription)=>getNodeAjaxOptions('get_regions', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData,{
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('azure.regions', {'subscription_id': subscription});
        }
      }),
      availabilityZones: (region)=>getNodeAjaxOptions('get_availability_zones', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('azure.availability_zones', {'region_name': region});
        }
      }),
      versionOptions: (availabilityZone)=>getNodeAjaxOptions('get_db_versions', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('azure.db_versions', {'availability_zone': availabilityZone});
        }
      }),
      instanceOptions: (dbVersion, availabilityZone)=>{
        if (isEmptyString(dbVersion) || isEmptyString(availabilityZone) ) return [];
        return getNodeAjaxOptions('get_instance_types', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
          useCache:false,
          cacheNode: 'server',
          customGenerateUrl: ()=>{
            return url_for('azure.instance_types', {'availability_zone':availabilityZone, 'db_version': dbVersion});
          }
        });},
      storageOptions: (dbVersion, availabilityZone)=>{
        if (isEmptyString(dbVersion) || isEmptyString(availabilityZone) ) return [];
        return getNodeAjaxOptions('get_instance_types', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
          useCache:false,
          cacheNode: 'server',
          customGenerateUrl: ()=>{
            return url_for('azure.storage_types', {'availability_zone':availabilityZone, 'db_version': dbVersion});
          }
        });
      },
      zoneRedundantHaSupported: (region)=>getNodeAjaxOptions('is_zone_redundant_ha_supported', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData,{
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('azure.zone_redundant_ha_supported', {'region_name': region});
        }
      }),
    }, {
      nodeInfo: props.nodeInfo,
      nodeData: props.nodeData,
      hostIP: props.hostIP,
      ...props.azureInstanceData
    });
    setAzureInstanceSchema(AzureSchema);
  }, [props.cloudProvider]);

  return  <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={azureInstanceSchema}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setAzureInstanceData(changedData);
    }}
    formClassName={classes.formClass}
  />;
}
AzureInstanceDetails.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setAzureInstanceData: PropTypes.func,
  hostIP: PropTypes.string,
  subscriptions: PropTypes.array,
  azureInstanceData: PropTypes.object
};


// Azure Database Details
export function AzureDatabaseDetails(props) {
  const [azureDBInstance, setAzureDBInstance] = React.useState();
  const classes = useStyles();

  React.useMemo(() => {
    const azureDBSchema = new AzureDatabaseSchema({
      server_groups: ()=>getNodeListById(pgAdmin.Browser.Nodes['server_group'], props.nodeInfo, props.nodeData),
    },
    {
      gid: props.nodeInfo['server_group']._id,
    }
    );
    setAzureDBInstance(azureDBSchema);

  }, [props.cloudProvider]);

  return <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={azureDBInstance}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setAzureDatabaseData(changedData);
    }}
    formClassName={classes.formClass}
  />;
}
AzureDatabaseDetails.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setAzureDatabaseData: PropTypes.func,
};


// Validation functions
export function validateAzureStep2(cloudInstanceDetails) {
  let isError = false;
  if (isEmptyString(cloudInstanceDetails.name) ||
  isEmptyString(cloudInstanceDetails.db_version) || isEmptyString(cloudInstanceDetails.instance_type) ||
  isEmptyString(cloudInstanceDetails.region)|| isEmptyString(cloudInstanceDetails.storage_size) || isEmptyString(cloudInstanceDetails.public_ips)) {
    isError = true;
  }
  return isError;
}

export function validateAzureStep3(cloudDBDetails, nodeInfo) {
  let isError = false;
  if (isEmptyString(cloudDBDetails.db_username) || isEmptyString(cloudDBDetails.db_password)) {
    isError = true;
  }

  if (cloudDBDetails.db_password != cloudDBDetails.db_confirm_password ||  !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$@!%&*?])[A-Za-z\d#$@!%&*?]{8,128}$/.test(cloudDBDetails.db_confirm_password)) {
    isError = true;
  }

  if (isEmptyString(cloudDBDetails.gid)) cloudDBDetails.gid = nodeInfo['server_group']._id;
  return isError;
}


// Check cluster name avaiablity
export function checkClusternameAvailbility(clusterName){
  return new Promise((resolve, reject)=>{
    let _url = url_for('azure.check_cluster_name_availability');
    const axiosApi = getApiInstance();
    axiosApi.get(_url, {
      params: {
        'name': clusterName,
      }
    }).then((res)=>{
      if (res.data) {
        resolve(res.data);
      }
    }).catch((error) => {
      reject(gettext(`Error while checking server name availability with Microsoft Azure: ${error.response.data.errormsg}`));
    });
  });
}

// Summary creation
function createData(name, value) {
  if (typeof(value) == 'boolean') {
    value = (value === true) ? 'True' : 'False';
  }
  return { name, value };
}

// Summary section
export function getAzureSummary(cloud, cloudInstanceDetails, cloudDBDetails) {
  const rows1 = [
    createData(gettext('Cloud'), cloud),
    createData(gettext('Subscription'), cloudInstanceDetails.subscription),
    createData(gettext('Resource group'), cloudInstanceDetails.resource_group),
    createData(gettext('Region'), cloudInstanceDetails.region),
    createData(gettext('Availability zone'), cloudInstanceDetails.availability_zone),
  ];

  const rows2 = [
    createData(gettext('PostgreSQL version'), cloudInstanceDetails.db_version),
    createData(gettext('Instance type'), cloudInstanceDetails.instance_type),
  ];

  const rows3 = [
    createData(gettext('Allocated storage'), cloudInstanceDetails.storage_size + ' GiB'),
  ];

  const rows4 = [
    createData(gettext('Username'), cloudDBDetails.db_username),
    createData(gettext('Password'), 'xxxxxxx'),
  ];

  const rows5 = [
    createData(gettext('Public IP'), cloudInstanceDetails.public_ips),
  ];

  const rows6 = [
    createData(gettext('High availability'), cloudInstanceDetails.high_availability),
  ];

  return [rows1, rows2, rows3, rows4, rows5, rows6];
}
