/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect, useState } from 'react';

import { DefaultButton } from 'sources/components/Buttons';
import { SchemaStateContext } from './SchemaState';
import PropTypes from 'prop-types';


export function ResetButton({label, icon, onClick}) {
  const [key, setKey] = useState(0);
  const schemaState = useContext(SchemaStateContext);
  const checkDisabled = (state) => (state.isSaving || !state.isDirty);
  const currState = schemaState.state();
  const isDisabled = checkDisabled(currState);

  useEffect(() => {
    if (!schemaState) return;

    const refreshOnDisableStateChanged = (newState) => {
      if (isDisabled !== checkDisabled(newState)) setKey(Date.now());
    };

    return schemaState.subscribe([], refreshOnDisableStateChanged, 'states');
  }, [key]);

  return (
    <DefaultButton
      data-test='Reset' onClick={onClick}
      startIcon={icon}
      disabled={isDisabled}
      className='Dialog-buttonMargin'>
      { label }
    </DefaultButton>
  );
}

ResetButton.propTypes = {
  label: PropTypes.string,
  icon: PropTypes.any,
  onClick: PropTypes.func,
};
