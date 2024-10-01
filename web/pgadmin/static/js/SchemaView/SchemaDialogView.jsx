/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useState, useEffect, useMemo } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import DoneIcon from '@mui/icons-material/Done';
import InfoIcon from '@mui/icons-material/InfoRounded';
import HelpIcon from '@mui/icons-material/HelpRounded';
import PublishIcon from '@mui/icons-material/Publish';
import SaveIcon from '@mui/icons-material/Save';
import SettingsBackupRestoreIcon from
  '@mui/icons-material/SettingsBackupRestore';
import Box from '@mui/material/Box';
import _ from 'lodash';
import PropTypes from 'prop-types';

import { parseApiError } from 'sources/api_instance';
import { usePgAdmin } from 'sources/BrowserComponent';
import { useIsMounted } from 'sources/custom_hooks';
import {
  DefaultButton, PgIconButton
} from 'sources/components/Buttons';
import CustomPropTypes from 'sources/custom_prop_types';
import gettext from 'sources/gettext';

import { FormLoader } from './FormLoader';
import FormView from './FormView';
import { ResetButton } from './ResetButton';
import { SaveButton } from './SaveButton';
import { SchemaStateContext } from './SchemaState';
import { StyledBox } from './StyledComponents';
import { useSchemaState } from './hooks';
import { getForQueryParams } from './common';


