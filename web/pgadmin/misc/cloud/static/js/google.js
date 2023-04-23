/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import {GoogleCredSchema, GoogleClusterSchema, GoogleDatabaseSchema} from './google_schema.ui';
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


export function GoogleCredentials(props) {
  const [cloudDBCredInstance, setCloudDBCredInstance] = React.useState();

  let _eventBus = React.useContext(CloudWizardEventsContext);
  let child = null;
  React.useMemo(() => {
    const googleCredSchema = new GoogleCredSchema({
      authenticateGoogle:(client_secret_file) => {
        let loading_icon_url = url_for(
          'static', { 'filename': 'img/loading.gif'}
        );
        const axiosApi = getApiInstance();
        _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD', [MESSAGE_TYPE.INFO, 'Google authentication process is in progress..<img src="' + loading_icon_url + '" alt="' + gettext('Loading...') + '">']);
        let _url = url_for('google.verify_credentials');
        const post_data = {
          cloud: 'google',
          secret: {'client_secret_file':client_secret_file}
        };
        return new Promise((resolve, reject)=>{axiosApi.post(_url, post_data)
          .then((res) => {
            if (res.data && res.data.success == 1 ) {
              let params = 'scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no, width=550,height=650,left=600,top=150';
              child = window.open(res.data.data.auth_url, 'google_authentication', params);
              resolve(true);
            }
            else if (res.data && res.data.success == 0) {
              _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD',[MESSAGE_TYPE.ERROR, res.data.errormsg]);
              _eventBus.fireEvent('SET_CRED_VERIFICATION_INITIATED',false);
              resolve(false);
            }
          })
          .catch((error) => {
            _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD',[MESSAGE_TYPE.ERROR, gettext(`Error while authentication: ${error}`)]);
            reject(false);
          });
        });
      },
      verification_ack:()=>{
        let auth_url = url_for('google.verification_ack');
        let countdown = 90;
        const axiosApi = getApiInstance();
        return new Promise((resolve, reject)=>{
          const interval = setInterval(()=>{
            axiosApi.get(auth_url)
              .then((res)=>{
                if (res.data.success && res.data.success == 1 ){
                  _eventBus.fireEvent('SET_CRED_VERIFICATION_INITIATED',true);
                  _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD',[MESSAGE_TYPE.SUCCESS, gettext('Authentication completed successfully. Click the Next button to proceed.')]);
                  clearInterval(interval);
                  if(child){
                    // close authentication window
                    child.close();
                  }
                  resolve();
                } else if (res.data && res.data.success == 0 && res.data.errormsg ){
                  _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD',[MESSAGE_TYPE.ERROR, res.data.errormsg]);
                  _eventBus.fireEvent('SET_CRED_VERIFICATION_INITIATED',false);
                  clearInterval(interval);
                  resolve(false);
                } else if (child && child.closed || countdown <= 0) {
                  _eventBus.fireEvent('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD',[MESSAGE_TYPE.ERROR, 'Authentication is aborted.']);
                  _eventBus.fireEvent('SET_CRED_VERIFICATION_INITIATED',false);
                  clearInterval(interval);
                }
              })
              .catch((error)=>{
                clearInterval(interval);
                reject(error);
              });
            countdown = countdown - 1;
          }, 1000);
        });
      }
    }, {}, _eventBus);
    setCloudDBCredInstance(googleCredSchema);
  }, [props.cloudProvider]);

  return  <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={cloudDBCredInstance}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setGoogleCredData(changedData);
    }}
  />;
}
GoogleCredentials.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setGoogleCredData: PropTypes.func
};

// Google Instance
export function GoogleInstanceDetails(props) {
  const [googleInstanceSchema, setGoogleInstanceSchema] = React.useState();
  const classes = useStyles();

  React.useMemo(() => {
    const GoogleClusterSchemaObj = new GoogleClusterSchema({
      projects: () => getNodeAjaxOptions('get_projects', {}, {}, {},{
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('google.projects');
        }
      }),
      regions: (project)=>getNodeAjaxOptions('get_regions', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData,{
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('google.regions', {'project_id': project});
        }
      }),
      availabilityZones: (region)=>getNodeAjaxOptions('get_availability_zones', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('google.availability_zones', {'region': region});
        }
      }),
      dbVersions: ()=>getNodeAjaxOptions('get_db_versions', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('google.database_versions');
        }
      }),
      instanceTypes: (project, region, instanceClass)=>{
        if (isEmptyString(project) || isEmptyString(region) || isEmptyString(instanceClass)) return [];
        return getNodeAjaxOptions('get_instance_types', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
          useCache:false,
          cacheNode: 'server',
          customGenerateUrl: ()=>{
            return url_for('google.instance_types', {'project_id':project, 'region': region, 'instance_class': instanceClass});
          }
        });},
    }, {
      nodeInfo: props.nodeInfo,
      nodeData: props.nodeData,
      hostIP: props.hostIP,
      ...props.googleInstanceData
    });
    setGoogleInstanceSchema(GoogleClusterSchemaObj);
  }, [props.cloudProvider]);

  return  <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={googleInstanceSchema}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setGoogleInstanceData(changedData);
    }}
    formClassName={classes.formClass}
  />;
}
GoogleInstanceDetails.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setGoogleInstanceData: PropTypes.func,
  hostIP: PropTypes.string,
  subscriptions: PropTypes.array,
  googleInstanceData: PropTypes.object
};


