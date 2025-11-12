/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'lodash';
import url_for from 'sources/url_for';
import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import Wizard from '../../../../static/js/helpers/wizard/Wizard';
import WizardStep from '../../../../static/js/helpers/wizard/WizardStep';
import PgTable from 'sources/components/PgTable';
import { getNodePrivilegeRoleSchema } from '../../../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui.js';
import { InputSQL, FormFooterMessage, MESSAGE_TYPE } from '../../../../static/js/components/FormComponents';
import getApiInstance from '../../../../static/js/api_instance';
import SchemaView from '../../../../static/js/SchemaView';
import PropTypes from 'prop-types';
import PrivilegeSchema from './privilege_schema.ui';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';

export default function GrantWizard({ sid, did, nodeInfo, nodeData, onClose }) {

  let columns = [
    {

      header: 'Object Type',
      accessorKey: 'object_type',
      enableSorting: true,
      enableResizing: false,
      enableFilters: false
    },
    {
      header: 'Schema',
      accessorKey: 'nspname',
      enableSorting: true,
      enableResizing: false,
      enableFilters: false
    },
    {
      header: 'Name',
      accessorKey: 'name_with_args',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 280
    },
    {
      header: 'parameters',
      accessorKey: 'proargs',
      enableSorting: false,
      enableResizing: false,
      enableFilters: true,
      enableVisibility: false,
      minWidth: 280,
    },
    {
      header: 'Name',
      accessorKey: 'name',
      enableSorting: false,
      enableResizing: false,
      enableFilters: true,
      enableVisibility: false,
      minWidth: 280,
    },
    {
      header: 'ID',
      accessorKey: 'oid',
      enableSorting: false,
      enableResizing: false,
      enableFilters: true,
      enableVisibility: false,
      minWidth: 280,
    }
  ];
  let steps = [gettext('Object Selection'), gettext('Privilege Selection'), gettext('Review')];
  const [selectedRows, setSelectedRows] = React.useState({});
  const [selectedAcl, setSelectedAcl] = React.useState({});
  const [msqlData, setMSQLData] = React.useState('');
  const [loaderText, setLoaderText] = React.useState('');
  const [tableData, setTableData] = React.useState([]);
  const [privOptions, setPrivOptions] = React.useState({});
  const selectedObject = React.useRef([]);
  const privileges = React.useRef([]);
  const [privSchemaInstance, setPrivSchemaInstance] = React.useState();
  const [errMsg, setErrMsg] = React.useState('');
  const pgAdmin = usePgAdmin();

  const api = getApiInstance();
  const validatePrivilege = () => {
    let isValid = true;
    selectedAcl.privilege.forEach((priv) => {
      if ((_.isUndefined(priv.grantee) || _.isUndefined(priv.privileges) || priv.privileges.length === 0) && isValid) {
        isValid = false;
      }
    });
    return !isValid;
  };

  React.useEffect(() => {
    const privSchema = new PrivilegeSchema((privs) => getNodePrivilegeRoleSchema('', nodeInfo, nodeData, privs));
    setPrivSchemaInstance(privSchema);
    setLoaderText('Loading...');

    api.get(url_for(
      'grant_wizard.acl', {
        'sid': encodeURI(sid),
        'did': encodeURI(did),
      }
    )).then(res => {
      setPrivOptions(res.data);
    });

    let node_type = nodeData._type.replace('coll-', '').replace(
      'materialized_', ''
    );
    let _url = url_for(
      'grant_wizard.objects', {
        'sid': encodeURI(sid),
        'did': encodeURI(did),
        'node_id': encodeURI(nodeData._id),
        'node_type': encodeURI(node_type),
      });
    api.get(_url)
      .then(res => {
        let data = res.data.result;
        data.forEach(element => {
          if (element.icon)
            element['icon'] = {
              'object_type': element.icon
            };
          if(element.object_type === 'Function') {
            element.name_with_args = element.name + '(' + (typeof(element.proargs) != 'undefined' ? element.proargs : '') + ')';
          } else {
            element.name_with_args = element.name;
          }
        });
        setTableData(data);
        setLoaderText('');
      })
      .catch(() => {
        pgAdmin.Browser.notifier.error(gettext('Error while fetching grant wizard data.'));
        setLoaderText('');
      });
  }, [nodeData]);

  const wizardStepChange = (data) => {
    if (data.currentStep == 2) {
      setLoaderText('Loading SQL ...');
      let msql_url = url_for(
        'grant_wizard.modified_sql', {
          'sid': encodeURI(sid),
          'did': encodeURI(did),
        });
      let post_data = {
        acl: selectedAcl.privilege,
        objects: selectedObject.current
      };
      api.post(msql_url, post_data)
        .then(res => {
          setMSQLData(res.data.data);
          setLoaderText('');
        })
        .catch(() => {
          pgAdmin.Browser.notifier.error(gettext('Error while fetching SQL.'));
        });
    }
  };

  const onSave = () => {
    setLoaderText('Saving...');
    let _url = url_for(
      'grant_wizard.apply', {
        'sid': encodeURI(sid),
        'did': encodeURI(did),
      });
    const post_data = {
      acl: selectedAcl.privilege,
      objects: selectedObject.current
    };
    api.post(_url, post_data)
      .then(() => {
        setLoaderText('');
        onClose();
      })
      .catch((error) => {
        setLoaderText('');
        pgAdmin.Browser.notifier.error(gettext(`Error while saving grant wizard data: ${error.response.data.errormsg}`));
      });
  };

  const disableNextCheck = (stepId) => {
    if (Object.keys(selectedRows).length > 0 && stepId === 0) {
      return false;
    }

    return selectedAcl?.privilege?.length > 0 && stepId === 1 ? validatePrivilege() : true;
  };

  const onDialogHelp= () => {
    window.open(url_for('help.static', { 'filename': 'grant_wizard.html' }), 'pgadmin_help');
  };

  useEffect(()=>{
    let selObj = [];
    let objectTypes = new Set();
    if (Object.keys(selectedRows).length > 0) {
      Object.keys(selectedRows).forEach((rowId) => {
        const row = tableData[rowId];
        let object_type = '';
        switch (row.object_type) {
        case 'Function':
          object_type = 'function';
          break;
        case 'Trigger Function':
          object_type = 'function';
          break;
        case 'Procedure':
          object_type = 'procedure';
          break;
        case 'Table':
          object_type = 'table';
          break;
        case 'Sequence':
          object_type = 'sequence';
          break;
        case 'View':
          object_type = 'table';
          break;
        case 'Materialized View':
          object_type = 'table';
          break;
        case 'Foreign Table':
          object_type = 'foreign_table';
          break;
        case 'Package':
          object_type = 'package';
          break;
        default:
          break;
        }

        objectTypes.add(object_type);
        selObj.push(row);
      });
    }
    let privs = new Set();
    objectTypes.forEach((objType) => {
      privOptions[objType]?.acl.forEach((priv) => {
        privs.add(priv);
      });
    });
    privileges.current = Array.from(privs);
    selectedObject.current = selObj;
    privSchemaInstance?.privilegeRoleSchema.updateSupportedPrivs(privileges.current);
    setErrMsg(selObj.length === 0 ? gettext('Please select any database object.') : '');
  }, [selectedRows]);

  const onErrClose = React.useCallback(()=>{
    setErrMsg('');
  });

  return (
    <Wizard
      title={gettext('Grant Wizard')}
      stepList={steps}
      disableNextStep={disableNextCheck}
      onStepChange={wizardStepChange}
      onSave={onSave}
      onHelp={onDialogHelp}
      loaderText={loaderText}
    >
      <WizardStep stepId={0}>
        <Box sx={{flexGrow: 1, minHeight: 0}}>
          <PgTable
            caveTable={false}
            tableNoBorder={false}
            height={window.innerHeight - 450}
            columns={columns}
            data={tableData}
            hasSelectRow={true}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
          />
        </Box>
        <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={errMsg} onClose={onErrClose} />
      </WizardStep>
      <WizardStep
        stepId={1}
        sx={{ height:'100%', overflow:'auto'}}>
        {privSchemaInstance &&
          <SchemaView
            formType={'dialog'}
            getInitData={() => {/*This is intentional (SonarQube)*/}}
            viewHelperProps={{ mode: 'create' }}
            schema={privSchemaInstance}
            showFooter={false}
            isTabView={false}
            onDataChange={(isChanged, changedData) => {
              setSelectedAcl(changedData);
            }}
          />
        }
      </WizardStep>
      <WizardStep
        stepId={2}>
        <Box>{gettext('The SQL below will be executed on the database server to grant the selected privileges. Please click on Finish to complete the process.')}</Box>
        <InputSQL
          onLable={true}
          readonly={true}
          value={msqlData.toString()} />
      </WizardStep>
    </Wizard>
  );
}

GrantWizard.propTypes = {
  sid: PropTypes.string,
  did: PropTypes.number,
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  onClose: PropTypes.func
};