/* If its the dialog */
export default function SchemaDialogView({
  getInitData, viewHelperProps, loadingText, schema={}, showFooter=true,
  isTabView=true, checkDirtyOnEnableSave=false, ...props
}) {
  // View helper properties
  const onDataChange  = props.onDataChange;
  const [resetKey, setResetKey] = useState(0);

  // Schema data state manager
  const {schemaState, dataDispatch, reset} = useSchemaState({
    schema: schema, getInitData: getInitData, immutableData: {},
    viewHelperProps: viewHelperProps, onDataChange: onDataChange,
    loadingText,
  });

  const resetView = () => {
    reset();
    setResetKey(Date.now());
  };

  // Is saving operation in progress?
  const setSaving = (val) => schemaState.isSaving = val;
  const setLoaderText = (val) => schemaState.setMessage(val);

  // First element to be set by the FormView to set the focus after loading
  // the data.
  const checkIsMounted = useIsMounted();

  // Notifier object.
  const pgAdmin = usePgAdmin();
  const Notifier = props.Notifier || pgAdmin.Browser.notifier;

  useEffect(() => {
    if (!props.resetKey) return;
    resetView();
  }, [props.resetKey]);

  const onResetClick = () => {
    const resetIt = () => {
      resetView();
      return true;
    };

    if (!props.confirmOnCloseReset) {
      resetIt();
      return;
    }

    Notifier.confirm(
      gettext('Warning'),
      gettext('Changes will be lost. Are you sure you want to reset?'),
      resetIt, () => (true),
    );
  };

  const save = (changeData) => {
    props.onSave(schemaState.isNew, changeData)
      .then(()=>{
        if(schema.informText) {
          Notifier.alert(
            gettext('Warning'),
            schema.informText,
          );
        }
      }).catch((err)=>{
        schemaState.setError({
          name: 'apierror',
          message: _.escape(parseApiError(err)),
        });
      }).finally(()=>{
        if(checkIsMounted()) {
          setSaving(false);
          setLoaderText('');
        }
      });
  };

  const onSaveClick = () => {
    // Do nothing when there is no change or there is an error
    if (
      !schemaState._changes || Object.keys(schemaState._changes) === 0 ||
      schemaState.errors.name
    ) return;

    setSaving(true);
    setLoaderText('Saving...');

    if (!schema.warningText) {
      save(schemaState.changes(true));
      return;
    }

    Notifier.confirm(
      gettext('Warning'),
      schema.warningText,
      () => { save(schemaState.changes(true)); },
      () => {
        setSaving(false);
        setLoaderText('');
        return true;
      },
    );
  };

  const getSQLValue = () => {
    // Called when SQL tab is active.
    if(!schemaState.isDirty) {
      return Promise.resolve('-- ' + gettext('No updates.'));
    }

    if(schemaState.errors.name) {
      return Promise.resolve('-- ' + gettext('Definition incomplete.'));
    }

    const changeData = schemaState._changes;
    /*
     * Call the passed incoming getSQLValue func to get the SQL
     * return of getSQLValue should be a promise.
     */
    return props.getSQLValue(schemaState.isNew, getForQueryParams(changeData));
  };

  const getButtonIcon = () => {
    if(props.customSaveBtnIconType == 'upload') {
      return <PublishIcon />;
    } else if(props.customSaveBtnIconType == 'done') {
      return <DoneIcon />;
    }
    return <SaveIcon />;
  };

  /* I am Groot */
  return useMemo(() =>
    <StyledBox>
      <SchemaStateContext.Provider value={schemaState}>
        <Box className='Dialog-form'>
          <FormLoader/>
          <FormView
            viewHelperProps={viewHelperProps}
            schema={schema} accessPath={[]}
            dataDispatch={dataDispatch}
            hasSQLTab={props.hasSQL} getSQLValue={getSQLValue}
            isTabView={isTabView}
            className={props.formClassName}
            showError={true} resetKey={resetKey}
            focusOnFirstInput={true}
          />
        </Box>
        {showFooter &&
          <Box className='Dialog-footer'>
            {
              (!props.disableSqlHelp || !props.disableDialogHelp) &&
                <Box>
                  <PgIconButton data-test='sql-help'
                    onClick={()=>props.onHelp(true, schemaState.isNew)}
                    icon={<InfoIcon />} disabled={props.disableSqlHelp}
                    className='Dialog-buttonMargin'
                    title={ gettext('SQL help for this object type.') }
                  />
                  <PgIconButton data-test='dialog-help'
                    onClick={()=>props.onHelp(false, schemaState.isNew)}
                    icon={<HelpIcon />} disabled={props.disableDialogHelp}
                    title={ gettext('Help for this dialog.') }
                  />
                </Box>
            }
            <Box marginLeft='auto'>
              <DefaultButton data-test='Close' onClick={props.onClose}
                startIcon={<CloseIcon />} className='Dialog-buttonMargin'>
                { gettext('Close') }
              </DefaultButton>
              <ResetButton
                onClick={onResetClick}
                icon={<SettingsBackupRestoreIcon />}
                label={ gettext('Reset') }/>
              <SaveButton
                onClick={onSaveClick} icon={getButtonIcon()}
                label={props.customSaveBtnName || gettext('Save')}
                checkDirtyOnEnableSave={checkDirtyOnEnableSave}
                mode={viewHelperProps.mode}
              />
            </Box>
          </Box>
        }
      </SchemaStateContext.Provider>
    </StyledBox>, [schema._id, viewHelperProps.mode, resetKey]
  );
}

SchemaDialogView.propTypes = {
  getInitData: PropTypes.func,
  viewHelperProps: PropTypes.shape({
    mode: PropTypes.string.isRequired,
    serverInfo: PropTypes.shape({
      type: PropTypes.string,
      version: PropTypes.number,
    }),
    inCatalog: PropTypes.bool,
    keepCid: PropTypes.bool,
  }).isRequired,
  loadingText: PropTypes.string,
  schema: CustomPropTypes.schemaUI,
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  onHelp: PropTypes.func,
  onDataChange: PropTypes.func,
  confirmOnCloseReset: PropTypes.bool,
  isTabView: PropTypes.bool,
  hasSQL: PropTypes.bool,
  getSQLValue: PropTypes.func,
  disableSqlHelp: PropTypes.bool,
  disableDialogHelp: PropTypes.bool,
  showFooter: PropTypes.bool,
  resetKey: PropTypes.any,
  customSaveBtnName: PropTypes.string,
  customSaveBtnIconType: PropTypes.string,
  formClassName: CustomPropTypes.className,
  Notifier: PropTypes.object,
  checkDirtyOnEnableSave: PropTypes.bool,
};
