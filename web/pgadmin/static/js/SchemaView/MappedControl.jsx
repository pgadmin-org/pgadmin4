/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useContext, useMemo, useState } from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';

import {
  FormButton, FormInputCheckbox, FormInputColor, FormInputDateTimePicker,
  FormInputFileSelect, FormInputKeyboardShortcut, FormInputQueryThreshold,
  FormInputSQL, FormInputSelect, FormInputSelectThemes, FormInputSwitch,
  FormInputText, FormInputToggle, FormNote, InputCheckbox, InputDateTimePicker,
  InputFileSelect, InputRadio, InputSQL,InputSelect, InputSwitch, InputText,
  InputTree, PlainString,
} from 'sources/components/FormComponents';
import { SelectRefresh } from 'sources/components/SelectRefresh';
import Privilege from 'sources/components/Privilege';
import { useIsMounted } from 'sources/custom_hooks';
import CustomPropTypes from 'sources/custom_prop_types';
import { evalFunc } from 'sources/utils';

import { SchemaStateContext } from './SchemaState';
import { isValueEqual } from './common';
import {
  useFieldOptions, useFieldValue, useFieldError, useSchemaStateSubscriber,
} from './hooks';
import { listenDepChanges } from './utils';
import { InputColor } from '../components/FormComponents';


/* Control mapping for form view */
function MappedFormControlBase({
  id, type, state, onChange, className, inputRef, visible,
  withContainer, controlGridBasis, noLabel, ...props
}) {
  let name = id;
  const onTextChange = useCallback((e) => {
    let val = e;
    if(e?.target) {
      val = e.target.value;
    }
    onChange?.(val);
  }, []);
  const value = state;

  const onSqlChange = useCallback((changedValue) => {
    onChange?.(changedValue);
  }, []);

  const onTreeSelection = useCallback((selectedValues)=> {
    onChange?.(selectedValues);
  }, []);

  if (!visible) {
    return <></>;
  }

  if (name && _.isNumber(name)) {
    name = String(name);
  }

  /* The mapping uses Form* components as it comes with labels */
  switch (type) {
  case 'int':
    return <FormInputText
      name={name} value={value} onChange={onTextChange} className={className}
      inputRef={inputRef} {...props} type='int'
    />;
  case 'numeric':
    return <FormInputText
      name={name} value={value} onChange={onTextChange} className={className}
      inputRef={inputRef} {...props} type='numeric'
    />;
  case 'tel':
    return <FormInputText
      name={name} value={value} onChange={onTextChange} className={className}
      inputRef={inputRef} {...props} type='tel'
    />;
  case 'text':
    return <FormInputText
      name={name} value={value} onChange={onTextChange} className={className}
      inputRef={inputRef} {...props}
    />;
  case 'multiline':
    return <FormInputText
      name={name} value={value} onChange={onTextChange} className={className}
      inputRef={inputRef} controlProps={{ multiline: true }} {...props}
    />;
  case 'password':
    return <FormInputText
      name={name} value={value} onChange={onTextChange} className={className}
      type='password' inputRef={inputRef} {...props}
    />;
  case 'select':
    return <FormInputSelect
      name={name} value={value} onChange={onTextChange} className={className}
      inputRef={inputRef} {...props}
    />;
  case 'select-refresh':
    return <SelectRefresh
      name={name} value={value} onChange={onTextChange} className={className}
      {...props}
    />;
  case 'switch':
    return <FormInputSwitch
      name={name} value={value} className={className}
      onChange={(e) => onTextChange(e.target.checked, e.target.name)}
      withContainer={withContainer} controlGridBasis={controlGridBasis}
      {...props}
    />;
  case 'checkbox':
    return <FormInputCheckbox
      name={name} value={value} className={className}
      onChange={(e) => onTextChange(e.target.checked, e.target.name)}
      {...props}
    />;
  case 'toggle':
    return <FormInputToggle
      name={name} value={value} onChange={onTextChange} className={className}
      inputRef={inputRef} {...props}
    />;
  case 'color':
    return <FormInputColor
      name={name} value={value} onChange={onTextChange} className={className}
      {...props}
    />;
  case 'file':
    return <FormInputFileSelect
      name={name} value={value} onChange={onTextChange} className={className}
      inputRef={inputRef} {...props}
    />;
  case 'sql':
    return <FormInputSQL
      name={name} value={value} onChange={onSqlChange} className={className}
      noLabel={noLabel} inputRef={inputRef} {...props}
    />;
  case 'note':
    return <FormNote className={className} {...props} />;
  case 'datetimepicker':
    return <FormInputDateTimePicker
      name={name} value={value} onChange={onTextChange} className={className}
      {...props}
    />;
  case 'keyboardShortcut':
    return <FormInputKeyboardShortcut
      name={name} value={value} onChange={onTextChange} {...props}
    />;
  case 'threshold':
    return <FormInputQueryThreshold
      name={name} value={value} onChange={onTextChange} {...props}
    />;
  case 'theme':
    return <FormInputSelectThemes
      name={name} value={value} onChange={onTextChange} {...props}
    />;
  case 'button':
    return <FormButton
      name={name} value={value} className={className} onClick={props.onClick}
      {...props}
    />;
  case 'tree':
    return <InputTree
      name={name} treeData={props.treeData} onChange={onTreeSelection}
      {...props}
    />;
  default:
    return <PlainString value={value} {...props} />;
  }
}

