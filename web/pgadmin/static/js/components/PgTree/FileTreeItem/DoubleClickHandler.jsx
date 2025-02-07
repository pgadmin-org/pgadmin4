/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useSingleAndDoubleClick } from '../../../custom_hooks';
import * as React from 'react';
import PropTypes from 'prop-types';
import CustomPropTypes from '../../../../js/custom_prop_types';
import { getEnterKeyHandler } from '../../../../js/utils';
 
export default function DoubleClickHandler({onSingleClick, onDoubleClick, children}){
  const onClick = useSingleAndDoubleClick(onSingleClick, onDoubleClick) ;
  return(
    <div onClick={(e)=>onClick(e)} onKeyDown = { getEnterKeyHandler(onClick)}>
      {children}
    </div>
  );
}
DoubleClickHandler.propTypes = {
  onSingleClick: PropTypes.func,
  onDoubleClick: PropTypes.func,
  children: CustomPropTypes.children
};
