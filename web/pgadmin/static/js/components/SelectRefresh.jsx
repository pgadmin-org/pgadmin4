import React, { useState } from 'react';
import { Box} from '@material-ui/core';
import {InputSelect, FormInput} from './FormComponents';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import RefreshIcon from '@material-ui/icons/Refresh';
import { PgIconButton } from './Buttons';

export function SelectRefresh({ required, className, label, helpMessage, testcid, controlProps, ...props }){
  const [options, setOptions] = useState([]);
  const [optionsReloadBasis, setOptionsReloadBasis] = useState(false);
  const {getOptionsOnRefresh, ...selectControlProps} = controlProps;

  const onRefreshClick = ()=>{
    getOptionsOnRefresh && getOptionsOnRefresh()
      .then((res)=>{
        setOptions(res);
        setOptionsReloadBasis((prevVal)=>!prevVal);
      });
  };
  return (
    <FormInput required={required} label={label} className={className} helpMessage={helpMessage} testcid={testcid}>
      <Box display="flex" >
        <Box flexGrow="1">
          <InputSelect {...props} options={options} optionsReloadBasis={optionsReloadBasis} controlProps={selectControlProps}/>
        </Box>
        <Box>
          <PgIconButton onClick={onRefreshClick} icon={<RefreshIcon />} title={label||''}/>
        </Box>
      </Box>
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
