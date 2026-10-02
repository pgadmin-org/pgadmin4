/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import React from 'react';
import { Box, Paper } from '@mui/material';
import Wizard from '../../../../static/js/helpers/wizard/Wizard';
import WizardStep from '../../../../static/js/helpers/wizard/WizardStep';
import {FormFooterMessage, MESSAGE_TYPE } from '../../../../static/js/components/FormComponents';
import getApiInstance from '../../../../static/js/api_instance';
import PropTypes from 'prop-types';
import pgAdmin from 'sources/pgadmin';
import {ToggleButtons, FinalSummary} from './cloud_components';
import {AwsCredentials, AwsInstanceDetails, AwsDatabaseDetails, validateCloudStep1, validateCloudStep2, validateCloudStep3} from './aws';
import { AWSIcon, AzureIcon, GoogleCloudIcon, StarfleetIcon } from '../../../../static/js/components/ExternalIcon';
import {AzureCredentials, AzureInstanceDetails, AzureDatabaseDetails, checkClusternameAvailbility, validateAzureStep2, validateAzureStep3} from './azure';
import { GoogleCredentials, GoogleInstanceDetails, GoogleDatabaseDetails, validateGoogleStep2, validateGoogleStep3 } from './google';
import { StarfleetCredentials, StarfleetInstanceDetails, StarfleetDatabaseDetails, validateStarfleetStep1, validateStarfleetStep2, validateStarfleetStep3 } from './starfleet';
import EventBus from '../../../../static/js/helpers/EventBus';
import { CLOUD_PROVIDERS, CLOUD_PROVIDERS_LABELS } from './cloud_constants';
import { LAYOUT_EVENTS } from '../../../../static/js/helpers/Layout';

export const CloudWizardEventsContext = React.createContext();

