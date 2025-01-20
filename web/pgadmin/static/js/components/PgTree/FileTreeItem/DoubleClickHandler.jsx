import { useSingleAndDoubleClick } from '../../../custom_hooks';
import * as React from 'react';
import PropTypes from 'prop-types';
import CustomPropTypes from '../../../../js/custom_prop_types';

export default function DoubleClickHandler({onSingleClick, onDoubleClick, children}){
  const onClick = useSingleAndDoubleClick(onSingleClick, onDoubleClick) ;
  return(
    <div onClick={(e)=>onClick(e)}>
      {children}
    </div>
  );
}
DoubleClickHandler.propTypes = {
  onSingleClick: PropTypes.func,
  onDoubleClick: PropTypes.func,
  children: CustomPropTypes.children
};