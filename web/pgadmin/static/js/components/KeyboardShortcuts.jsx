/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Box, ToggleButtonGroup } from '@mui/material';
import React, { useMemo } from 'react';
import { InputText, ToggleCheckButton } from './FormComponents';
import PropTypes from 'prop-types';
import { isMac } from '../keyboard_shortcuts';
import gettext from 'sources/gettext';

export default function KeyboardShortcuts({ value, onChange, fields, name }) {
  const keyCid = `key-${name}`;
  const keyhelpid = `h${keyCid}`;
  const hasKeys = useMemo(()=>{
    return fields?.some((f)=>['shift', 'control', 'alt'].includes(f.name));
  }, [fields]);

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

  const onChangeButton = (k, v)=>{
    onChange({
      ...value,
      [k]: v,
    });
  };

  const onChangeCtrl = (_e, val)=>{
    if(val == null) {
      onChange({
        ...value,
        ctrl_is_meta: false,
        control: false,
      });
    } else if(val == 'ctrl_is_meta') {
      onChange({
        ...value,
        [val]: true,
        control: true,
      });
    } else if(val == 'control') {
      onChange({
        ...value,
        [val]: true,
        ctrl_is_meta: false,
      });
    } else {
      onChange({
        ...value,
        [val]: true,
      });
    }
  };

  let ctrlValue = value?.control ? 'control' : '';
  if(ctrlValue && value?.ctrl_is_meta && isMac()) {
    ctrlValue = 'ctrl_is_meta';
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      flexWrap="wrap"
      gap="5px"
      rowGap="5px"
    >
      {hasKeys &&
      <>
        <ToggleButtonGroup value={value?.shift ? ['shift'] : []} onChange={(e, val)=>{
          onChangeButton('shift', val.length != 0 );
        }}>
          <ToggleCheckButton value="shift" label={gettext('Shift')} selected={value?.shift} />
        </ToggleButtonGroup>
        <ToggleButtonGroup exclusive value={ctrlValue} onChange={onChangeCtrl}>
          <ToggleCheckButton value="control" label={gettext('Ctrl')} selected={ctrlValue == 'control'}  />
          {isMac() && <ToggleCheckButton value="ctrl_is_meta" label={gettext('Cmd')} selected={ctrlValue == 'ctrl_is_meta'} />}
        </ToggleButtonGroup>
        <ToggleButtonGroup value={value?.alt ? ['alt'] : []} onChange={(e, val)=>{
          onChangeButton('alt', val.length != 0);
        }}>
          <ToggleCheckButton value="alt" label={isMac() ? gettext('Option') : gettext('Alt')} selected={value?.alt} />
        </ToggleButtonGroup>
      </>}
      <InputText style={{maxWidth: '100px'}} id={keyCid} helpid={keyhelpid} value={value?.key?.char} controlProps={
        {
          onKeyDown: onKeyDown,
        }
      }/>
    </Box>
  );
}

KeyboardShortcuts.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func,
  fields: PropTypes.array,
  name: PropTypes.string,
};
