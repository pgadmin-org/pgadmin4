/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import React from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Wizard from '../../../../static/js/helpers/wizard/Wizard';
import WizardStep from '../../../../static/js/helpers/wizard/WizardStep';
import {FormFooterMessage, MESSAGE_TYPE, InputToggle } from '../../../../static/js/components/FormComponents';
import getApiInstance from '../../../../static/js/api_instance';
import SchemaView from '../../../../static/js/SchemaView';
import Alertify from 'pgadmin.alertifyjs';
import PropTypes from 'prop-types';
import {CloudInstanceDetailsSchema, CloudDBCredSchema, DatabaseSchema} from './cloud_db_details_schema.ui';
import { isEmptyString } from 'sources/validators';
import pgAdmin from 'sources/pgadmin';
import { getNodeAjaxOptions, getNodeListById } from 'pgbrowser/node_ajax';
import { commonTableStyles } from '../../../../static/js/Theme';
import clsx from 'clsx';

const useStyles = makeStyles(() =>
  ({
    messageBox: {
      marginBottom: '1em',
      display: 'flex',
    },
    messagePadding: {
      flex: 2.5
    },
    toggleButton: {
      height: '100px',
    },
    table: {
      marginLeft: '4px',
      marginTop: '12px',
    },
    tableCellHeading: {
      fontWeight: 'bold',
      paddingLeft: '9px',
    },
    tableCell: {
      padding: '9px',
      paddingLeft: '11px',
    }
  }),
);

