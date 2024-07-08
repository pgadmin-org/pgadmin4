/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, {
  useCallback, useEffect, useRef, useState, useMemo
} from 'react';
import {
  Box, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import DoneIcon from '@mui/icons-material/Done';
import SettingsBackupRestoreIcon from
  '@mui/icons-material/SettingsBackupRestore';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/InfoRounded';
import HelpIcon from '@mui/icons-material/HelpRounded';
import EditIcon from '@mui/icons-material/Edit';
import { styled } from '@mui/material/styles';
import _ from 'lodash';
import PropTypes from 'prop-types';

import { parseApiError } from 'sources/api_instance';
import {
  PrimaryButton, DefaultButton, PgIconButton, PgButtonGroup
} from 'sources/components/Buttons';
import { usePgAdmin } from 'sources/BrowserComponent';
import CustomPropTypes from 'sources/custom_prop_types';
import { useIsMounted } from 'sources/custom_hooks';
import {
  FormFooterMessage, MESSAGE_TYPE
} from 'sources/components/FormComponents';
import gettext from 'sources/gettext';
import Loader from 'sources/components/Loader';
import ErrorBoundary from 'sources/helpers/ErrorBoundary';

import DataGridView from './DataGridView';
import {DepListenerContext} from './DepListener';
import FieldSetView from './FieldSetView';
import FormView from './FormView';
import { MappedFormControl } from './MappedControl';
import useSchemaState from './useSchemaState';
import {
  generateTimeBasedRandomNumberString, StateUtilsContext, getFieldMetaData
} from './utils';


const StyledBox = styled(Box)(({theme})=>({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  '& .Dialog-form': {
    flexGrow: 1,
    position: 'relative',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  '& .Dialog-footer': {
    padding: theme.spacing(1),
    background: theme.otherVars.headerBg,
    display: 'flex',
    zIndex: 1010,
    ...theme.mixins.panelBorder.top,
    '& .Dialog-buttonMargin': {
      marginRight: '0.5rem',
    },
  },
  '& .Properties-toolbar': {
    padding: theme.spacing(1),
    background: theme.palette.background.default,
    ...theme.mixins.panelBorder.bottom,
  },
  '& .Properties-form': {
    padding: theme.spacing(1),
    overflow: 'auto',
    flexGrow: 1,
    '& .Properties-controlRow': {
      marginBottom: theme.spacing(1),
    },
  },
  '& .Properties-noPadding': {
    padding: 0,
  },
}));


function getForQueryParams(data) {
  let retData = {...data};
  Object.keys(retData).forEach((key)=>{
    let value = retData[key];
    if(_.isObject(value) || _.isNull(value)) {
      retData[key] = JSON.stringify(value);
    }
  });
  return retData;
}

/* If its the dialog */
function SchemaDialogView({
  getInitData, viewHelperProps, loadingText, schema={}, showFooter=true,
  isTabView=true, checkDirtyOnEnableSave=false, ...props
}) {
  // View helper properties
  const { mode, keepCid } = viewHelperProps;
  const onDataChange  = props.onDataChange;

  // Message to the user on long running operations.
  const [loaderText, setLoaderText] = useState('');

  // Key for resetting the data in the view.
  const [resetKey, setResetKey] = useState(
    props.resetKey || generateTimeBasedRandomNumberString()
  );

  // Schema data state manager
  const schemaState = useSchemaState({
    schema: schema, getInitData: getInitData, immutableData: {},
    mode: mode, keepCid: keepCid, resetKey: resetKey,
    setLoadingMessage: setLoaderText,
    onDataChange: onDataChange,
  });

  // Is saving operation in progress?
  const [saving, setSaving] = useState(false);

  // First element to be set by the FormView to set the focus after loading
  // the data.
  const firstEleRef = useRef();
  const checkIsMounted = useIsMounted();

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

  const onResetClick = () => {
    const resetIt = () => {
      firstEleRef.current?.focus();
      setResetKey(generateTimeBasedRandomNumberString());
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
        console.error(err);
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
    // Do nothing when there is no change.
    if (!schemaState.isDirty) return;

    setSaving(true);
    setLoaderText('Saving...');

    if (!schema.warningText) {
      save(schemaState.changes.current);
      return;
    }

    Notifier.confirm(
      gettext('Warning'),
      schema.warningText,
      ()=> { save(schemaState.changes.current); },
      () => {
        setSaving(false);
        setLoaderText('');
        return true;
      },
    );
  };

  const onErrClose = useCallback(() => {
    // Unset the error message, but not the name.
    schemaState.setError((prev) => ({ ...prev, message: '' }));
  });

  const getSQLValue = () => {
    // Called when SQL tab is active.
    if(!schemaState.isDirty) {
      return Promise.resolve('-- ' + gettext('No updates.'));
    }

    if(schemaState.errors.name) {
      return Promise.resolve('-- ' + gettext('Definition incomplete.'));
    }

    const changeData = schemaState.changes.current;
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

  let ButtonIcon = getButtonIcon();

  /* I am Groot */
  return (
    <StyledBox>
      <StateUtilsContext.Provider value={schemaState}>
        <DepListenerContext.Provider value={schemaState.depListener.current}>
          <Box className='Dialog-form'>
            <Loader message={loaderText || loadingText}/>
            <FormView value={schemaState.sessData}
              viewHelperProps={viewHelperProps}
              schema={schema} accessPath={[]}
              dataDispatch={schemaState.dataDispatch}
              hasSQLTab={props.hasSQL} getSQLValue={getSQLValue}
              firstEleRef={firstEleRef} isTabView={isTabView}
              className={props.formClassName} />
            <FormFooterMessage
              type={MESSAGE_TYPE.ERROR} message={schemaState.errors?.message}
              onClose={onErrClose} />
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
                <DefaultButton data-test='Reset' onClick={onResetClick}
                  startIcon={<SettingsBackupRestoreIcon />}
                  disabled={!schemaState.isDirty || saving }
                  className='Dialog-buttonMargin'>
                  { gettext('Reset') }
                </DefaultButton>
                <PrimaryButton data-test='Save' onClick={onSaveClick}
                  startIcon={ButtonIcon}
                  disabled={
                    !(mode === 'edit' ||
                      checkDirtyOnEnableSave ? schemaState.isDirty : true
                    ) || saving || Boolean(
                      schemaState.errors.name &&
                      schemaState.errors.name !== 'apierror'
                    ) || !schemaState.isReady
                  }>{
                    props.customSaveBtnName || gettext('Save')
                  }
                </PrimaryButton>
              </Box>
            </Box>
          }
        </DepListenerContext.Provider>
      </StateUtilsContext.Provider>
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


/* If its the properties tab */
function SchemaPropertiesView({
  getInitData, viewHelperProps, schema={}, updatedData, ...props
}) {

  let defaultTab = 'General';
  let tabs = {};
  let tabsClassname = {};
  let groupLabels = {};
  const [loaderText, setLoaderText] = useState('');

  const pgAdmin = usePgAdmin();
  const Notifier = pgAdmin.Browser.notifier;
  const { mode, keepCid } = viewHelperProps;

  // Key for resetting the data in the view.
  const resetKey = useMemo(
    () =>  (props.resetKey || generateTimeBasedRandomNumberString()),
    [props.resetKey]
  );

  // Schema data state manager
  const schemaState = useSchemaState({
    schema: schema, getInitData: getInitData, immutableData: updatedData,
    mode: mode, keepCid: keepCid, resetKey: resetKey,
    setLoadingMessage: setLoaderText,
  });

  useEffect(() => {
    if (schemaState.errors?.response)
      Notifier.pgRespErrorNotify(schemaState.errors.response);
  }, [schemaState.errors]);

  /* A simple loop to get all the controls for the fields */
  schema.fields.forEach((field) => {
    let {group} = field;
    const {
      visible, disabled, readonly, modeSupported
    } = getFieldMetaData(field, schema, schemaState.sessData, viewHelperProps);
    group = group || defaultTab;

    if(field.isFullTab) {
      tabsClassname[group] = 'Properties-noPadding';
    }

    if(!modeSupported) return;

    group = groupLabels[group] || group || defaultTab;
    if (field.helpMessageMode?.indexOf(viewHelperProps.mode) == -1)
      field.helpMessage = '';

    if(!tabs[group]) tabs[group] = [];

    if(field && field.type === 'nested-fieldset') {
      tabs[group].push(
        <FieldSetView
          key={`nested${tabs[group].length}`}
          value={schemaState.sessData}
          viewHelperProps={viewHelperProps}
          schema={field.schema}
          accessPath={[]}
          controlClassName='Properties-controlRow'
          {...field}
          visible={visible}
        />
      );
    } else if(field.type === 'collection') {
      tabs[group].push(
        <DataGridView
          key={field.id}
          viewHelperProps={viewHelperProps}
          name={field.id}
          value={schemaState.sessData[field.id] || []}
          schema={field.schema}
          accessPath={[field.id]}
          containerClassName='Properties-controlRow'
          canAdd={false}
          canEdit={false}
          canDelete={false}
          visible={visible}
        />
      );
    } else if(field.type === 'group') {
      groupLabels[field.id] = field.label;

      if(!visible) {
        schema.filterGroups.push(field.label);
      }
    } else {
      tabs[group].push(
        <MappedFormControl
          key={field.id}
          viewHelperProps={viewHelperProps}
          state={schemaState.sessData}
          name={field.id}
          value={schemaState.sessData[field.id]}
          {...field}
          readonly={readonly}
          disabled={disabled}
          visible={visible}
          className={field.isFullTab ? null :'Properties-controlRow'}
          noLabel={field.isFullTab}
          memoDeps={[
            schemaState.sessData[field.id],
            'Properties-controlRow',
            field.isFullTab
          ]}
        />
      );
    }
  });

  let finalTabs = _.pickBy(
    tabs, (v, tabName) => schema.filterGroups.indexOf(tabName) <= -1
  );

  return (
    <StyledBox>
      <Loader message={loaderText}/>
      <Box className='Properties-toolbar'>
        <PgButtonGroup size="small">
          <PgIconButton
            data-test="help" onClick={() => props.onHelp(true, false)}
            icon={<InfoIcon />} disabled={props.disableSqlHelp}
            title="SQL help for this object type." />
          <PgIconButton data-test="edit"
            onClick={props.onEdit} icon={<EditIcon />}
            title={gettext('Edit object...')} />
        </PgButtonGroup>
      </Box>
      <Box className={'Properties-form'}>
        <Box>
          {Object.keys(finalTabs).map((tabName)=>{
            let id = tabName.replace(' ', '');
            return (
              <Accordion key={id}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`${id}-content`}
                  id={`${id}-header`}
                >
                  {tabName}
                </AccordionSummary>
                <AccordionDetails className={tabsClassname[tabName]}>
                  <Box style={{width: '100%'}}>
                    {finalTabs[tabName]}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </Box>
    </StyledBox>
  );
}

SchemaPropertiesView.propTypes = {
  getInitData: PropTypes.func.isRequired,
  updatedData: PropTypes.object,
  viewHelperProps: PropTypes.shape({
    mode: PropTypes.string.isRequired,
    serverInfo: PropTypes.shape({
      type: PropTypes.string,
      version: PropTypes.number,
    }),
    inCatalog: PropTypes.bool,
    keepCid: PropTypes.bool,
  }).isRequired,
  schema: CustomPropTypes.schemaUI,
  onHelp: PropTypes.func,
  disableSqlHelp: PropTypes.bool,
  onEdit: PropTypes.func,
  resetKey: PropTypes.any,
  itemNodeData: PropTypes.object
};

export default function SchemaView({formType, ...props}) {
  /* Switch the view based on formType */
  if(formType === 'tab') {
    return (
      <ErrorBoundary>
        <SchemaPropertiesView {...props}/>
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <SchemaDialogView {...props}/>
    </ErrorBoundary>
  );
}

SchemaView.propTypes = {
  formType: PropTypes.oneOf(['tab', 'dialog']),
};
