/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
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
import { FormFooterMessage, MESSAGE_TYPE, FormNote } from '../../../../static/js/components/FormComponents';
import SchemaView from '../../../../static/js/SchemaView';
import Loader from 'sources/components/Loader';
import ImportExportSelectionSchema from './import_export_selection.ui';
import CheckBoxTree from '../../../../static/js/components/CheckBoxTree';
import getApiInstance from '../../../../static/js/api_instance';
import PropTypes from 'prop-types';
import { commonTableStyles } from '../../../../static/js/Theme';
import clsx from 'clsx';
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
    },
    noteContainer: {
      marginTop: '5px',
    }
  }),
);

export default function ImportExportServers({onClose}) {
  const classes = useStyles();
  const tableClasses = commonTableStyles();

  let steps = [gettext('Import/Export'), gettext('Database Servers'), gettext('Summary')];
  const [loaderText, setLoaderText] = React.useState('');
  const [errMsg, setErrMsg] = React.useState('');
  const [selectionFormData, setSelectionFormData] = React.useState({});
  const [serverData, setServerData] = React.useState([]);
  const [selectedServers, setSelectedServers] = React.useState([]);
  const [summaryData, setSummaryData] = React.useState([]);
  const [summaryText, setSummaryText] = React.useState('');
  const [noteText, setNoteText] = React.useState('');
  const api = getApiInstance();

  const onSave = () => {
    let post_data = {'filename': selectionFormData.filename},
      save_url = url_for('import_export_servers.save');

    if (selectionFormData.imp_exp == 'e') {
      post_data['type'] = 'export';
      post_data['selected_sever_ids'] = selectedServers;
      api.post(save_url, post_data)
        .then(() => {
          pgAdmin.Browser.notifier.alert(gettext('Export Servers'), gettext('The selected servers were exported successfully.'));
        })
        .catch((err) => {
          pgAdmin.Browser.notifier.alert(gettext('Export Error'), err.response.data.errormsg);
        });
    } else if (selectionFormData.imp_exp == 'i') {
      // Remove the random number added to create unique tree item,
      let selected_sever_ids = [];
      selectedServers.forEach((id) => {
        selected_sever_ids.push(id.split('_')[0]);
      });

      post_data['type'] = 'import';
      post_data['selected_sever_ids'] = selected_sever_ids;
      post_data['replace_servers'] = selectionFormData.replace_servers;

      api.post(save_url, post_data)
        .then(() => {
          pgAdmin.Browser.tree.destroy();

          let msg = gettext('The selected servers were imported successfully.');
          if (selectionFormData.replace_servers) {
            msg = gettext('The existing server groups and servers were removed, and the selected servers were imported successfully.');
          }

          pgAdmin.Browser.notifier.alert(gettext('Import Servers'), msg);
        })
        .catch((err) => {
          pgAdmin.Browser.notifier.alert(gettext('Import error'), err.response.data.errormsg);
        });
    }

    onClose();
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
    if (data.currentStep == 2) {
      let sumData = [],
        serverSerialNumber = 0;
      serverData.forEach((server_group) => {
        server_group.children.forEach((server) =>{
          selectedServers.forEach((id) => {
            if (server.value == id) {
              serverSerialNumber = serverSerialNumber + 1;
              sumData.push({'srno': serverSerialNumber,
                'server_group':server_group.label, 'server': server.label});
            }
          });
        });
      });
      setSummaryData(sumData);
      if (selectionFormData.imp_exp == 'e') {
        setSummaryText('The following servers will be exported. Click the Finish button to complete the export process.');
        setNoteText('');
      } else if (selectionFormData.imp_exp == 'i') {
        setSummaryText(gettext('The following servers will be imported. Click the Finish button to complete the import process.'));
        if (selectionFormData.replace_servers) {
          setNoteText(gettext('All existing server groups and servers will be removed before the servers above are imported. On a successful import process, the object explorer will be refreshed.'));
        } else {
          setNoteText(gettext('On a successful import process, the object explorer will be refreshed.'));
        }
      }
    }
  };

  const onBeforeNext = (activeStep)=>{
    return new Promise((resolve, reject)=>{
      if(activeStep == 0) {
        setLoaderText('Loading Servers/Server Groups ...');
        if (selectionFormData.imp_exp == 'e') {
          let get_servers_url = url_for('import_export_servers.get_servers');
          api.get(get_servers_url)
            .then(res => {
              setLoaderText('');
              setErrMsg('');
              setServerData(res.data.data);
              resolve();
            })
            .catch(() => {
              setLoaderText('');
              setErrMsg(gettext('Error while fetching Server Groups and Servers.'));
              reject();
            });
        } else if (selectionFormData.imp_exp == 'i') {
          let load_servers_url = url_for('import_export_servers.load_servers');
          const post_data = {
            filename: selectionFormData.filename
          };
          api.post(load_servers_url, post_data)
            .then(res => {
              setLoaderText('');
              setErrMsg('');
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
            getInitData={() => {/*This is intentional (SonarQube)*/}}
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
            <CheckBoxTree treeData={serverData} getSelectedServers={(selServers) => {
              setSelectedServers(selServers);
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
          {selectionFormData.imp_exp == 'i' &&
          <FormNote className={classes.noteContainer} text={noteText}/> }
        </WizardStep>
      </Wizard>
    </Box>
  );
}
ImportExportServers.propTypes = {
  onClose: PropTypes.func
};
