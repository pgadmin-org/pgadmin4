/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import { Grid, FormHelperText } from '@mui/material';
import React, { useMemo } from 'react';
import {InputSelect } from './FormComponents';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import HTMLReactParse from 'html-react-parser';


export default function SelectThemes({onChange, helpMessage, ...props}) {

  const previewSrc = useMemo(()=>(props.options?.find((o)=>o.value==props.value)?.preview_src), [props.value]);
  const cid =  _.uniqueId('c');
  const helpid = `h${cid}`;
  return (
    <Grid container direction="column" spacing={0.5}>
      <Grid item lg={12} md={12} sm={12} xs={12}>
        <InputSelect ref={props.inputRef} onChange={onChange} {...props} />
      </Grid>
      <Grid item lg={12} md={12} sm={12} xs={12} sx={{paddingTop: 10}}>
        { previewSrc && <>
          <FormHelperText id={helpid} variant="outlined">{HTMLReactParse(helpMessage || '')}</FormHelperText>
          <img className='img-fluid mx-auto d-block border' src={previewSrc} alt={gettext('Preview not available...')} />
        </> }
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
  inputRef: CustomPropTypes.ref,
  helpMessage: PropTypes.string
};
