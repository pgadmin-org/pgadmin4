/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import { makeStyles, Grid } from '@material-ui/core';
import React, { useMemo } from 'react';
import {InputSelect } from './FormComponents';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

const useStyles = makeStyles(() => ({
  preview: {
    paddingTop: 10
  }
}));

export default function SelectThemes({onChange, ...props}) {
  const classes = useStyles();
  const previewSrc = useMemo(()=>(props.options?.find((o)=>o.value==props.value)?.preview_src), [props.value]);

  return (
    <Grid container direction="column">
      <Grid item lg={12} md={12} sm={12} xs={12}>
        <InputSelect ref={props.inputRef} onChange={onChange} {...props} />
      </Grid>
      <Grid item lg={12} md={12} sm={12} xs={12} className={classes.preview}>
        <img className='img-fluid mx-auto d-block border' src={previewSrc} alt={gettext('Preview not available...')} />
      </Grid>
    </Grid>
  );
}

SelectThemes.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  controlProps: PropTypes.object,
  fields: PropTypes.array,
  options: PropTypes.array,
  inputRef: CustomPropTypes.ref
};
