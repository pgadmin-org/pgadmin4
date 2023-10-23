import React, { useRef } from 'react';
import CustomPropTypes from '../../../../pgadmin/static/js/custom_prop_types';
export * from '@material-ui/core';

// mock popper
export const Popper = React.forwardRef((props, ref)=>{
  const ele = useRef();
  // eslint-disable-next-line no-unused-vars
  ref = {};
  return <div ref={ele} data-test="material-popper">{props.children}</div>;
});

Popper.displayName = 'Popper';
Popper.propTypes = {
  children: CustomPropTypes.children,
};
