/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext } from 'react';
import { Grid } from '@mui/material';
import _ from 'lodash';
import PropTypes from 'prop-types';

import { SchemaStateContext } from './SchemaState';
import { useFieldOptions } from './hooks';
import { registerView } from './registry';
import { listenDepChanges } from './utils';


// The first component of schema view form.
export default function InlineView({
  accessPath, field, children, viewHelperProps
}) {
  const { mode } = (viewHelperProps || {});
  const isPropertyMode = mode === 'properties';
  const schemaState = useContext(SchemaStateContext);
  const { visible } =
    accessPath ? useFieldOptions(accessPath, schemaState) : { visible: true };

  // We won't rerender the InlineView on changes of the dependencies.
  if (!accessPath || isPropertyMode)
    listenDepChanges(accessPath, field, schemaState);

  // Check whether form is kept hidden by visible prop.
  // We don't support inline-view in 'property' mode
  if((!_.isUndefined(visible) && !visible) || isPropertyMode)  {
    return <></>;
  }
  return (
    <Grid container spacing={0} className='FormView-controlRow' rowGap="8px">
      {children}
    </Grid>
  );
}


InlineView.propTypes = {
  accessPath: PropTypes.array,
  field: PropTypes.object,
  children : PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]),
  viewHelperProps: PropTypes.object,
};

registerView(InlineView, 'InlineView');
