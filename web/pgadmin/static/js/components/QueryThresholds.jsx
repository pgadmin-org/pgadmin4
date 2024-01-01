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
import { FormGroup, makeStyles, Grid, Typography } from '@material-ui/core';
import React from 'react';
import { InputText } from './FormComponents';
import PropTypes from 'prop-types';

const useStyles = makeStyles(() => ({
  formControlLabel: {
    padding: '3px',
  },
  formInput: {
    marginLeft: '5px'
  },
  formCheckboxControl: {
    padding: '3px',
    border: '1px solid',
    borderRadius: '0.25rem',
  },
  formGroup: {
    padding: '5px'
  },
  contentTextAlign: {
    textAlign: 'center'
  },
  contentStyle: {
    paddingLeft: 10,
  }
}));

export default function QueryThresholds({ value, onChange }) {
  const classes = useStyles();
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
        <Grid item lg={2} md={2} sm={2} xs={12} className={classes.contentTextAlign}>
          <Typography>{gettext('Alert')}</Typography>
        </Grid>
        <Grid item lg={2} md={2} sm={2} xs={12}>
          <InputText cid={alertCid} helpid={alerthelpid} type='numeric' value={value?.alert} onChange={onAlertChange} />
        </Grid>
        <Grid item lg={4} md={4} sm={4} xs={12} className={classes.contentStyle}>
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