export default function CloudWizard({ nodeInfo, nodeData }) {
  const classes = useStyles();
  const tableClasses = commonTableStyles();

  var steps = ['Cloud Provider', 'Credentials', 'Instance Specification', 'Database Details', 'Review'];
  const [currentStep, setCurrentStep] = React.useState('');
  const [selectionVal, setCloudSelection] = React.useState('');
  const [errMsg, setErrMsg] = React.useState('');
  const [cloudInstanceDetailsInstance, setCloudInstanceDetailsInstance] = React.useState();
  const [cloudDBCredInstance, setCloudDBCredInstance] = React.useState();
  const [cloudDBInstance, setCloudDBInstance] = React.useState();
  const [cloudInstanceDetails, setCloudInstanceDetails] = React.useState({});
  const [cloudDBCred, setCloudDBCred] = React.useState({});
  const [cloudDBDetails, setCloudDBDetails] = React.useState({});
  const [callRDSAPI, setCallRDSAPI] = React.useState({});
  const axiosApi = getApiInstance();

  React.useEffect(() => {
    if (callRDSAPI == 2) {
      const cloudDBInstanceSchema = new CloudInstanceDetailsSchema({
        version: ()=>getNodeAjaxOptions('get_aws_db_versions', pgAdmin.Browser.Nodes['server'], nodeInfo, nodeData, {
          useCache:false,
          cacheNode: 'server',
          customGenerateUrl: ()=>{
            return url_for('cloud.get_aws_db_versions');
          }
        }),
        getInstances: (engine, reload, options) =>
        {
          return new Promise((resolve, reject)=>{
            const api = getApiInstance();
            var _url = url_for('cloud.get_aws_db_instances') ;

            if (engine) _url += '?eng_version=' + engine;
            if (reload) {
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
        instance_type: ()=>getNodeAjaxOptions('get_aws_db_instances', pgAdmin.Browser.Nodes['server'], nodeInfo, nodeData, {
          useCache:false,
          cacheNode: 'server',
          customGenerateUrl: ()=>{
            return url_for('cloud.get_aws_db_instances');
          }
        }),
        server_groups: ()=>getNodeListById(pgAdmin.Browser.Nodes['server_group'], nodeInfo, nodeData),
      }, {
        gid: nodeInfo['server_group']._id,
      });
      setCloudInstanceDetailsInstance(cloudDBInstanceSchema);
    }
  }, [callRDSAPI]);

  React.useEffect(() => {
    const cloudDBCredSchema = new CloudDBCredSchema({
      regions: ()=>getNodeAjaxOptions('get_aws_regions', pgAdmin.Browser.Nodes['server'], nodeInfo, nodeData, {
        useCache:false,
        cacheNode: 'server',
        customGenerateUrl: ()=>{
          return url_for('cloud.get_aws_regions');
        }
      }),
    });
    setCloudDBCredInstance(cloudDBCredSchema);

    const cloudDBSchema = new DatabaseSchema({
      server_groups: ()=>getNodeListById(pgAdmin.Browser.Nodes['server_group'], nodeInfo, nodeData),
    },
    {
      gid: nodeInfo['server_group']._id,
    }
    );
    setCloudDBInstance(cloudDBSchema);

  }, []);

  const wizardStepChange = (data) => {
    setCurrentStep(data.currentStep);
  };

  const validateCloudStep1 = (cloudDBCred) => {
    let isError = false;
    if (isEmptyString(cloudDBCred.aws_access_key) || isEmptyString(cloudDBCred.aws_secret_access_key)) {
      isError = true;
    }
    return isError;
  };

  const validateCloudStep2 = (cloudInstanceDetails) => {
    let isError = false;
    if (isEmptyString(cloudInstanceDetails.aws_name) ||
    isEmptyString(cloudInstanceDetails.aws_db_version) || isEmptyString(cloudInstanceDetails.aws_instance_type) ||
    isEmptyString(cloudInstanceDetails.aws_storage_type)|| isEmptyString(cloudInstanceDetails.aws_storage_size)) {
      isError = true;
    }

    if(cloudInstanceDetails.aws_storage_type == 'io1' && isEmptyString(cloudInstanceDetails.aws_storage_IOPS)) {
      isError = true;
    }
    if (isEmptyString(cloudInstanceDetails.aws_public_ip)) cloudInstanceDetails.aws_public_ip = '127.0.0.1/32';
    return isError;
  };

  const validateCloudStep3 = (cloudDBDetails) => {
    let isError = false;
    if (isEmptyString(cloudDBDetails.aws_db_name) ||
    isEmptyString(cloudDBDetails.aws_db_username) || isEmptyString(cloudDBDetails.aws_db_password)) {
      isError = true;
    }
    if (isEmptyString(cloudDBDetails.aws_db_port)) cloudDBDetails.aws_db_port = 5432;
    if (isEmptyString(cloudDBDetails.gid)) cloudDBDetails.gid = nodeInfo['server_group']._id;
    return isError;
  };

  const getStorageType = (cloudInstanceDetails) => {
    let _storage_type = 'General Purpose SSD (gp2)',
      _io1 = undefined;

    if(cloudInstanceDetails.aws_storage_type == 'gp2') _storage_type = 'General Purpose SSD (gp2)';
    else if(cloudInstanceDetails.aws_storage_type == 'io1') {
      _storage_type = 'Provisioned IOPS SSD (io1)';
      _io1 = cloudInstanceDetails.aws_storage_IOPS;
    }
    else if(cloudInstanceDetails.aws_storage_type == 'magnetic') _storage_type = 'Magnetic';

    return [_io1, _storage_type];
  };

  const onSave = () => {
    var _url = url_for('cloud.deploy_on_cloud');
    const post_data = {
      gid: nodeInfo.server_group._id,
      cloud: selectionVal,
      secret: cloudDBCred,
      instance_details:cloudInstanceDetails,
      db_details: cloudDBDetails
    };
    axiosApi.post(_url, post_data)
      .then((res) => {
        pgAdmin.Browser.Events.trigger('pgadmin:browser:tree:add', res.data.data.node, {'server_group': nodeInfo['server_group']});
        pgAdmin.Browser.Events.trigger('pgadmin-bgprocess:created', Alertify.cloudWizardDialog());
        Alertify.cloudWizardDialog().close();
      })
      .catch((error) => {
        Alertify.error(gettext(`Error while saving cloud wizard data: ${error.response.data.errormsg}`));
      });
  };

  const disableNextCheck = () => {
    setCallRDSAPI(currentStep);
    let isError = false;
    switch (currentStep) {
    case 0:
      setCloudSelection('rds');
      break;
    case 1:
      isError = validateCloudStep1(cloudDBCred);
      break;
    case 2:
      isError = validateCloudStep2(cloudInstanceDetails);
      break;
    case 3:
      isError = validateCloudStep3(cloudDBDetails);
      break;
    default:
      break;
    }
    return isError;
  };

  const onBeforeNext = (activeStep) => {
    return new Promise((resolve, reject)=>{
      if(activeStep == 1) {
        setErrMsg([MESSAGE_TYPE.INFO, 'Validating credentials...']);
        var _url = url_for('cloud.verify_credentials');
        const post_data = {
          cloud: selectionVal,
          secret: cloudDBCred,
        };
        axiosApi.post(_url, post_data)
          .then((res) => {
            if(!res.data.success) {
              setErrMsg([MESSAGE_TYPE.ERROR, res.data.info]);
              reject();
            } else {
              setErrMsg(['', '']);
              resolve();
            }
          })
          .catch(() => {
            setErrMsg([MESSAGE_TYPE.ERROR, 'Error while checking cloud credentials']);
            reject();
          });
      } else {
        resolve();
      }
    });
  };

  const onDialogHelp = () => {
    window.open(url_for('help.static', { 'filename': 'cloud_deployment.html' }), 'pgadmin_help');
  };

  function createData(name, value) {
    return { name, value };
  }

  let cloud = '';

  switch (selectionVal) {
  case 'rds':
    cloud = 'Amazon RDS';
    break;
  case 'azure':
    cloud = 'Azure PostgreSQL';
    break;
  case 'biganimal':
    cloud = 'EDB Big Animal';
    break;
  }

  const rows1 = [
    createData('Cloud', cloud),
    createData('Instance name', cloudInstanceDetails.aws_name),
    createData('Public IP', cloudInstanceDetails.aws_public_ip),
  ];

  const rows2 = [
    createData('PostgreSQL version', cloudInstanceDetails.aws_db_version),
    createData('Instance type', cloudInstanceDetails.aws_instance_type),
  ];

  let _storage_type = getStorageType(cloudInstanceDetails);

  const rows3 = [
    createData('Storage type', _storage_type[1]),
    createData('Allocated storage', cloudInstanceDetails.aws_storage_size + ' GiB'),
  ];
  if (_storage_type[0] !== undefined) {
    rows3.push(createData('Provisioned IOPS', _storage_type[0]));
  }

  const rows4 = [
    createData('Database name', cloudDBDetails.aws_db_name),
    createData('Username', cloudDBDetails.aws_db_username),
    createData('Password', 'xxxxxxx'),
    createData('Port',  cloudDBDetails.aws_db_port),
  ];

  const onErrClose = React.useCallback(()=>{
    setErrMsg([]);
  });


  const displayTableRows = (rows) => {
    return rows.map((row) => (
      <TableRow key={row.name} >
        <TableCell scope="row">{row.name}</TableCell>
        <TableCell align="right">{row.value}</TableCell>
      </TableRow>
    ));
  };

  return (
    <>
      <Wizard
        title={gettext('Deploy Cloud Instance')}
        stepList={steps}
        disableNextStep={disableNextCheck}
        onStepChange={wizardStepChange}
        onSave={onSave}
        onHelp={onDialogHelp}
        beforeNext={onBeforeNext}>
        <WizardStep stepId={0}>
          <Box className={classes.messageBox}>
            <Box className={classes.messagePadding}>{gettext('Deploy on Amazon RDS cloud.')}</Box>
          </Box>
          <Box className={classes.messageBox}>
            <InputToggle
              value='rds'
              options={[{'label': gettext('Amazon RDS'), value: 'rds'}]}
              className={classes.toggleButton}
              onChange={(value) => {
                setCloudSelection(value);}
              }
            >
            </InputToggle>
          </Box>
          <Box className={classes.messageBox}>
            <Box className={classes.messagePadding}>{gettext('More cloud providers are coming soon...')}</Box>
          </Box>
        </WizardStep>
        <WizardStep stepId={1} >
          {cloudDBCredInstance &&
            <SchemaView
              formType={'dialog'}
              getInitData={() => { /*This is intentional (SonarQube)*/ }}
              viewHelperProps={{ mode: 'create' }}
              schema={cloudDBCredInstance}
              showFooter={false}
              isTabView={false}
              onDataChange={(isChanged, changedData) => {
                setCloudDBCred(changedData);
              }}
            />
          }
          <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} />
        </WizardStep>
        <WizardStep stepId={2} >
          {cloudInstanceDetailsInstance &&
            <SchemaView
              formType={'dialog'}
              getInitData={() => { /*This is intentional (SonarQube)*/ }}
              viewHelperProps={{ mode: 'create' }}
              schema={cloudInstanceDetailsInstance}
              showFooter={false}
              isTabView={false}
              onDataChange={(isChanged, changedData) => {
                setCloudInstanceDetails(changedData);
              }}
            />
          }
        </WizardStep>
        <WizardStep stepId={3} >
          {cloudDBInstance &&
            <SchemaView
              formType={'dialog'}
              getInitData={() => { /*This is intentional (SonarQube)*/ }}
              viewHelperProps={{ mode: 'create' }}
              schema={cloudDBInstance}
              showFooter={false}
              isTabView={false}
              onDataChange={(isChanged, changedData) => {
                setCloudDBDetails(changedData);
              }}
            />
          }
        </WizardStep>
        <WizardStep stepId={4} >
          <Box className={classes.boxText}>{gettext('Please review the details before creating the cloud instance.')}</Box>
          <Paper variant="outlined" elevation={0} className={classes.summaryContainer}>
            <Table aria-label="simple table" className={clsx(tableClasses.table)}>
              <TableBody>
                {displayTableRows(rows1)}
              </TableBody>
            </Table>
            <Table aria-label="simple table" className={clsx(tableClasses.table)}>
              <TableHead>
                <TableRow>
                  <TableCell colSpan={2}>{gettext('Version and Instance Details')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayTableRows(rows2)}
              </TableBody>
            </Table>
            <Table aria-label="simple table" className={clsx(tableClasses.table)}>
              <TableHead>
                <TableRow>
                  <TableCell colSpan={2}>{gettext('Storage Details')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayTableRows(rows3)}
              </TableBody>
            </Table>
            <Table aria-label="simple table" className={clsx(tableClasses.table)}>
              <TableHead>
                <TableRow>
                  <TableCell colSpan={2}>{gettext('Database Details')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayTableRows(rows4)}
              </TableBody>
            </Table>
          </Paper>
        </WizardStep>
      </Wizard>
    </>
  );
}

CloudWizard.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
};