export default function CloudWizard({ nodeInfo, nodeData, onClose, cloudPanelId}) {
  const eventBus = React.useRef(new EventBus());

  let steps = [gettext('Cloud Provider'), gettext('Credentials'),
    gettext('Instance Specification'), gettext('Database Details'), gettext('Review')];
  const [currentStep, setCurrentStep] = React.useState('');
  const [cloudSelection, setCloudSelection] = React.useState('');
  const [errMsg, setErrMsg] = React.useState('');
  const [cloudInstanceDetails, setCloudInstanceDetails] = React.useState({});
  const [cloudDBCred, setCloudDBCred] = React.useState({});
  const [cloudDBDetails, setCloudDBDetails] = React.useState({});
  const [callRDSAPI, setCallRDSAPI] = React.useState({});
  const [hostIP, setHostIP] = React.useState('127.0.0.1/32');
  const [cloudProvider, setCloudProvider] = React.useState('');
  const [verificationIntiated, setVerificationIntiated] = React.useState(false);

  const [azureCredData, setAzureCredData] = React.useState({});
  const [azureInstanceData, setAzureInstanceData] = React.useState({});
  const [azureDatabaseData, setAzureDatabaseData] = React.useState({});

  const [googleCredData, setGoogleCredData] = React.useState({});
  const [googleInstanceData, setGoogleInstanceData] = React.useState({});
  const [googleDatabaseData, setGoogleDatabaseData] = React.useState({});

  const [starfleetCredData, setStarfleetCredData] = React.useState({});
  const [starfleetInstanceData, setStarfleetInstanceData] = React.useState({});
  const [starfleetDatabaseData, setStarfleetDatabaseData] = React.useState({});
  const [starfleetByoc, setStarfleetByoc] = React.useState(false);

  const axiosApi = getApiInstance();

  React.useEffect(()=>{
    eventBus.current.registerListener('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD', (msg) => {
      setErrMsg(msg);
    });

    eventBus.current.registerListener('SET_CRED_VERIFICATION_INITIATED', (initiated) => {
      setVerificationIntiated(initiated);
    });

    const onWizardClosing = (panelId)=>{
      if(panelId == cloudPanelId) {
        onClose();
      }
    };
    pgAdmin.Browser.docker.default_workspace.eventBus.registerListener(LAYOUT_EVENTS.CLOSING, onWizardClosing);
    return ()=>{
      pgAdmin.Browser.docker.default_workspace.eventBus.deregisterListener(LAYOUT_EVENTS.CLOSING, onWizardClosing);
    };
  }, []);

  React.useEffect(() => {
    let _url = url_for('cloud.get_host_ip') ;
    axiosApi.get(_url)
      .then((res) => {
        if (res.data.data) {
          setHostIP(res.data.data);
        }
      })
      .catch((error) => {
        pgAdmin.Browser.notifier.errorText(gettext(`Error while getting the host ip: ${error.response.data.errormsg}`));
      });
  }, [cloudProvider]);

  const wizardStepChange = (data) => {
    setCurrentStep(data.currentStep);
  };

  const onSave = () => {
    let _url = url_for('cloud.deploy_on_cloud'),
      post_data = {};

    if (cloudProvider == CLOUD_PROVIDERS.AWS) {
      post_data = {
        gid: nodeInfo.server_group._id,
        cloud: cloudProvider,
        secret: cloudDBCred,
        instance_details:cloudInstanceDetails,
        db_details: cloudDBDetails
      };
    } else if(cloudProvider == CLOUD_PROVIDERS.AZURE){
      post_data = {
        gid: nodeInfo.server_group._id,
        secret: azureCredData,
        cloud: cloudProvider,
        instance_details:azureInstanceData,
        db_details: azureDatabaseData
      };
    }else if(cloudProvider == CLOUD_PROVIDERS.GOOGLE){
      post_data = {
        gid: nodeInfo.server_group._id,
        secret: googleCredData,
        cloud: cloudProvider,
        instance_details:googleInstanceData,
        db_details: googleDatabaseData
      };
    }else if(cloudProvider == CLOUD_PROVIDERS.STARFLEET){
      post_data = {
        gid: nodeInfo.server_group._id,
        cloud: cloudProvider,
        secret: starfleetCredData,
        instance_details: starfleetInstanceData,
        db_details: starfleetDatabaseData
      };
    }

    axiosApi.post(_url, post_data)
      .then((res) => {
        pgAdmin.Browser.Events.trigger('pgadmin:browser:tree:add', res.data.data.node, {'server_group': nodeInfo['server_group']});
        pgAdmin.Browser.BgProcessManager.startProcess(res.data.data.job_id, res.data.data.desc);
        onClose();
      })
      .catch((error) => {
        pgAdmin.Browser.notifier.errorText(gettext(`Error while saving cloud wizard data: ${error.response.data.errormsg}`));
      });
  };

  const disableNextCheck = () => {
    setCallRDSAPI(currentStep);
    let isError = (cloudProvider == '');
    switch(cloudProvider) {
    case CLOUD_PROVIDERS.AWS:
      switch (currentStep) {
      case 0:
        setCloudSelection(CLOUD_PROVIDERS.AWS);
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
    case CLOUD_PROVIDERS.AZURE:
      switch (currentStep) {
      case 0:
        setCloudSelection(CLOUD_PROVIDERS.AZURE);
        break;
      case 1:
        isError = !verificationIntiated;
        break;
      case 2:
        isError = validateAzureStep2(azureInstanceData);
        break;
      case 3:
        isError = validateAzureStep3(azureDatabaseData, nodeInfo);
        break;
      default:
        break;
      }
      break;
    case CLOUD_PROVIDERS.GOOGLE:
      switch (currentStep) {
      case 0:
        setCloudSelection(CLOUD_PROVIDERS.GOOGLE);
        break;
      case 1:
        isError = !verificationIntiated;
        break;
      case 2:
        isError = validateGoogleStep2(googleInstanceData);
        break;
      case 3:
        isError = validateGoogleStep3(googleDatabaseData, nodeInfo);
        break;
      default:
        break;
      }
      break;
    case CLOUD_PROVIDERS.STARFLEET:
      switch (currentStep) {
      case 0:
        setCloudSelection(CLOUD_PROVIDERS.STARFLEET);
        break;
      case 1:
        isError = validateStarfleetStep1(starfleetCredData);
        break;
      case 2:
        isError = validateStarfleetStep2(starfleetInstanceData);
        break;
      case 3:
        isError = validateStarfleetStep3(starfleetDatabaseData, nodeInfo);
        break;
      default:
        break;
      }
    }
    return isError;
  };

  const onBeforeBack = (activeStep) => {
    return new Promise((resolve)=>{
      if(activeStep == 1 && (cloudProvider == CLOUD_PROVIDERS.AWS || cloudProvider == CLOUD_PROVIDERS.AZURE || cloudProvider == CLOUD_PROVIDERS.GOOGLE || cloudProvider == CLOUD_PROVIDERS.STARFLEET)) {
        setVerificationIntiated(false);
      }
      setErrMsg(['', '']);
      resolve();
    });
  };

  const onBeforeNext = (activeStep) => {
    return new Promise((resolve, reject)=>{
      if(activeStep == 1 && cloudProvider == CLOUD_PROVIDERS.AWS) {
        setErrMsg([MESSAGE_TYPE.INFO, gettext('Validating credentials...')]);
        let _url = url_for('rds.verify_credentials');
        const post_data = {
          cloud: cloudSelection,
          secret: cloudDBCred,
        };
        axiosApi.post(_url, post_data)
          .then((res) => {
            if(!res.data.success) {
              setErrMsg([MESSAGE_TYPE.ERROR, res.data.info]);
              reject(new Error(res.data.info));
            } else {
              setErrMsg(['', '']);
              resolve();
            }
          })
          .catch(() => {
            setErrMsg([MESSAGE_TYPE.ERROR, gettext('Error while checking cloud credentials')]);
            reject(new Error(gettext('Error while checking cloud credentials')));
          });
      } else if(activeStep == 1 && cloudProvider == CLOUD_PROVIDERS.STARFLEET) {
        setErrMsg([MESSAGE_TYPE.INFO, gettext('Validating credentials...')]);
        let _url = url_for('starfleet.verify_credentials');
        const post_data = {
          cloud: cloudSelection,
          secret: starfleetCredData,
        };
        axiosApi.post(_url, post_data)
          .then((res) => {
            if(!res.data.success) {
              const msg = res.data.errormsg || res.data.info;
              setErrMsg([MESSAGE_TYPE.ERROR, msg]);
              reject(new Error(msg));
            } else {
              const byoc = Boolean(res.data.data?.byoc);
              setStarfleetByoc(byoc);
              if (!byoc && starfleetInstanceData.kind == 'byoc') {
                setStarfleetInstanceData({...starfleetInstanceData, kind: 'managed'});
              }
              setErrMsg(['', '']);
              resolve();
            }
          })
          .catch((error) => {
            const msg = error.response?.data?.errormsg || gettext('Error while checking cloud credentials');
            setErrMsg([MESSAGE_TYPE.ERROR, msg]);
            reject(new Error(msg));
          });
      } else if (cloudProvider == CLOUD_PROVIDERS.AZURE
                 && activeStep == 2) {
        setErrMsg([MESSAGE_TYPE.INFO, gettext('Checking cluster name availability...')]);
        checkClusternameAvailbility(azureInstanceData.name)
          .then((res)=>{
            if (res && res.success == 0 ) {
              setErrMsg([MESSAGE_TYPE.ERROR, gettext('Specified cluster name is already used.')]);
            }else{
              setErrMsg(['', '']);
            }
            resolve();
          }).catch((error)=>{
            const msg = error?.message || gettext('Error while checking server name availability with Microsoft Azure.');
            setErrMsg([MESSAGE_TYPE.ERROR, msg]);
            reject(new Error(msg));
          });
      }
      else {
        setErrMsg(['', '']);
        resolve();
      }
    });
  };

  const onDialogHelp = () => {
    window.open(url_for('help.static', { 'filename': 'cloud_deployment.html' }), 'pgadmin_help');
  };

  const onErrClose = React.useCallback(()=>{
    setErrMsg([]);
  });

  let cloud_providers = [
    {label: gettext(CLOUD_PROVIDERS_LABELS.AWS), value: CLOUD_PROVIDERS.AWS, icon: <AWSIcon  />},
    {label: gettext(CLOUD_PROVIDERS_LABELS.AZURE), value: CLOUD_PROVIDERS.AZURE, icon: <AzureIcon  /> },
    {label: gettext(CLOUD_PROVIDERS_LABELS.GOOGLE), value: CLOUD_PROVIDERS.GOOGLE, icon: <GoogleCloudIcon  /> },
    {label: gettext(CLOUD_PROVIDERS_LABELS.STARFLEET), value: CLOUD_PROVIDERS.STARFLEET, icon: <StarfleetIcon  /> }];

  return (
    <CloudWizardEventsContext.Provider value={eventBus.current}>
      <Wizard
        title={gettext('Deploy Cloud Instance')}
        stepList={steps}
        disableNextStep={disableNextCheck}
        onStepChange={wizardStepChange}
        onSave={onSave}
        onHelp={onDialogHelp}
        beforeNext={onBeforeNext}
        beforeBack={onBeforeBack}>
        <WizardStep stepId={0}>
          <Box sx={{ marginBottom: '1em', display: 'flex'}}>
            <Box sx={{paddingTop: '10px', flex: 2.5}}>{gettext('Select a cloud provider for the PostgreSQL database.')}</Box>
          </Box>
          <Box sx={{ marginBottom: '1em', display: 'flex'}}>
            <ToggleButtons cloudProvider={cloudProvider} setCloudProvider={setCloudProvider}
              options={cloud_providers}
            ></ToggleButtons>
          </Box>
          <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} plainText />
        </WizardStep>
        <WizardStep stepId={1} >
          {cloudProvider == CLOUD_PROVIDERS.AWS && <AwsCredentials cloudProvider={cloudProvider} nodeInfo={nodeInfo} nodeData={nodeData} setCloudDBCred={setCloudDBCred}/>}
          { cloudProvider == CLOUD_PROVIDERS.AZURE &&
            <Box flexGrow={1}>
              <AzureCredentials cloudProvider={cloudProvider} setAzureCredData={setAzureCredData}/>
            </Box>}
          { cloudProvider == CLOUD_PROVIDERS.GOOGLE &&
            <Box flexGrow={1}>
              <GoogleCredentials cloudProvider={cloudProvider} setGoogleCredData={setGoogleCredData}/>
            </Box>}
          { cloudProvider == CLOUD_PROVIDERS.STARFLEET &&
            <Box flexGrow={1}>
              <StarfleetCredentials cloudProvider={cloudProvider} setStarfleetCredData={setStarfleetCredData}/>
            </Box>}
          <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} plainText />
        </WizardStep>
        <WizardStep stepId={2} >
          {cloudProvider == CLOUD_PROVIDERS.AWS && callRDSAPI == 2 && <AwsInstanceDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setCloudInstanceDetails={setCloudInstanceDetails}
            hostIP={hostIP} /> }
          {cloudProvider == CLOUD_PROVIDERS.AZURE && callRDSAPI == 2 && <AzureInstanceDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setAzureInstanceData={setAzureInstanceData}
            hostIP={hostIP}
            azureInstanceData = {azureInstanceData}
          /> }
          {cloudProvider == CLOUD_PROVIDERS.GOOGLE && callRDSAPI == 2 && <GoogleInstanceDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setGoogleInstanceData={setGoogleInstanceData}
            hostIP={hostIP}
            googleInstanceData = {googleInstanceData}
          /> }
          {cloudProvider == CLOUD_PROVIDERS.STARFLEET && callRDSAPI == 2 && <StarfleetInstanceDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setStarfleetInstanceData={setStarfleetInstanceData}
            starfleetInstanceData={starfleetInstanceData}
            byoc={starfleetByoc}
            hostIP={hostIP}
          /> }
          <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} plainText />
        </WizardStep>
        <WizardStep stepId={3} >
          {cloudProvider == CLOUD_PROVIDERS.AWS && <AwsDatabaseDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setCloudDBDetails={setCloudDBDetails}
          />
          }
          {cloudProvider == CLOUD_PROVIDERS.AZURE && <AzureDatabaseDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setAzureDatabaseData={setAzureDatabaseData}
          />
          }
          {cloudProvider == CLOUD_PROVIDERS.GOOGLE && <GoogleDatabaseDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setGoogleDatabaseData={setGoogleDatabaseData}
          />
          }
          {cloudProvider == CLOUD_PROVIDERS.STARFLEET && <StarfleetDatabaseDetails
            cloudProvider={cloudProvider}
            nodeInfo={nodeInfo}
            nodeData={nodeData}
            setStarfleetDatabaseData={setStarfleetDatabaseData}
          />
          }
        </WizardStep>
        <WizardStep stepId={4} >
          <Box sx={{ paddingBottom: '5px'}}>{gettext('Please review the details before creating the cloud instance.')}</Box>
          <Paper variant="outlined" elevation={0} sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto'}}>
            {cloudProvider == CLOUD_PROVIDERS.AWS && callRDSAPI == 4 && <FinalSummary
              cloudProvider={cloudProvider}
              instanceData={cloudInstanceDetails}
              databaseData={cloudDBDetails}
            />
            }
            {cloudProvider == CLOUD_PROVIDERS.AZURE && callRDSAPI == 4 && <FinalSummary
              cloudProvider={cloudProvider}
              instanceData={azureInstanceData}
              databaseData={azureDatabaseData}
            />
            }
            {cloudProvider == CLOUD_PROVIDERS.GOOGLE && callRDSAPI == 4 && <FinalSummary
              cloudProvider={cloudProvider}
              instanceData={googleInstanceData}
              databaseData={googleDatabaseData}
            />
            }
            {cloudProvider == CLOUD_PROVIDERS.STARFLEET && callRDSAPI == 4 && <FinalSummary
              cloudProvider={cloudProvider}
              instanceData={starfleetInstanceData}
              databaseData={starfleetDatabaseData}
            />
            }
          </Paper>
        </WizardStep>
      </Wizard>
    </CloudWizardEventsContext.Provider>
  );
}

CloudWizard.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  onClose: PropTypes.func,
  cloudPanelId: PropTypes.string,
};
