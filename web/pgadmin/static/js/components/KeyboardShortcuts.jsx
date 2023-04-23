/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import { makeStyles, Grid, Typography, Box } from '@material-ui/core';
import React from 'react';
import { InputCheckbox, InputText } from './FormComponents';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme) => ({
  inputLabel: {
    textAlign: 'center',
    padding: 2,
    paddingLeft: 10
  },
  inputCheckboxClass: {
    border: '1px solid',
    borderRadius: theme.shape.borderRadius,
    borderColor: theme.otherVars.inputBorderColor,
    padding: 3
  }
}));

export default function KeyboardShortcuts({ value, onChange, fields }) {
  const classes = useStyles();
  const keyCid = _.uniqueId('c');
  const keyhelpid = `h${keyCid}`;
  const shiftCid = _.uniqueId('c');
  const shifthelpid = `h${shiftCid}`;
  const ctrlCid = _.uniqueId('c');
  const ctrlhelpid = `h${ctrlCid}`;
  const altCid = _.uniqueId('c');
  const althelpid = `h${altCid}`;
  const keyLabel = _.uniqueId('c');

  const onKeyDown = (e) => {
    let newVal = { ...value };
    let _val = e.key;
    if (e.keyCode == 32) {
      _val = 'Space';
    }
    newVal.key = {
      char: _val,
      key_code: e.keyCode
    };
    onChange(newVal);
  };

  const onShiftChange = (e) => {
    let newVal = { ...value };
    newVal.shift = e.target.checked;
    onChange(newVal);
  };

  const onCtrlChange = (e) => {
    let newVal = { ...value };
    newVal.control = e.target.checked;
    onChange(newVal);
  };

  const onAltChange = (e) => {
    let newVal = { ...value };
    newVal.alt = e.target.checked;
    onChange(newVal);
  };

  return (
    <Grid
      container
      direction="row"
      alignItems="center"
      key={_.uniqueId('c')}
    >
      {fields.map(element => {
        let ctrlProps = {
          label: element.label
        };
        if (element.type == 'keyCode') {
          return <Grid item container lg={4} md={4} sm={4} xs={12} key={_.uniqueId('c')}>
            <Grid item lg={4} md={4} sm={4} xs={12} className={classes.inputLabel}>
              <Typography id={keyLabel}>{element.label}</Typography>
            </Grid>
            <Grid item lg={8} md={8} sm={8} xs={12}>
              <InputText id={keyCid} helpid={keyhelpid} type='text' value={value?.key?.char} controlProps={
                {
                  onKeyDown: onKeyDown,
                }
              }></InputText>
            </Grid>
          </Grid>;
        } else if (element.name == 'shift') {
          return <Grid item lg={2} md={2} sm={2} xs={12} className={classes.inputLabel} key={_.uniqueId('c')}>
            <Box className={classes.inputCheckboxClass}>
              <InputCheckbox id={shiftCid} helpid={shifthelpid} value={value?.shift}
                controlProps={ctrlProps}
                onChange={onShiftChange}></InputCheckbox>
            </Box>
          </Grid>;
        } else if (element.name == 'control') {
          return <Grid item lg={2} md={2} sm={2} xs={12} className={classes.inputLabel} key={_.uniqueId('c')}>
            <Box className={classes.inputCheckboxClass}>
              <InputCheckbox id={ctrlCid} helpid={ctrlhelpid} value={value?.control}
                controlProps={ctrlProps}
                onChange={onCtrlChange}></InputCheckbox>
            </Box>
          </Grid>;
        } else if (element.name == 'alt') {
          return <Grid item lg={3} md={3} sm={3} xs={12} className={classes.inputLabel} key={_.uniqueId('c')}>
            <Box className={classes.inputCheckboxClass}>
              <InputCheckbox id={altCid} helpid={althelpid} value={value?.alt}
                controlProps={ctrlProps}
                onChange={onAltChange}></InputCheckbox>
            </Box>
          </Grid>;
        }

      })}
    </Grid>
  );
}

KeyboardShortcuts.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func,
  controlProps: PropTypes.object,
  fields: PropTypes.array
};
