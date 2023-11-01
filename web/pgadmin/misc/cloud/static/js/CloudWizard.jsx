/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
import PropTypes from 'prop-types';
import pgAdmin from 'sources/pgadmin';
import {ToggleButtons, FinalSummary} from './cloud_components';
import { PrimaryButton } from '../../../../static/js/components/Buttons';
import {AwsCredentials, AwsInstanceDetails, AwsDatabaseDetails, validateCloudStep1, validateCloudStep2, validateCloudStep3} from './aws';
import {BigAnimalInstance, BigAnimalDatabase, BigAnimalClusterType, validateBigAnimal, validateBigAnimalStep2, validateBigAnimalStep3, validateBigAnimalStep4} from './biganimal';
import { isEmptyString } from 'sources/validators';
import { AWSIcon, BigAnimalIcon, AzureIcon, GoogleCloudIcon } from '../../../../static/js/components/ExternalIcon';
import {AzureCredentials, AzureInstanceDetails, AzureDatabaseDetails, checkClusternameAvailbility, validateAzureStep2, validateAzureStep3} from './azure';
import { GoogleCredentials, GoogleInstanceDetails, GoogleDatabaseDetails, validateGoogleStep2, validateGoogleStep3 } from './google';
import EventBus from '../../../../static/js/helpers/EventBus';
import { CLOUD_PROVIDERS, CLOUD_PROVIDERS_LABELS } from './cloud_constants';
import { LAYOUT_EVENTS } from '../../../../static/js/helpers/Layout';


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
    authButton: {
      marginLeft: '12em'
    }
  }),
);

export const CloudWizardEventsContext = React.createContext();

