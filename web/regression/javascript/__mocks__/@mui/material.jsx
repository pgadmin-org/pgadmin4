import React, { useRef } from 'react';
import CustomPropTypes from '../../../../pgadmin/static/js/custom_prop_types';
export * from '@mui/material';

// mock popper
// eslint-disable-next-line no-unused-vars
export const Popper = React.forwardRef((props, _ref)=>{
  const ele = useRef();
  return <div ref={ele} data-test="material-popper">{props.children}</div>;
});

Popper.displayName = 'Popper';
Popper.propTypes = {
  children: CustomPropTypes.children,
};
