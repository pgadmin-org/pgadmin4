/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useState, useContext, useCallback } from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { InputSelect, FormInput } from './FormComponents';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PgIconButton } from './Buttons';
import getApiInstance from '../api_instance';
import url_for from 'sources/url_for';
import gettext from 'sources/gettext';
import { SchemaStateContext } from '../SchemaView/SchemaState';
import { usePgAdmin } from '../PgAdminProvider';
import { clearOptionsCache } from '../../../preferences/static/js/components/PreferencesHelper';

const StyledBox = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'flex-start',
  '& .SelectRefresh-selectContainer': {
    flexGrow: 1,
  },
  '& .SelectRefresh-buttonContainer': {
    marginLeft: '4px',
    '& button': {
      height: '30px',
      width: '30px',
    },
  },
}));

function ChildContent({ cid, helpid, onRefreshClick, isRefreshing, ...props }) {
  return (
    <StyledBox>
      <Box className="SelectRefresh-selectContainer">
        <InputSelect {...props} cid={cid} helpid={helpid} />
      </Box>
      <Box className="SelectRefresh-buttonContainer">
        <PgIconButton
          onClick={onRefreshClick}
          icon={<RefreshIcon />}
          title={gettext('Refresh models')}
          disabled={isRefreshing}
        />
      </Box>
    </StyledBox>
  );
}

ChildContent.propTypes = {
  cid: PropTypes.string,
  helpid: PropTypes.string,
  onRefreshClick: PropTypes.func,
  isRefreshing: PropTypes.bool,
};

export function SelectRefresh({ required, className, label, helpMessage, testcid, controlProps, ...props }) {
  const [optionsState, setOptionsState] = useState({ options: [], reloadBasis: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const schemaState = useContext(SchemaStateContext);
  const pgAdmin = usePgAdmin();
  const {
    getOptionsOnRefresh,
    optionsRefreshUrl,
    optionsUrl,
    refreshDeps,
    ...selectControlProps
  } = controlProps;

  const onRefreshClick = useCallback(() => {
    // If we have an optionsRefreshUrl, make a POST request with dependent field values
    if (optionsRefreshUrl && refreshDeps && schemaState) {
      setIsRefreshing(true);

      // Build the request body from dependent field values
      const requestBody = {};
      for (const [paramName, fieldId] of Object.entries(refreshDeps)) {
        // Find the field value from schema state
        // fieldId is the preference ID, we need to look it up in state
        const fieldValue = schemaState.data?.[fieldId];
        // Only include non-empty values
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          requestBody[paramName] = fieldValue;
        }
      }

      const api = getApiInstance();
      const refreshUrl = url_for(optionsRefreshUrl);

      api.post(refreshUrl, requestBody)
        .then((res) => {
          if (res.data?.data?.error) {
            // Server returned an error message - clear options and show error
            setOptionsState((prev) => ({ options: [], reloadBasis: prev.reloadBasis + 1 }));
            pgAdmin.Browser.notifier.error(res.data.data.error);
          } else if (res.data?.data?.models) {
            const models = res.data.data.models;
            // Clear the cache so next time preferences opens, it uses the refreshed data
            if (optionsUrl) {
              clearOptionsCache(optionsUrl);
            }
            setOptionsState((prev) => ({ options: models, reloadBasis: prev.reloadBasis + 1 }));
          } else {
            // No models returned - clear the list
            setOptionsState((prev) => ({ options: [], reloadBasis: prev.reloadBasis + 1 }));
          }
        })
        .catch((err) => {
          // Network or other error - clear options and show error
          setOptionsState((prev) => ({ options: [], reloadBasis: prev.reloadBasis + 1 }));
          const errMsg = err.response?.data?.errormsg || err.message || gettext('Failed to refresh models');
          pgAdmin.Browser.notifier.error(errMsg);
        })
        .finally(() => {
          setIsRefreshing(false);
        });
    } else if (getOptionsOnRefresh) {
      // Fall back to the original getOptionsOnRefresh callback
      setIsRefreshing(true);
      getOptionsOnRefresh()
        .then((res) => {
          setOptionsState((prev) => ({ options: res, reloadBasis: prev.reloadBasis + 1 }));
        })
        .catch((err) => {
          setOptionsState((prev) => ({ options: [], reloadBasis: prev.reloadBasis + 1 }));
          const errMsg = err.message || gettext('Failed to refresh options');
          pgAdmin.Browser.notifier.error(errMsg);
        })
        .finally(() => {
          setIsRefreshing(false);
        });
    }
  }, [optionsRefreshUrl, optionsUrl, refreshDeps, schemaState, getOptionsOnRefresh, pgAdmin]);

  return (
    <FormInput required={required} label={label} className={className} helpMessage={helpMessage} testcid={testcid}>
      <ChildContent
        options={optionsState.options}
        optionsReloadBasis={optionsState.reloadBasis}
        onRefreshClick={onRefreshClick}
        controlProps={selectControlProps}
        isRefreshing={isRefreshing}
        {...props}
      />
    </FormInput>
  );
}

SelectRefresh.propTypes = {
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  controlProps: PropTypes.object,
};
