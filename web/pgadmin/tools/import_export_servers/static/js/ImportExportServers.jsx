/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'lodash';
import url_for from 'sources/url_for';
import React from 'react';
import { Box, Paper} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Wizard from '../../../../static/js/helpers/wizard/Wizard';
import WizardStep from '../../../../static/js/helpers/wizard/WizardStep';
import { FormFooterMessage, MESSAGE_TYPE } from '../../../../static/js/components/FormComponents';
import SchemaView from '../../../../static/js/SchemaView';
import Loader from 'sources/components/Loader';
import ImportExportSelectionSchema from './import_export_selection.ui';
import CheckBoxTree from '../../../../static/js/components/CheckBoxTree';
import getApiInstance from '../../../../static/js/api_instance';
import Alertify from 'pgadmin.alertifyjs';
import { commonTableStyles } from '../../../../static/js/Theme';
import clsx from 'clsx';
import Notify from '../../../../static/js/helpers/Notifier';
import pgAdmin from 'sources/pgadmin';

const useStyles = makeStyles(() =>
  ({
    root: {
      height: '100%'
    },
    treeContainer: {
      flexGrow: 1,
      minHeight: 0,
    },
    boxText: {
      paddingBottom: '5px'
    },
    noOverflow: {
      overflow: 'hidden'
    },
    summaryContainer: {
      flexGrow: 1,
      minHeight: 0,
      overflow: 'auto',
    }
  }),
);

export default function ImportExportServers() {
  const classes = useStyles();
  const tableClasses = commonTableStyles();

  var steps = ['Import/Export', 'Database Servers', 'Summary'];
  const [loaderText, setLoaderText] = React.useState('');
  const [errMsg, setErrMsg] = React.useState('');
  const [selectionFormData, setSelectionFormData] = React.useState({});
  const [serverData, setServerData] = React.useState([]);
  const [selectedServers, setSelectedServers] = React.useState([]);
  const [summaryData, setSummaryData] = React.useState([]);
  const [summaryText, setSummaryText] = React.useState('');
  const api = getApiInstance();

  const onSave = () => {
    if (selectionFormData.imp_exp == 'i') {
      Notify.confirm(
        gettext('Browser tree refresh required'),
        gettext('A browser tree refresh is required. Do you wish to refresh the tree?'),
        function() {
          pgAdmin.Browser.tree.destroy({
            success: function() {
              pgAdmin.Browser.initializeBrowserTree(pgAdmin.Browser);
              return true;
            },
          });
        },
        function() {
          return true;
        },
        gettext('Refresh'),
        gettext('Later')
      );
    }
 
    Alertify.importExportWizardDialog().close();
  };

  const disableNextCheck = (stepId) => {
    if (stepId == 0) {
      return _.isEmpty(selectionFormData.filename);
    } else if (stepId == 1) {
      return selectedServers.length < 1;
    }

    return false;
  };

  const onDialogHelp= () => {
    window.open(url_for('help.static', { 'filename': 'import_export_servers.html' }), 'pgadmin_help');
  };

  const onErrClose = React.useCallback(()=>{
    setErrMsg('');
  });

  const wizardStepChange= (data) => {
    switch (data.currentStep) {
    case 2: {
      let post_data = {'filename': selectionFormData.filename},
        save_url = url_for('import_export_servers.save');
      if (selectionFormData.imp_exp == 'e') {
        setLoaderText('Exporting Server Groups/Servers ...');
        setSummaryText('Exported following Server Groups/Servers:');

        post_data['type'] = 'export';
        post_data['selected_sever_ids'] = selectedServers;
        api.post(save_url, post_data)
          .then(res => {
            setLoaderText('');
            setSummaryData(res.data.data);
          })
          .catch((err) => {
            setLoaderText('');
            setErrMsg(err.response.data.errormsg);
          });
      } else if (selectionFormData.imp_exp == 'i') {
        setLoaderText('Importing Server Groups/Servers ...');
        setSummaryText('Imported following Server Groups/Servers:');
        // Remove the random number added to create unique tree item,
        let selected_sever_ids = [];
        selectedServers.forEach((id) => {
          selected_sever_ids.push(id.split('_')[0]);
        });

        post_data['type'] = 'import';
        post_data['selected_sever_ids'] = selected_sever_ids;
        post_data['replace_servers'] = selectionFormData.replace_servers;

        api.post(save_url, post_data)
          .then(res => {
            setLoaderText('');
            setSummaryData(res.data.data);
          })
          .catch((err) => {
            setLoaderText('');
            setErrMsg(err.response.data.errormsg);
          });
      }
      break;
    }
    default:
      break;
    }
  };

  const onBeforeNext = (activeStep)=>{
    return new Promise((resolve, reject)=>{
      if(activeStep == 0) {
        setLoaderText('Loading Servers/Server Groups ...');
        if (selectionFormData.imp_exp == 'e') {
          var get_servers_url = url_for('import_export_servers.get_servers');
          api.get(get_servers_url)
            .then(res => {
              setLoaderText('');
              setServerData(res.data.data);
              resolve();
            })
            .catch(() => {
              setLoaderText('');
              setErrMsg(gettext('Error while fetching Server Groups and Servers.'));
              reject();
            });
        } else if (selectionFormData.imp_exp == 'i') {
          var load_servers_url = url_for('import_export_servers.load_servers');
          const post_data = {
            filename: selectionFormData.filename
          };
          api.post(load_servers_url, post_data)
            .then(res => {
              setLoaderText('');
              setServerData(res.data.data);
              resolve();
            })
            .catch((err) => {
              setLoaderText('');
              setErrMsg(err.response.data.errormsg);
              reject();
            });
        }
      } else {
        resolve();
      }
    });
  };

  return (
    <Box className={classes.root}>
      <Loader message={loaderText} />
      <Wizard
        title={gettext('Import/Export Servers')}
        stepList={steps}
        disableNextStep={disableNextCheck}
        onStepChange={wizardStepChange}
        onSave={onSave}
        onHelp={onDialogHelp}
        beforeNext={onBeforeNext}
      >
        <WizardStep stepId={0}>
          <SchemaView
            formType={'dialog'}
            getInitData={() => { }}
            viewHelperProps={{ mode: 'create' }}
            schema={new ImportExportSelectionSchema()}
            showFooter={false}
            isTabView={false}
            onDataChange={(isChanged, changedData) => {
              setSelectionFormData(changedData);
            }}
          />
          <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={errMsg} onClose={onErrClose} />
        </WizardStep>
        <WizardStep stepId={1} className={classes.noOverflow}>
          <Box className={classes.boxText}>{gettext('Select the Server Groups/Servers to import/export:')}</Box>
          <Box className={classes.treeContainer}>
            <CheckBoxTree treeData={serverData} getSelectedServers={(selectedServers) => {
              setSelectedServers(selectedServers);
            }}/>
          </Box>
        </WizardStep>
        <WizardStep stepId={2} className={classes.noOverflow}>
          <Box className={classes.boxText}>{gettext(summaryText)}</Box>
          <Paper variant="outlined" elevation={0} className={classes.summaryContainer}>
            <table className={clsx(tableClasses.table)}>
              <thead>
                <tr>
                  <th>Server Group</th>
                  <th>Server</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((row) => (
                  <tr key={row.srno}>
                    <td>
                      {row.server_group}
                    </td>
                    <td>{row.server}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        </WizardStep>
      </Wizard>
    </Box>
  );
}