export default function CloudWizard({ nodeInfo, nodeData, onClose, cloudPanelId}) {
  const classes = useStyles();
  const eventBus = React.useRef(new EventBus());

  let steps = [gettext('Cloud Provider'), gettext('Credentials'), gettext('Cluster Type'),
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
  const [bigAnimalClusterTypeData, setBigAnimalClusterTypeData] = React.useState({});

  const [azureCredData, setAzureCredData] = React.useState({});
  const [azureInstanceData, setAzureInstanceData] = React.useState({});
  const [azureDatabaseData, setAzureDatabaseData] = React.useState({});

  const [googleCredData, setGoogleCredData] = React.useState({});
  const [googleInstanceData, setGoogleInstanceData] = React.useState({});
  const [googleDatabaseData, setGoogleDatabaseData] = React.useState({});

  const axiosApi = getApiInstance();

  const [verificationURI, setVerificationURI] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');

  const authInterval = React.useRef();

  React.useEffect(()=>{
    eventBus.current.registerListener('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD', (msg) => {
      setErrMsg(msg);
    });

    eventBus.current.registerListener('SET_CRED_VERIFICATION_INITIATED', (initiated) => {
      setVerificationIntiated(initiated);
    });

    const onWizardClosing = (panelId)=>{
      if(panelId == cloudPanelId) {
        clearInterval(authInterval.current);
        onClose();
      }
    };
    pgAdmin.Browser.docker.eventBus.registerListener(LAYOUT_EVENTS.CLOSING, onWizardClosing);
    return ()=>{
      pgAdmin.Browser.docker.eventBus.deregisterListener(LAYOUT_EVENTS.CLOSING, onWizardClosing);
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
        pgAdmin.Browser.notifier.error(gettext(`Error while getting the host ip: ${error.response.data.errormsg}`));
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

    }else {
      post_data = {
        gid: nodeInfo.server_group._id,
        cloud: cloudProvider,
        cluster_details: bigAnimalClusterTypeData,
        instance_details: bigAnimalInstanceData,
        db_details: bigAnimalDatabaseData
      };
    }

    axiosApi.post(_url, post_data)
      .then((res) => {
        pgAdmin.Browser.Events.trigger('pgadmin:browser:tree:add', res.data.data.node, {'server_group': nodeInfo['server_group']});
        pgAdmin.Browser.BgProcessManager.startProcess(res.data.data.job_id, res.data.data.desc);
        onClose();
      })
      .catch((error) => {
        pgAdmin.Browser.notifier.error(gettext(`Error while saving cloud wizard data: ${error.response.data.errormsg}`));
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
        break;
      case 3:
        isError = validateCloudStep2(cloudInstanceDetails, hostIP);
        break;
      case 4:
        isError = validateCloudStep3(cloudDBDetails, nodeInfo);
        break;
      default:
        break;
      }
      break;
    case CLOUD_PROVIDERS.BIGANIMAL:
      switch (currentStep) {
      case 0:
        setCloudSelection(CLOUD_PROVIDERS.BIGANIMAL);
        break;
      case 1:
        isError = !verificationIntiated;
        break;
      case 2:
        isError = validateBigAnimalStep2(bigAnimalClusterTypeData);
        break;
      case 3:
        isError = validateBigAnimalStep3(bigAnimalInstanceData);
        break;
      case 4:
        isError = validateBigAnimalStep4(bigAnimalDatabaseData, nodeInfo);
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
        break;
      case 3:
        isError = validateAzureStep2(azureInstanceData);
        break;
      case 4:
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
        break;
      case 3:
        isError = validateGoogleStep2(googleInstanceData);
        break;
      case 4:
        isError = validateGoogleStep3(googleDatabaseData, nodeInfo);
        break;
      default:
        break;
      }
    }
    return isError;
  };

  const onBeforeBack = (activeStep) => {
    return new Promise((resolve)=>{
      if(activeStep == 3 && (cloudProvider == CLOUD_PROVIDERS.AWS || cloudProvider == CLOUD_PROVIDERS.AZURE || cloudProvider == CLOUD_PROVIDERS.GOOGLE)) {
        resolve(true);
      }
      else if(activeStep == 1  && (cloudProvider == CLOUD_PROVIDERS.AWS || cloudProvider == CLOUD_PROVIDERS.AZURE || cloudProvider == CLOUD_PROVIDERS.GOOGLE)) {
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
              if (activeStep == 1) {
                resolve(true);
              } else {
                resolve(false);
              }
            }
          })
          .catch(() => {
            setErrMsg([MESSAGE_TYPE.ERROR, gettext('Error while checking cloud credentials')]);
            reject();
          });
      } else if(activeStep == 0 && cloudProvider == CLOUD_PROVIDERS.BIGANIMAL) {
        if (!isEmptyString(verificationURI)) { resolve(); return; }
        setErrMsg([MESSAGE_TYPE.INFO, gettext('Getting EDB BigAnimal verification URL...')]);
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
      } else if (cloudProvider == CLOUD_PROVIDERS.AZURE) {
        if (activeStep == 1) {
          // Skip the current step
          setErrMsg(['', '']);
          resolve(true);
        } else if (activeStep == 2) {
          setErrMsg([MESSAGE_TYPE.INFO, gettext('Checking cluster name availability...')]);
          checkClusternameAvailbility(azureInstanceData.name)
            .then((res)=>{
              if (res.data && res.data.success == 0 ) {
                setErrMsg([MESSAGE_TYPE.ERROR, gettext('Specified cluster name is already used.')]);
              }else{
                setErrMsg(['', '']);
              }
              resolve();
            }).catch((error)=>{
              setErrMsg([MESSAGE_TYPE.ERROR, gettext(error)]);
              reject();
            });
        } else {
          resolve();
        }
      }else if (cloudProvider == CLOUD_PROVIDERS.GOOGLE) {
        if (activeStep == 1) {
          // Skip the current step
          setErrMsg(['', '']);
          resolve(true);
        } else if (activeStep == 2) { resolve(true);} else {
          resolve();
        }
      }
      else {
        setErrMsg(['', '']);
        resolve();
      }
    });
  };

  const authenticateBigAnimal = () => {
    let loading_icon_url = url_for(
      'static', { 'filename': 'img/loading.gif'}
    );

    setErrMsg([MESSAGE_TYPE.INFO, gettext('EDB BigAnimal authentication process is in progress...') + '<img src="' + loading_icon_url + '" alt="' + gettext('Loading...') + '">']);
    let child = window.open(verificationURI, 'edb_biganimal_authentication');
    let _url = url_for('biganimal.verification_ack') ;
    let countdown = 60;
    authInterval.current = setInterval(() => {
      axiosApi.get(_url)
        .then((res) => {
          if (res.data && res.data.success == 1 ) {
            setErrMsg([MESSAGE_TYPE.SUCCESS, gettext('Authentication completed successfully. Click the Next button to proceed.')]);
            setVerificationIntiated(true);
            clearInterval(authInterval.current);
          } else if (res.data && res.data.success == 0 &&  res.data.errormsg == 'access_denied') {
            setErrMsg([MESSAGE_TYPE.INFO, gettext('Verification failed. Access Denied...')]);
            setVerificationIntiated(false);
            clearInterval(authInterval.current);
          } else if (res.data && res.data.success == 0 &&  res.data.errormsg == 'forbidden') {
            setErrMsg([MESSAGE_TYPE.INFO, gettext('Authentication completed successfully but you do not have permission to create the cluster.')]);
            setVerificationIntiated(false);
            clearInterval(authInterval.current);
          } else if (child.closed && !verificationIntiated && countdown <= 0) {
            setVerificationIntiated(false);
            setErrMsg([MESSAGE_TYPE.ERROR, gettext('Authentication is aborted.')]);
            clearInterval(authInterval.current);
          }
          authInterval.current = null;
        })
        .catch((error) => {
          setErrMsg([MESSAGE_TYPE.ERROR, gettext(`Error while verifying EDB BigAnimal: ${error.response.data.errormsg}`)]);
        });
      countdown = countdown - 1;
    }, 1000);
  };


  const onDialogHelp = () => {
    window.open(url_for('help.static', { 'filename': 'cloud_deployment.html' }), 'pgadmin_help');
  };

  const onErrClose = React.useCallback(()=>{
    setErrMsg([]);
  });

  let cloud_providers = [
    {label: gettext(CLOUD_PROVIDERS_LABELS.AWS), value: CLOUD_PROVIDERS.AWS, icon: <AWSIcon className={classes.icon} />},
    {label: gettext(CLOUD_PROVIDERS_LABELS.BIGANIMAL), value: CLOUD_PROVIDERS.BIGANIMAL, icon: <BigAnimalIcon className={classes.icon} />},
    {label: gettext(CLOUD_PROVIDERS_LABELS.AZURE), value: CLOUD_PROVIDERS.AZURE, icon: <AzureIcon className={classes.icon} /> },
    {label: gettext(CLOUD_PROVIDERS_LABELS.GOOGLE), value: CLOUD_PROVIDERS.GOOGLE, icon: <GoogleCloudIcon className={classes.icon} /> }];

  return (
    <CloudWizardEventsContext.Provider value={eventBus.current}>
      <>
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
            <Box className={classes.messageBox}>
              <Box className={classes.messagePadding}>{gettext('Select a cloud provider for PostgreSQL database.')}</Box>
            </Box>
            <Box className={classes.messageBox}>
              <ToggleButtons cloudProvider={cloudProvider} setCloudProvider={setCloudProvider}
                options={cloud_providers}
              ></ToggleButtons>
            </Box>
            <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} />
          </WizardStep>
          <WizardStep stepId={1} >
            <Box className={classes.buttonMarginEDB}>
              {cloudProvider == CLOUD_PROVIDERS.BIGANIMAL && <Box className={classes.messageBox}>
                <Box>{gettext('The verification code to authenticate the pgAdmin to EDB BigAnimal is: ')} <strong>{verificationCode}</strong>
                  <br/>{gettext('By clicking the below button, you will be redirected to the EDB BigAnimal authentication page in a new tab.')}
                </Box>
              </Box>}
              {cloudProvider == CLOUD_PROVIDERS.BIGANIMAL && <PrimaryButton onClick={authenticateBigAnimal} disabled={verificationIntiated ? true: false}>
                {gettext('Click here to authenticate yourself to EDB BigAnimal')}
              </PrimaryButton>}
              {cloudProvider == CLOUD_PROVIDERS.BIGANIMAL && <Box className={classes.messageBox}>
                <Box ></Box>
              </Box>}
            </Box>
            {cloudProvider == CLOUD_PROVIDERS.AWS && <AwsCredentials cloudProvider={cloudProvider} nodeInfo={nodeInfo} nodeData={nodeData} setCloudDBCred={setCloudDBCred}/>}
            { cloudProvider == CLOUD_PROVIDERS.AZURE &&
            <Box flexGrow={1}>
              <AzureCredentials cloudProvider={cloudProvider} nodeInfo={nodeInfo} nodeData={nodeData} setAzureCredData={setAzureCredData}/>
            </Box>}
            <Box flexGrow={1}>
              {cloudProvider == CLOUD_PROVIDERS.GOOGLE && <GoogleCredentials cloudProvider={cloudProvider} nodeInfo={nodeInfo} nodeData={nodeData} setGoogleCredData={setGoogleCredData}/>}
            </Box>
            <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} />
          </WizardStep>
          <WizardStep stepId={2} >
            {cloudProvider == CLOUD_PROVIDERS.BIGANIMAL && callRDSAPI == 2 && <BigAnimalClusterType
              cloudProvider={cloudProvider}
              nodeInfo={nodeInfo}
              nodeData={nodeData}
              setBigAnimalClusterTypeData={setBigAnimalClusterTypeData}
              hostIP={hostIP}
            /> }
            <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} />
          </WizardStep>
          <WizardStep stepId={3} >
            {cloudProvider == CLOUD_PROVIDERS.AWS && callRDSAPI == 3 && <AwsInstanceDetails
              cloudProvider={cloudProvider}
              nodeInfo={nodeInfo}
              nodeData={nodeData}
              setCloudInstanceDetails={setCloudInstanceDetails}
              hostIP={hostIP} /> }
            {cloudProvider == CLOUD_PROVIDERS.BIGANIMAL && callRDSAPI == 3 && <BigAnimalInstance
              cloudProvider={cloudProvider}
              nodeInfo={nodeInfo}
              nodeData={nodeData}
              setBigAnimalInstanceData={setBigAnimalInstanceData}
              hostIP={hostIP}
              bigAnimalClusterTypeData={bigAnimalClusterTypeData}
            /> }
            {cloudProvider == CLOUD_PROVIDERS.AZURE && callRDSAPI == 3 && <AzureInstanceDetails
              cloudProvider={cloudProvider}
              nodeInfo={nodeInfo}
              nodeData={nodeData}
              setAzureInstanceData={setAzureInstanceData}
              hostIP={hostIP}
              azureInstanceData = {azureInstanceData}
            /> }
            {cloudProvider == CLOUD_PROVIDERS.GOOGLE && callRDSAPI == 3 && <GoogleInstanceDetails
              cloudProvider={cloudProvider}
              nodeInfo={nodeInfo}
              nodeData={nodeData}
              setGoogleInstanceData={setGoogleInstanceData}
              hostIP={hostIP}
              googleInstanceData = {googleInstanceData}
            /> }
            <FormFooterMessage type={errMsg[0]} message={errMsg[1]} onClose={onErrClose} />
          </WizardStep>
          <WizardStep stepId={4} >
            {cloudProvider == CLOUD_PROVIDERS.AWS && <AwsDatabaseDetails
              cloudProvider={cloudProvider}
              nodeInfo={nodeInfo}
              nodeData={nodeData}
              setCloudDBDetails={setCloudDBDetails}
            />
            }
            {cloudProvider == CLOUD_PROVIDERS.BIGANIMAL && callRDSAPI == 4 && <BigAnimalDatabase
              cloudProvider={cloudProvider}
              nodeInfo={nodeInfo}
              nodeData={nodeData}
              setBigAnimalDatabaseData={setBigAnimalDatabaseData}
              bigAnimalClusterTypeData={bigAnimalClusterTypeData}
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
          </WizardStep>
          <WizardStep stepId={5} >
            <Box className={classes.boxText}>{gettext('Please review the details before creating the cloud instance.')}</Box>
            <Paper variant="outlined" elevation={0} className={classes.summaryContainer}>
              {cloudProvider == CLOUD_PROVIDERS.AWS && callRDSAPI == 5 && <FinalSummary
                cloudProvider={cloudProvider}
                instanceData={cloudInstanceDetails}
                databaseData={cloudDBDetails}
              />
              }
              {cloudProvider == CLOUD_PROVIDERS.BIGANIMAL && callRDSAPI == 5 && <FinalSummary
                cloudProvider={cloudProvider}
                instanceData={bigAnimalInstanceData}
                databaseData={bigAnimalDatabaseData}
                clusterTypeData={bigAnimalClusterTypeData}
              />
              }
              {cloudProvider == CLOUD_PROVIDERS.AZURE && callRDSAPI == 5 && <FinalSummary
                cloudProvider={cloudProvider}
                instanceData={azureInstanceData}
                databaseData={azureDatabaseData}
              />
              }
              {cloudProvider == CLOUD_PROVIDERS.GOOGLE && callRDSAPI == 5 && <FinalSummary
                cloudProvider={cloudProvider}
                instanceData={googleInstanceData}
                databaseData={googleDatabaseData}
              />
              }
            </Paper>
          </WizardStep>
        </Wizard>
      </>
    </CloudWizardEventsContext.Provider>
  );
}

CloudWizard.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  onClose: PropTypes.func,
  cloudPanel: PropTypes.object,
  cloudPanelId: PropTypes.string,
};
