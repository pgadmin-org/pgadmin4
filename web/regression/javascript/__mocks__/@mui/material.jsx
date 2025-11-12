import { useRef } from 'react';
import CustomPropTypes from '../../../../pgadmin/static/js/custom_prop_types';
export * from '@mui/material';

// mock popper
 
export const Popper = (
  {
    ref: _ref,
    ...props
  }
) => {
  const ele = useRef();
  return <div ref={ele} data-test="material-popper">{props.children}</div>;
};

Popper.displayName = 'Popper';
Popper.propTypes = {
  children: CustomPropTypes.children,
};
