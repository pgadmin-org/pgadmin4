/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import pgAdmin from 'sources/pgadmin';
import { getNodeAjaxOptions, getNodeListById } from 'pgbrowser/node_ajax';
import {CloudInstanceDetailsSchema, CloudDBCredSchema, DatabaseSchema} from './aws_schema.ui';
import SchemaView from '../../../../static/js/SchemaView';
import url_for from 'sources/url_for';
import getApiInstance from '../../../../static/js/api_instance';
import { isEmptyString } from 'sources/validators';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import gettext from 'sources/gettext';

const useStyles = makeStyles(() =>
  ({
    formClass: {
      overflow: 'auto',
    }
  }),
);

// AWS credentials
export function AwsCredentials(props) {
  const [cloudDBCredInstance, setCloudDBCredInstance] = React.useState();

  React.useMemo(() => {
    const cloudDBCredSchema = new CloudDBCredSchema({
      regions: ()=>getNodeAjaxOptions('get_aws_regions', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('rds.regions');
        }
      }),
    });
    setCloudDBCredInstance(cloudDBCredSchema);
  }, [props.cloudProvider]);

  return  <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={cloudDBCredInstance}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setCloudDBCred(changedData);
    }}
  />;
}
AwsCredentials.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setCloudDBCred: PropTypes.func,
};

// AWS Instance Details
export function AwsInstanceDetails(props) {
  const [cloudInstanceDetailsInstance, setCloudInstanceDetailsInstance] = React.useState();
  const classes = useStyles();

  React.useMemo(() => {
    const cloudDBInstanceSchema = new CloudInstanceDetailsSchema({
      version: ()=>getNodeAjaxOptions('get_aws_db_versions', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('rds.db_versions');
        }
      }),
      getInstances: (engine, reload, options) =>
      {
        return new Promise((resolve, reject)=>{
          const api = getApiInstance();
          let _url = url_for('rds.db_instances') ;

          if (engine) _url += '?eng_version=' + engine;
          if (reload || options === undefined || options.length == 0) {
            api.get(_url)
              .then(res=>{
                let data = res.data.data;
                resolve(data);
              })
              .catch((err)=>{
                reject(err);
              });
          } else {
            resolve(options);
          }
        });
      },
      instance_type: ()=>getNodeAjaxOptions('get_aws_db_instances', pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('rds.db_instances');
        }
      }),
      server_groups: ()=>getNodeListById(pgAdmin.Browser.Nodes['server_group'], props.nodeInfo, props.nodeData),
    }, {
      gid: props.nodeInfo['server_group']._id,
      hostIP: props.hostIP,
    });
    setCloudInstanceDetailsInstance(cloudDBInstanceSchema);
  }, [props.cloudProvider]);


  return  <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={cloudInstanceDetailsInstance}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setCloudInstanceDetails(changedData);
    }}
    formClassName={classes.formClass}
  />;
}
AwsInstanceDetails.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  hostIP: PropTypes.string,
  setCloudInstanceDetails: PropTypes.func,
};

// AWS Database Details
export function AwsDatabaseDetails(props) {
  const [cloudDBInstance, setCloudDBInstance] = React.useState();

  React.useMemo(() => {
    const cloudDBSchema = new DatabaseSchema({
      server_groups: ()=>getNodeListById(pgAdmin.Browser.Nodes['server_group'], props.nodeInfo, props.nodeData),
    },
    {
      gid: props.nodeInfo['server_group']._id,
    }
    );
    setCloudDBInstance(cloudDBSchema);

  }, [props.cloudProvider]);

  return <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={cloudDBInstance}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setCloudDBDetails(changedData);
    }}
  />;
}
AwsDatabaseDetails.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setCloudDBDetails: PropTypes.func,
};

export function validateCloudStep1(cloudDBCred) {
  let isError = false;
  if (isEmptyString(cloudDBCred.access_key) || isEmptyString(cloudDBCred.secret_access_key)) {
    isError = true;
  }
  return isError;
}

export function validateCloudStep2(cloudInstanceDetails, host_ip) {
  let isError = false;
  if (isEmptyString(cloudInstanceDetails.name) ||
  isEmptyString(cloudInstanceDetails.db_version) || isEmptyString(cloudInstanceDetails.instance_type) ||
  isEmptyString(cloudInstanceDetails.storage_type)|| isEmptyString(cloudInstanceDetails.storage_size)) {
    isError = true;
  }

  if(cloudInstanceDetails.storage_type == 'io1' && isEmptyString(cloudInstanceDetails.storage_IOPS)) {
    isError = true;
  }
  if (isEmptyString(cloudInstanceDetails.public_ip)) cloudInstanceDetails.public_ip = host_ip;
  return isError;
}

export function validateCloudStep3(cloudDBDetails, nodeInfo) {
  let isError = false;
  if (isEmptyString(cloudDBDetails.db_name) ||
  isEmptyString(cloudDBDetails.db_username) || isEmptyString(cloudDBDetails.db_password)) {
    isError = true;
  }
  if (isEmptyString(cloudDBDetails.db_port)) cloudDBDetails.db_port = 5432;
  if (isEmptyString(cloudDBDetails.gid)) cloudDBDetails.gid = nodeInfo['server_group']._id;
  return isError;
}

function createData(name, value) {
  if (typeof(value) == 'boolean') {
    value = (value === true) ? 'True' : 'False';
  }

  return { name, value };
}

export function getAWSSummary(cloud, cloudInstanceDetails, cloudDBDetails) {
  const rows1 = [
    createData(gettext('Cloud'), cloud),
    createData(gettext('Instance name'), cloudInstanceDetails.name),
    createData(gettext('Public IP'), cloudInstanceDetails.public_ip),
  ];

  const rows2 = [
    createData(gettext('PostgreSQL version'), cloudInstanceDetails.db_version),
    createData(gettext('Instance type'), cloudInstanceDetails.instance_type),
  ];

  let _storage_type = getStorageType(cloudInstanceDetails);

  const rows3 = [
    createData(gettext('Storage type'), _storage_type[1]),
    createData(gettext('Allocated storage'), cloudInstanceDetails.storage_size + ' GiB'),
  ];
  if (_storage_type[0] !== undefined) {
    rows3.push(createData(gettext('Provisioned IOPS'), _storage_type[0]));
  }

  const rows4 = [
    createData(gettext('Database name'), cloudDBDetails.db_name),
    createData(gettext('Username'), cloudDBDetails.db_username),
    createData(gettext('Password'), 'xxxxxxx'),
    createData(gettext('Port'),  cloudDBDetails.db_port),
  ];

  const rows5 = [
    createData(gettext('High availability'), cloudInstanceDetails.high_availability),
  ];

  return [rows1, rows2, rows3, rows4, rows5];
}

const getStorageType = (cloudInstanceDetails) => {
  let _storage_type = 'General Purpose SSD (gp2)',
    _io1 = undefined;

  if(cloudInstanceDetails.storage_type == 'gp2') _storage_type = 'General Purpose SSD (gp2)';
  else if(cloudInstanceDetails.storage_type == 'io1') {
    _storage_type = 'Provisioned IOPS SSD (io1)';
    _io1 = cloudInstanceDetails.storage_IOPS;
  }
  else if(cloudInstanceDetails.storage_type == 'magnetic') _storage_type = 'Magnetic';

  return [_io1, _storage_type];
};
