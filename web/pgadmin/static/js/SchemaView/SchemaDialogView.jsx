/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';

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
import Loader from 'sources/components/Loader';
import { useIsMounted } from 'sources/custom_hooks';
import {
  PrimaryButton, DefaultButton, PgIconButton
} from 'sources/components/Buttons';
import {
  FormFooterMessage, MESSAGE_TYPE
} from 'sources/components/FormComponents';
import CustomPropTypes from 'sources/custom_prop_types';
import gettext from 'sources/gettext';

import FormView from './FormView';
import { StyledBox } from './StyledComponents';
import { useSchemaState } from './useSchemaState';
import {
  getForQueryParams, SchemaStateContext
} from './common';


/* If its the dialog */
export default function SchemaDialogView({
  getInitData, viewHelperProps, loadingText, schema={}, showFooter=true,
  isTabView=true, checkDirtyOnEnableSave=false, ...props
}) {
  // View helper properties
  const { mode, keepCid } = viewHelperProps;
  const onDataChange  = props.onDataChange;

  // Message to the user on long running operations.
  const [loaderText, setLoaderText] = useState('');

  // Schema data state manager
  const {schemaState, dataDispatch, sessData, reset} = useSchemaState({
    schema: schema, getInitData: getInitData, immutableData: {},
    mode: mode, keepCid: keepCid, onDataChange: onDataChange,
  });

  const [{isNew, isDirty, isReady, errors}, updateSchemaState] = useState({
    isNew: true, isDirty: false, isReady: false, errors: {}
  });

  // Is saving operation in progress?
  const [saving, setSaving] = useState(false);

  // First element to be set by the FormView to set the focus after loading
  // the data.
  const firstEleRef = useRef();
  const checkIsMounted = useIsMounted();
  const [data, setData] = useState({});

  // Notifier object.
  const pgAdmin = usePgAdmin();
  const Notifier = props.Notifier || pgAdmin.Browser.notifier;

  useEffect(() => {
    /*
     * Docker on load focusses itself, so our focus should execute later.
     */
    let focusTimeout = setTimeout(()=>{
      firstEleRef.current?.focus();
    }, 250);

    // Clear the focus timeout if unmounted.
    return () => {
      clearTimeout(focusTimeout);
    };
  }, []);

  useEffect(() => {
    setLoaderText(schemaState.message);
  }, [schemaState.message]);

  useEffect(() => {
    setData(sessData);
    updateSchemaState(schemaState);
  }, [sessData.__changeId]);

  useEffect(()=>{
    if (!props.resetKey) return;
    reset();
  }, [props.resetKey]);


  const onResetClick = () => {
    const resetIt = () => {
      firstEleRef.current?.focus();
      reset();
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
    props.onSave(isNew, changeData)
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
    if (!schemaState.changes || errors.name) return;

    setSaving(true);
    setLoaderText('Saving...');

    if (!schema.warningText) {
      save(schemaState.Changes(true));
      return;
    }

    Notifier.confirm(
      gettext('Warning'),
      schema.warningText,
      ()=> { save(schemaState.Changes(true)); },
      () => {
        setSaving(false);
        setLoaderText('');
        return true;
      },
    );
  };

  const onErrClose = useCallback(() => {
    const err = { ...errors, message: '' };
    // Unset the error message, but not the name.
    schemaState.setError(err);
    updateSchemaState({isNew, isDirty, isReady, errors: err});
  });

  const getSQLValue = () => {
    // Called when SQL tab is active.
    if(!isDirty) {
      return Promise.resolve('-- ' + gettext('No updates.'));
    }

    if(errors.name) {
      return Promise.resolve('-- ' + gettext('Definition incomplete.'));
    }

    const changeData = schemaState.changes;
    /*
     * Call the passed incoming getSQLValue func to get the SQL
     * return of getSQLValue should be a promise.
     */
    return props.getSQLValue(isNew, getForQueryParams(changeData));
  };

  const getButtonIcon = () => {
    if(props.customSaveBtnIconType == 'upload') {
      return <PublishIcon />;
    } else if(props.customSaveBtnIconType == 'done') {
      return <DoneIcon />;
    }
    return <SaveIcon />;
  };

  const disableSaveBtn = saving ||
    !isReady ||
    !(mode === 'edit' || checkDirtyOnEnableSave ? isDirty : true) ||
    Boolean(errors.name && errors.name !== 'apierror');

  let ButtonIcon = getButtonIcon();

  /* I am Groot */
  return (
    <StyledBox>
      <SchemaStateContext.Provider value={schemaState}>
        <Box className='Dialog-form'>
          <Loader message={loaderText || loadingText}/>
          <FormView value={data}
            viewHelperProps={viewHelperProps}
            schema={schema} accessPath={[]}
            dataDispatch={dataDispatch}
            hasSQLTab={props.hasSQL} getSQLValue={getSQLValue}
            firstEleRef={firstEleRef} isTabView={isTabView}
            className={props.formClassName} />
          <FormFooterMessage
            type={MESSAGE_TYPE.ERROR} message={errors?.message}
            onClose={onErrClose} />
        </Box>
        {showFooter &&
          <Box className='Dialog-footer'>
            {
              (!props.disableSqlHelp || !props.disableDialogHelp) &&
                <Box>
                  <PgIconButton data-test='sql-help'
                    onClick={()=>props.onHelp(true, isNew)}
                    icon={<InfoIcon />} disabled={props.disableSqlHelp}
                    className='Dialog-buttonMargin'
                    title={ gettext('SQL help for this object type.') }
                  />
                  <PgIconButton data-test='dialog-help'
                    onClick={()=>props.onHelp(false, isNew)}
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
              <DefaultButton data-test='Reset' onClick={onResetClick}
                startIcon={<SettingsBackupRestoreIcon />}
                disabled={(!isDirty) || saving }
                className='Dialog-buttonMargin'>
                { gettext('Reset') }
              </DefaultButton>
              <PrimaryButton data-test='Save' onClick={onSaveClick}
                startIcon={ButtonIcon}
                disabled={disableSaveBtn}>{
                  props.customSaveBtnName || gettext('Save')
                }
              </PrimaryButton>
            </Box>
          </Box>
        }
      </SchemaStateContext.Provider>
    </StyledBox>
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
