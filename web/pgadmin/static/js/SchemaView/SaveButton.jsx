/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect, useState } from 'react';

import { PrimaryButton } from 'sources/components/Buttons';
import { SchemaStateContext } from './SchemaState';
import PropTypes from 'prop-types';


export function SaveButton({
  label, icon, checkDirtyOnEnableSave, onClick, mode,
}) {
  const [key, setKey] = useState(0);
  const schemaState = useContext(SchemaStateContext);
  const checkDisabled = (state) => {
    const {isDirty, isSaving, errors} = state;
    return (
      isSaving ||
       !(mode === 'edit' || checkDirtyOnEnableSave ? isDirty : true) ||
      Boolean(errors.name)
    );
  };
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
    <PrimaryButton
      data-test='Save' onClick={onClick} startIcon={icon}
      disabled={isDisabled}
    >
      {label}
    </PrimaryButton>
  );
}

SaveButton.propTypes = {
  label: PropTypes.string,
  icon: PropTypes.any,
  onClick: PropTypes.func,
  checkDirtyOnEnableSave: PropTypes.bool,
  mode: PropTypes.string,
};
