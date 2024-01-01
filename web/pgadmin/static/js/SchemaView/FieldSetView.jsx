/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect } from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';

import { MappedFormControl } from './MappedControl';
import { SCHEMA_STATE_ACTIONS, StateUtilsContext } from '.';
import { evalFunc } from 'sources/utils';
import CustomPropTypes from '../custom_prop_types';
import { DepListenerContext } from './DepListener';
import { getFieldMetaData } from './FormView';
import FieldSet from '../components/FieldSet';
import { Box } from '@material-ui/core';

export default function FieldSetView({
  value, schema={}, viewHelperProps, accessPath, dataDispatch, controlClassName, isDataGridForm=false, label, visible}) {
  const depListener = useContext(DepListenerContext);
  const stateUtils = useContext(StateUtilsContext);

  useEffect(()=>{
    /* Calculate the fields which depends on the current field */
    if(!isDataGridForm && depListener) {
      schema.fields.forEach((field)=>{
        /* Self change is also dep change */
        if(field.depChange || field.deferredDepChange) {
          depListener.addDepListener(accessPath.concat(field.id), accessPath.concat(field.id), field.depChange, field.deferredDepChange);
        }
        (evalFunc(null, field.deps) || []).forEach((dep)=>{
          let source = accessPath.concat(dep);
          if(_.isArray(dep)) {
            source = dep;
          }
          if(field.depChange) {
            depListener.addDepListener(source, accessPath.concat(field.id), field.depChange);
          }
        });
      });
    }
  }, []);

  let viewFields = [];
  let inlineComponents = [];

  /* Prepare the array of components based on the types */
  for(const field of schema.fields) {
    let {visible, disabled, readonly, modeSupported} =
      getFieldMetaData(field, schema, value, viewHelperProps);

    if(modeSupported) {
      /* Its a form control */
      const hasError = field.id == stateUtils?.formErr.name;
      /* When there is a change, the dependent values can change
        * lets pass the new changes to dependent and get the new values
        * from there as well.
        */
      const currentControl = <MappedFormControl
        state={value}
        key={field.id}
        viewHelperProps={viewHelperProps}
        name={field.id}
        value={value[field.id]}
        {...field}
        readonly={readonly}
        disabled={disabled}
        visible={visible}
        onChange={(changeValue)=>{
          /* Get the changes on dependent fields as well */
          dataDispatch({
            type: SCHEMA_STATE_ACTIONS.SET_VALUE,
            path: accessPath.concat(field.id),
            value: changeValue,
          });
        }}
        hasError={hasError}
        className={controlClassName}
        memoDeps={[
          value[field.id],
          readonly,
          disabled,
          visible,
          hasError,
          controlClassName,
          ...(evalFunc(null, field.deps) || []).map((dep)=>value[dep]),
        ]}
      />;

      if(field.inlineNext) {
        inlineComponents.push(React.cloneElement(currentControl, {
          withContainer: false, controlGridBasis: 3
        }));
      } else if(inlineComponents?.length > 0) {
        inlineComponents.push(React.cloneElement(currentControl, {
          withContainer: false, controlGridBasis: 3
        }));
        viewFields.push(
          <Box key={`ic-${inlineComponents[0].key}`} display="flex" className={controlClassName} gridRowGap="8px" flexWrap="wrap">
            {inlineComponents}
          </Box>
        );
        inlineComponents = [];
      } else {
        viewFields.push(currentControl);
      }
    }
  }
  if(inlineComponents?.length > 0) {
    viewFields.push(
      <Box key={`ic-${inlineComponents[0].key}`} display="flex" className={controlClassName} gridRowGap="8px" flexWrap="wrap">
        {inlineComponents}
      </Box>
    );
  }

  if(!visible) {
    return <></>;
  }

  return (
    <FieldSet title={label} className={controlClassName}>
      {viewFields}
    </FieldSet>
  );
}

FieldSetView.propTypes = {
  value: PropTypes.any,
  schema: CustomPropTypes.schemaUI.isRequired,
  viewHelperProps: PropTypes.object,
  isDataGridForm: PropTypes.bool,
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func,
  controlClassName: CustomPropTypes.className,
  label: PropTypes.string,
  visible: PropTypes.oneOfType([
    PropTypes.bool, PropTypes.func,
  ]),
};