MappedFormControlBase.propTypes = {
  type: PropTypes.oneOfType([
    PropTypes.string, PropTypes.func,
  ]).isRequired,
  state: PropTypes.any,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  className: PropTypes.oneOfType([
    PropTypes.string, PropTypes.object,
  ]),
  visible: PropTypes.bool,
  inputRef: CustomPropTypes.ref,
  noLabel: PropTypes.bool,
  onClick: PropTypes.func,
  withContainer: PropTypes.bool,
  controlGridBasis: PropTypes.number,
  treeData: PropTypes.oneOfType([
    PropTypes.array, PropTypes.instanceOf(Promise), PropTypes.func]
  ),
};

/* Control mapping for grid cell view */
function MappedCellControlBase({
  cell, value, id, optionsLoaded, onCellChange, visible, reRenderRow, inputRef,
  ...props
}) {
  let name = id;
  const onTextChange = useCallback((e) => {
    let val = e;
    if (e?.target) {
      val = e.target.value;
    }

    onCellChange?.(val);
  }, []);

  const onRadioChange = useCallback((e) => {
    let val =e;
    if(e?.target) {
      val = e.target.checked;
    }
    onCellChange?.(val);
  });

  const onSqlChange = useCallback((val) => {
    onCellChange?.(val);
  }, []);

  /* Some grid cells are based on options selected in other cells.
   * lets trigger a re-render for the row if optionsLoaded
   */
  const optionsLoadedRerender = useCallback((res) => {
    /* optionsLoaded is called when select options are fetched */
    optionsLoaded?.(res);
    reRenderRow?.();
  }, []);

  if (!visible) {
    return <></>;
  }

  if (name && _.isNumber(name)) {
    name = String('name');
  }

  /* The mapping does not need Form* components as labels are not needed for grid cells */
  switch(cell) {
  case 'int':
    return <InputText name={name} value={value} onChange={onTextChange} ref={inputRef} {...props} type='int'/>;
  case 'numeric':
    return <InputText name={name} value={value} onChange={onTextChange} ref={inputRef} {...props} type='numeric'/>;
  case 'text':
    return <InputText name={name} value={value} onChange={onTextChange} ref={inputRef} {...props}/>;
  case 'password':
    return <InputText name={name} value={value} onChange={onTextChange} ref={inputRef} {...props} type='password'/>;
  case 'select':
    return <InputSelect name={name} value={value} onChange={onTextChange} optionsLoaded={optionsLoadedRerender}
      inputRef={inputRef} {...props}/>;
  case 'switch':
    return <InputSwitch name={name} value={value}
      onChange={(e)=>onTextChange(e.target.checked, e.target.name)} {...props} />;
  case 'checkbox':
    return <InputCheckbox name={name} value={value}
      onChange={(e)=>onTextChange(e.target.checked, e.target.name)} {...props} />;
  case 'privilege':
    return <Privilege name={name} value={value} onChange={onTextChange} {...props}/>;
  case 'datetimepicker':
    return <InputDateTimePicker name={name} value={value} onChange={onTextChange} {...props}/>;
  case 'sql':
    return <InputSQL name={name} value={value} onChange={onSqlChange} {...props} />;
  case 'color':
    return <InputColor name={name} value={value} onChange={onTextChange} {...props} />;
  case 'file':
    return <InputFileSelect name={name} value={value} onChange={onTextChange} inputRef={props.inputRef} {...props} />;
  case 'keyCode':
    return <InputText name={name} value={value} onChange={onTextChange} {...props} type='text' maxlength={1} />;
  case 'radio':
    return <InputRadio name={name} value={value} onChange={onRadioChange} disabled={props.disabled} {...props} ></InputRadio>;
  default:
    return <PlainString value={value} {...props} />;
  }
}

MappedCellControlBase.propTypes = {
  cell: PropTypes.oneOfType([
    PropTypes.string, PropTypes.func,
  ]).isRequired,
  value: PropTypes.any,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func,
  reRenderRow: PropTypes.func,
  optionsLoaded: PropTypes.func,
  onCellChange: PropTypes.func,
  visible: PropTypes.bool,
  disabled: PropTypes.bool,
  inputRef: CustomPropTypes.ref,
};

