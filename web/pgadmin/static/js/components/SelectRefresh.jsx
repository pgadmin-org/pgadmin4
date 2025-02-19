/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useState } from 'react';
import { Box} from '@mui/material';
import {InputSelect, FormInput} from './FormComponents';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PgIconButton } from './Buttons';

function ChildContent({cid, helpid, onRefreshClick, label, ...props}) {
  return <Box display="flex" >
    <Box flexGrow="1">
      <InputSelect {...props} cid={cid} helpid={helpid} />
    </Box>
    <Box>
      <PgIconButton onClick={onRefreshClick} icon={<RefreshIcon />} title={label||''}/>
    </Box>
  </Box>;
}

ChildContent.propTypes = {
  cid: PropTypes.string,
  helpid: PropTypes.string,
  onRefreshClick: PropTypes.func,
  label: PropTypes.string,
};
export function SelectRefresh({ required, className, label, helpMessage, testcid, controlProps, ...props }){
  const [options, setOptions] = useState([]);
  const [optionsReloadBasis, setOptionsReloadBasis] = useState(false);
  const {getOptionsOnRefresh, ...selectControlProps} = controlProps;

  const onRefreshClick = ()=>{
    getOptionsOnRefresh?.()
      .then((res)=>{
        setOptions(res);
        setOptionsReloadBasis((prevVal)=>!prevVal);
      });
  };

  return (
    <FormInput required={required} label={label} className={className} helpMessage={helpMessage} testcid={testcid}>
      <ChildContent options={options} optionsReloadBasis={optionsReloadBasis}
        onRefreshClick={onRefreshClick} controlProps={selectControlProps} label={label} {...props} />
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
