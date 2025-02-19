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
import { FormGroup, Grid, Typography } from '@mui/material';
import React from 'react';
import { InputText } from './FormComponents';
import PropTypes from 'prop-types';


export default function QueryThresholds({ value, onChange }) {
  const warningCid = _.uniqueId('c');
  const warninghelpid = `h${warningCid}`;
  const alertCid = _.uniqueId('c');
  const alerthelpid = `h${alertCid}`;

  const onWarningChange = (val) => {
    let new_val = { ...value };
    new_val['warning'] = val;
    onChange(new_val);
  };

  const onAlertChange = (val) => {
    let new_val = { ...value };
    new_val['alert'] = val;
    onChange(new_val);
  };

  return (
    <FormGroup>
      <Grid
        container
        direction="row"
        alignItems="center"
      >
        <Grid item lg={2} md={2} sm={2} xs={12}>
          <Typography>{gettext('Warning')}</Typography>
        </Grid>
        <Grid item lg={2} md={2} sm={2} xs={12}>
          <InputText cid={warningCid} helpid={warninghelpid} type='numeric' value={value?.warning} onChange={onWarningChange} />
        </Grid>
        <Grid item lg={2} md={2} sm={2} xs={12} sx={{ textAlign: 'center' }}>
          <Typography>{gettext('Alert')}</Typography>
        </Grid>
        <Grid item lg={2} md={2} sm={2} xs={12}>
          <InputText cid={alertCid} helpid={alerthelpid} type='numeric' value={value?.alert} onChange={onAlertChange} />
        </Grid>
        <Grid item lg={4} md={4} sm={4} xs={12} sx={{paddingLeft: 10 }}>
          <Typography>{gettext('(in minutes)')}</Typography>
        </Grid>
      </Grid>
    </FormGroup >
  );
}

QueryThresholds.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func,
};