const ALLOWED_PROPS_FIELD_COMMON = [
  'mode', 'value', 'readonly', 'disabled', 'hasError', 'id',
  'label', 'options', 'optionsLoaded', 'controlProps', 'schema', 'inputRef',
  'visible', 'autoFocus', 'helpMessage', 'className', 'optionsReloadBasis',
  'orientation', 'isvalidate', 'fields', 'radioType', 'hideBrowseButton',
  'btnName', 'hidden', 'withContainer', 'controlGridBasis', 'hasCheckbox',
  'treeData', 'labelTooltip'
];

const ALLOWED_PROPS_FIELD_FORM = [
  'type', 'onChange', 'state', 'noLabel', 'text','onClick'
];

const ALLOWED_PROPS_FIELD_CELL = [
  'cell', 'onCellChange', 'reRenderRow', 'validate', 'disabled',
  'readonly', 'radioType', 'hideBrowseButton', 'hidden', 'row',
];

export const StaticMappedFormControl = ({accessPath, field, ...props}) => {
  const schemaState = useContext(SchemaStateContext);
  const state = schemaState.value(accessPath);
  const newProps = {
    ...props,
    state,
    noLabel: field.isFullTab,
    ...field,
    onChange: () => { /* Do nothing */ },
  };
  const visible = evalFunc(null, field.visible, state);

  if (visible === false) return <></>;

  return useMemo(
    () => <MappedFormControlBase
      {
        ..._.pick(
          newProps,
          _.union(ALLOWED_PROPS_FIELD_COMMON, ALLOWED_PROPS_FIELD_FORM)
        )
      }
    />, []
  );
};

StaticMappedFormControl.propTypes = {
  accessPath: PropTypes.array.isRequired,
  field: PropTypes.object,
};

export const MappedFormControl = ({
  accessPath, dataDispatch, field, onChange, ...props
}) => {
  const checkIsMounted = useIsMounted();
  const [key, setKey] = useState(0);
  const subscriberManager = useSchemaStateSubscriber(setKey);
  const schemaState = useContext(SchemaStateContext);
  const state = schemaState.data;
  const value = useFieldValue(accessPath, schemaState, subscriberManager);
  const options = useFieldOptions(accessPath, schemaState, subscriberManager);
  const {hasError} = useFieldError(accessPath, schemaState, subscriberManager);
  const avoidRenderingWhenNotMounted = (...args) => {
    if (checkIsMounted()) subscriberManager.current?.signal(...args);
  };

  const origOnChange = onChange;

  onChange = (changedValue) => {
    if (!origOnChange || !checkIsMounted()) return;

    // We don't want the 'onChange' to be executed for the same value to avoid
    // rerendering of the control, top component may still be rerendered on the
    // change of the value.
    const currValue = schemaState.value(accessPath);

    if (!isValueEqual(changedValue, currValue)) origOnChange(changedValue);
  };

  const depVals = listenDepChanges(
    accessPath, field, schemaState, avoidRenderingWhenNotMounted
  );

  let newProps = {
    ...props,
    state: value,
    noLabel: field.isFullTab,
    ...field,
    onChange: onChange,
    dataDispatch: dataDispatch,
    ...options,
    hasError,
  };

  if (typeof (field.type) === 'function') {
    const typeProps = evalFunc(null, field.type, state);
    newProps = {
      ...newProps,
      ...typeProps,
    };
  }

  let origOnClick = newProps.onClick;
  newProps.onClick = ()=>{
    origOnClick?.();
  };

  // FIXME:: Get this list from the option registry.
  const memDeps = ['disabled', 'visible', 'readonly'].map(
    option => options[option]
  );

  memDeps.push(value);
  memDeps.push(hasError);
  memDeps.push(key);
  memDeps.push(JSON.stringify(accessPath));
  memDeps.push(depVals);

  // Filter out garbage props if any using ALLOWED_PROPS_FIELD.
  return useMemo(
    () => <MappedFormControlBase
      {
        ..._.pick(
          newProps,
          _.union(ALLOWED_PROPS_FIELD_COMMON, ALLOWED_PROPS_FIELD_FORM)
        )
      }
    />, [...memDeps]
  );
};

MappedFormControl.propTypes = {
  accessPath: PropTypes.array.isRequired,
  field: PropTypes.object,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export const MappedCellControl = (props) => {
  const newProps = _.pick(
    props, _.union(ALLOWED_PROPS_FIELD_COMMON, ALLOWED_PROPS_FIELD_CELL)
  );;

  // Filter out garbage props if any using ALLOWED_PROPS_FIELD.
  return <MappedCellControlBase {...newProps}/>;
};
