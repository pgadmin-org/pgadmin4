/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect } from 'react';

import Grid from '@mui/material/Grid';
import _ from 'lodash';
import PropTypes from 'prop-types';

import FieldSet from 'sources/components/FieldSet';
import CustomPropTypes from 'sources/custom_prop_types';
import { evalFunc } from 'sources/utils';

import { MappedFormControl } from './MappedControl';
import {
  getFieldMetaData, SCHEMA_STATE_ACTIONS, SchemaStateContext
} from './common';


const INLINE_COMPONENT_ROWGAP = '8px';

export default function FieldSetView({
  value, schema={}, viewHelperProps, accessPath, dataDispatch,
  controlClassName, isDataGridForm=false, label, visible
}) {
  const schemaState = useContext(SchemaStateContext);

  useEffect(() => {
    // Calculate the fields which depends on the current field.
    if(!isDataGridForm && schemaState) {
      schema.fields.forEach((field) => {
        /* Self change is also dep change */
        if(field.depChange || field.deferredDepChange) {
          schemaState?.addDepListener(
            accessPath.concat(field.id), accessPath.concat(field.id),
            field.depChange, field.deferredDepChange
          );
        }
        (evalFunc(null, field.deps) || []).forEach((dep) => {
          let source = accessPath.concat(dep);
          if(_.isArray(dep)) {
            source = dep;
          }
          if(field.depChange) {
            schemaState?.addDepListener(
              source, accessPath.concat(field.id), field.depChange
            );
          }
        });
      });
    }
  }, []);

  let viewFields = [];
  let inlineComponents = [];

  if(!visible) {
    return <></>;
  }

  // Prepare the array of components based on the types.
  for(const field of schema.fields) {
    const {
      visible, disabled, readonly, modeSupported
    } = getFieldMetaData(field, schema, value, viewHelperProps);

    if(!modeSupported) continue;

    // Its a form control.
    const hasError = (field.id === schemaState?.errors.name);

    /*
     * When there is a change, the dependent values can also change.
     * Let's pass these changes to dependent for take them into effect to
     * generate new values.
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
        <Grid container spacing={0} key={`ic-${inlineComponents[0].key}`}
          className={controlClassName} rowGap={INLINE_COMPONENT_ROWGAP}>
          {inlineComponents}
        </Grid>
      );
      inlineComponents = [];
    } else {
      viewFields.push(currentControl);
    }
  }

  if(inlineComponents?.length > 0) {
    viewFields.push(
      <Grid container spacing={0} key={`ic-${inlineComponents[0].key}`}
        className={controlClassName} rowGap={INLINE_COMPONENT_ROWGAP}>
        {inlineComponents}
      </Grid>
    );
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
