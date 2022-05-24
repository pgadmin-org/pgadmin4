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
import { Box, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Wizard from '../../../../static/js/helpers/wizard/Wizard';
import WizardStep from '../../../../static/js/helpers/wizard/WizardStep';
import {FormFooterMessage, MESSAGE_TYPE } from '../../../../static/js/components/FormComponents';
import getApiInstance from '../../../../static/js/api_instance';
import Alertify from 'pgadmin.alertifyjs';
import PropTypes from 'prop-types';
import pgAdmin from 'sources/pgadmin';
import {ToggleButtons, FinalSummary} from './cloud_components';
import { PrimaryButton } from '../../../../static/js/components/Buttons';
import {AwsCredentials, AwsInstanceDetails, AwsDatabaseDetails, validateCloudStep1,
  validateCloudStep2, validateCloudStep3} from './aws';
import {BigAnimalInstance, BigAnimalDatabase, validateBigAnimal,
  validateBigAnimalStep2, validateBigAnimalStep3} from './biganimal';
import { isEmptyString } from 'sources/validators';
import { AWSIcon, BigAnimalIcon } from '../../../../static/js/components/ExternalIcon';

const useStyles = makeStyles(() =>
  ({
    messageBox: {
      marginBottom: '1em',
      display: 'flex',
    },
    messagePadding: {
      paddingTop: '10px',
      flex: 2.5,
    },
    buttonMarginEDB: {
      position: 'relative',
      top: '20%',
    },
    toggleButton: {
      height: '100px',
    },
    summaryContainer: {
      flexGrow: 1,
      minHeight: 0,
      overflow: 'auto',
    },
    boxText: {
      paddingBottom: '5px'
    },
  }),
);

export default function CloudWizard({ nodeInfo, nodeData }) {
  const classes = useStyles();

  var steps = [gettext('Cloud Provider'), gettext('Credentials'),
    gettext('Instance Specification'), gettext('Database Details'), gettext('Review')];
  const [currentStep, setCurrentStep] = React.useState('');
  const [selectionVal, setCloudSelection] = React.useState('');
  const [errMsg, setErrMsg] = React.useState('');
  const [cloudInstanceDetails, setCloudInstanceDetails] = React.useState({});
  const [cloudDBCred, setCloudDBCred] = React.useState({});
  const [cloudDBDetails, setCloudDBDetails] = React.useState({});
  const [callRDSAPI, setCallRDSAPI] = React.useState({});
  const [hostIP, setHostIP] = React.useState('127.0.0.1/32');
  const [cloudProvider, setCloudProvider] = React.useState('');
  const [verificationIntiated, setVerificationIntiated] = React.useState(false);
  const [bigAnimalInstanceData, setBigAnimalInstanceData] = React.useState({});
  const [bigAnimalDatabaseData, setBigAnimalDatabaseData] = React.useState({});



  const axiosApi = getApiInstance();

  const [verificationURI, setVerificationURI] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');

  React.useEffect(() => {
    let _url = url_for('cloud.get_host_ip') ;
    axiosApi.get(_url)
      .then((res) => {
        if (res.data.data) {
          setHostIP(res.data.data);
        }
      })
      .catch((error) => {
        Alertify.error(gettext(`Error while getting the host ip: ${error.response.data.errormsg}`));
      });
  }, [cloudProvider]);

  const wizardStepChange = (data) => {
    setCurrentStep(data.currentStep);
  };

  const onSave = () => {
    var _url = url_for('cloud.deploy_on_cloud'),
      post_data = {};

    if (cloudProvider == 'rds') {
      post_data = {
        gid: nodeInfo.server_group._id,
        cloud: cloudProvider,
        secret: cloudDBCred,
        instance_details:cloudInstanceDetails,
        db_details: cloudDBDetails
      };
    } else {
      post_data = {
        gid: nodeInfo.server_group._id,
        cloud: cloudProvider,
        instance_details:bigAnimalInstanceData,
        db_details: bigAnimalDatabaseData
      };
    }

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
    let isError = (cloudProvider == '');
    switch(cloudProvider) {
    case 'rds':
      switch (currentStep) {
      case 0:
        setCloudSelection('rds');
        break;
      case 1:
        isError = validateCloudStep1(cloudDBCred);
        break;
      case 2:
        isError = validateCloudStep2(cloudInstanceDetails, hostIP);
        break;
      case 3:
        isError = validateCloudStep3(cloudDBDetails, nodeInfo);
        break;
      default:
        break;
      }
      break;
    case 'biganimal':
      switch (currentStep) {
      case 0:
        setCloudSelection('biganimal');
        break;
      case 1:
        isError = !verificationIntiated;
        break;
      case 2:
        isError = validateBigAnimalStep2(bigAnimalInstanceData);
        break;
      case 3:
        isError = validateBigAnimalStep3(bigAnimalDatabaseData, nodeInfo);
        break;
      default:
        break;
      }
      break;
    }
    return isError;
  };

  const onBeforeNext = (activeStep) => {
    return new Promise((resolve, reject)=>{
      if(activeStep == 1 && cloudProvider == 'rds') {
        setErrMsg([MESSAGE_TYPE.INFO, 'Validating credentials...']);
        var _url = url_for('rds.verify_credentials');
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
      } else if(activeStep == 0 && cloudProvider == 'biganimal') {
        if (!isEmptyString(verificationURI)) { resolve(); return; }
        setErrMsg([MESSAGE_TYPE.INFO, 'Getting EDB BigAnimal verification URL...']);
        validateBigAnimal()
          .then((res) => {
            setVerificationURI(res);
            setVerificationCode(res.substring(res.indexOf('=')+1));
            setErrMsg(['', '']);
            resolve();
          })
          .catch((error) => {
            setErrMsg([MESSAGE_TYPE.ERROR, gettext(error)]);
            reject();
          });
      }
      else {
        resolve();
      }
    });
  };

  const authenticateBigAnimal = () => {
    var loading_icon_url = url_for(
      'static', { 'filename': 'img/loading.gif'}
    );

    setErrMsg([MESSAGE_TYPE.INFO, 'EDB BigAnimal authentication process is in progress...<img src="' + loading_icon_url + '" alt="' + gettext('Loading...') + '">']);
    window.open(verificationURI, 'edb_biganimal_authentication');
    let _url = url_for('biganimal.verification_ack') ;
    const myInterval = setInterval(() => {
      axiosApi.get(_url)
        .then((res) => {
          if (res.data && res.data.success == 1 ) {
            setErrMsg([MESSAGE_TYPE.SUCCESS, 'Authentication completed successfully. Click the Next button to proceed.']);
            setVerificationIntiated(true);
            clearInterval(myInterval);
          }
          else if (res.data && res.data.success == 0 &&  res.data.errormsg == 'access_denied') {
            setErrMsg([MESSAGE_TYPE.INFO, 'Verification failed. Access Denied...']);
            setVerificationIntiated(false);
            clearInterval(myInterval);
          }
          else if (res.data && res.data.success == 0 &&  res.data.errormsg == 'forbidden') {
            setErrMsg([MESSAGE_TYPE.INFO, 'Authentication completed successfully but you do not have permission to create the cluster.']);
            setVerificationIntiated(false);
            clearInterval(myInterval);
          }
        })
        .catch((error) => {
          setErrMsg([MESSAGE_TYPE.ERROR, gettext(`Error while verification EDB BigAnimal: ${error.response.data.errormsg}`)]);
        });
    }, 1000);

  };


  const onDialogHelp = () => {
    window.open(url_for('help.static', { 'filename': 'cloud_deployment.html' }), 'pgadmin_help');
  };

  const onErrClose = React.useCallback(()=>{
    setErrMsg([]);
  });

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
            <Box className={classes.messagePadding}>{gettext('Select any option to deploy on cloud.')}</Box>
          </Box>
          <Box className={classes.messageBox}>
            <ToggleButtons cloudProvider={cloudProvider} setCloudProvider={setCloudProvider}
              options={[{label: 'Amazon RDS', value: 'rds', icon: <AWSIcon className={classes.icon} />}, {label: 'EDB BigAnimal', value: 'biganimal', icon: <BigAnimalIcon className={classes.icon} />}]}
            ></ToggleButtons>
          </Box>
          <Box className={classes.messageBox}>
            <Box className={classes.messagePadding}>{gettext('More cloud providers are coming soon...')}</Box>
          </Box>
          <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} />
        </WizardStep>
        <WizardStep stepId={1} >
          <Box className={classes.buttonMarginEDB}>
            {cloudProvider == 'biganimal' && <Box className={classes.messageBox}>
              <Box>{gettext('The verification code to authenticate the pgAdmin to EDB BigAnimal is: ')} <strong>{verificationCode}</strong>
                <br/>{gettext('By clicking the below button, you will be redirected to the EDB BigAnimal authentication page in a new tab.')}
              </Box>
            </Box>}
            {cloudProvider == 'biganimal' && <PrimaryButton onClick={authenticateBigAnimal} disabled={verificationIntiated ? true: false}>
              {gettext('Click here to authenticate yourself to EDB BigAnimal')}
            </PrimaryButton>}
            {cloudProvider == 'biganimal' && <Box className={classes.messageBox}>
              <Box ></Box>
            </Box>}
          </Box>
          {cloudProvider == 'rds' && <AwsCredentials cloudProvider={cloudProvider} nodeInfo={nodeInfo} nodeData={nodeData} setCloudDBCred={setCloudDBCred}/>}
          <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} />
        </WizardStep>
        <WizardStep stepId={2} >
          {cloudProvider == 'rds' && callRDSAPI == 2 && <AwsInstanceDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setCloudInstanceDetails={setCloudInstanceDetails}
            hostIP={hostIP} /> }
          {cloudProvider == 'biganimal' && callRDSAPI == 2 && <BigAnimalInstance
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setBigAnimalInstanceData={setBigAnimalInstanceData}
            hostIP={hostIP}
          /> }
        </WizardStep>
        <WizardStep stepId={3} >
          {cloudProvider == 'rds' && <AwsDatabaseDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setCloudDBDetails={setCloudDBDetails}
          />
          }
          {cloudProvider == 'biganimal' && callRDSAPI == 3 && <BigAnimalDatabase
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setBigAnimalDatabaseData={setBigAnimalDatabaseData}
          />
          }
        </WizardStep>
        <WizardStep stepId={4} >
          <Box className={classes.boxText}>{gettext('Please review the details before creating the cloud instance.')}</Box>
          <Paper variant="outlined" elevation={0} className={classes.summaryContainer}>
            {cloudProvider == 'rds' && callRDSAPI == 4 && <FinalSummary
              cloudProvider={cloudProvider}
              instanceData={cloudInstanceDetails}
              databaseData={cloudDBDetails}
            />
            }
            {cloudProvider == 'biganimal' && callRDSAPI == 4 && <FinalSummary
              cloudProvider={cloudProvider}
              instanceData={bigAnimalInstanceData}
              databaseData={bigAnimalDatabaseData}
            />
            }
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


