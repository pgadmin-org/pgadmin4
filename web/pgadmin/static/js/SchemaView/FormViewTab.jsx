/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Tab } from '@mui/material';
import React, { useContext, useState } from 'react';
import { useFieldOptions, useSchemaStateSubscriber } from './hooks';
import { SchemaStateContext } from './SchemaState';
import PropTypes from 'prop-types';

export default function FormViewTab({tabGroup, idx, tabValue, ...props}) {
  const accessPath = [tabGroup.id];
  const [refreshKey, setRefreshKey] = useState(0);
  const subscriberManager = useSchemaStateSubscriber(setRefreshKey);
  const schemaState = useContext(SchemaStateContext);
  const options = useFieldOptions(accessPath, schemaState, subscriberManager);

  return (
    <Tab
      key={refreshKey}
      label={tabGroup.label}
      data-test={tabGroup.id}
      iconPosition='start'
      disabled={options.disabled}
      className={
        tabGroup.hasError &&
        tabValue != idx ? 'tab-with-error' : ''
      }
      {...props}
    />
  );
};

FormViewTab.muiName = Tab.muiName;

FormViewTab.propTypes = {
  tabGroup: PropTypes.object,
  idx: PropTypes.number,
  tabValue: PropTypes.number,
};