// Google Database Details
export function GoogleDatabaseDetails(props) {
  const [gooeleDBInstance, setGoogleDBInstance] = React.useState();
  const classes = useStyles();

  React.useMemo(() => {
    const googleDBSchema = new GoogleDatabaseSchema({
      server_groups: ()=>getNodeListById(pgAdmin.Browser.Nodes['server_group'], props.nodeInfo, props.nodeData),
    },
    {
      gid: props.nodeInfo['server_group']._id,
    }
    );
    setGoogleDBInstance(googleDBSchema);

  }, [props.cloudProvider]);

  return <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={gooeleDBInstance}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setGoogleDatabaseData(changedData);
    }}
    formClassName={classes.formClass}
  />;
}
GoogleDatabaseDetails.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setGoogleDatabaseData: PropTypes.func,
};

// Validation functions
export function validateGoogleStep2(cloudInstanceDetails) {
  let isError = false;
  if ((isEmptyString(cloudInstanceDetails.name) || (!/^(?=[a-z])[a-z0-9\-]*$/.test(cloudInstanceDetails.name) ||
      cloudInstanceDetails.name.length > 97) || isEmptyString(cloudInstanceDetails.project) ||
      isEmptyString(cloudInstanceDetails.region) || isEmptyString(cloudInstanceDetails.availability_zone) ||
      isEmptyString(cloudInstanceDetails.db_version) || isEmptyString(cloudInstanceDetails.instance_type) ||
      isEmptyString(cloudInstanceDetails.instance_class) || isEmptyString(cloudInstanceDetails.storage_type)||
      isEmptyString(cloudInstanceDetails.storage_size) || isEmptyString(cloudInstanceDetails.public_ips)) ||
      (cloudInstanceDetails.high_availability && (isEmptyString(cloudInstanceDetails.secondary_availability_zone) ||
      cloudInstanceDetails.secondary_availability_zone == cloudInstanceDetails.availability_zone))) {
    isError = true;
  }
  return isError;
}

export function validateGoogleStep3(cloudDBDetails, nodeInfo) {
  let isError = false;
  if (isEmptyString(cloudDBDetails.db_username) || isEmptyString(cloudDBDetails.db_password)) {
    isError = true;
  }

  if (cloudDBDetails.db_password != cloudDBDetails.db_confirm_password) {
    isError = true;
  }

  if (isEmptyString(cloudDBDetails.gid)) cloudDBDetails.gid = nodeInfo['server_group']._id;
  return isError;
}

// Summary creation
function createData(name, value) {
  if (typeof(value) == 'boolean') {
    value = (value === true) ? 'True' : 'False';
  }
  return { name, value };
}

// Summary section
export function getGoogleSummary(cloud, cloudInstanceDetails, cloudDBDetails) {
  let db_version = cloudInstanceDetails.db_version;
  db_version  = db_version.charAt(0) + db_version.slice(1,7).toLowerCase() + 'SQL ' + db_version.split('_')[1];
  let storageType = cloudInstanceDetails.storage_type.split('_')[1];
  let instance_class = cloudInstanceDetails.instance_class.charAt(0).toUpperCase() + cloudInstanceDetails.instance_class.slice(1);
  let instance_type = cloudInstanceDetails.instance_type;
  if (instance_class =='Standard' || instance_class =='Highmem' ){
    instance_type =  instance_type.split('-')[2] + ' vCPU ' + Math.round((parseInt(instance_type.split('-')[3]))/1024) + ' GB';
  }else{
    const instance_type_mapping = {'db-f1-micro':'1 vCPU, 0.6 GB', 'db-g1-small': '1 vCPU, 1.7 GB'};
    instance_type = instance_type_mapping[instance_type];
  }

  const rows1 = [
    createData(gettext('Cloud'), cloud),
    createData(gettext('Instance name'), cloudInstanceDetails.name),
    createData(gettext('Project'), cloudInstanceDetails.project),
    createData(gettext('Region'), cloudInstanceDetails.region),
    createData(gettext('Availability zone'), cloudInstanceDetails.availability_zone),
  ];

  const rows2 = [
    createData(gettext('PostgreSQL version'), db_version),
    createData(gettext('Instance class'), instance_class),
    createData(gettext('Instance type'), instance_type),
  ];

  const rows3 = [
    createData(gettext('Storage type'), storageType),
    createData(gettext('Allocated storage'), cloudInstanceDetails.storage_size + ' GB'),
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
    createData(gettext('Secondary availability zone'), cloudInstanceDetails.secondary_availability_zone),
  ];

  return [rows1, rows2, rows3, rows4, rows5, rows6];
}
