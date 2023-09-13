/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useMemo } from 'react';
import _ from 'lodash';
import {
  FormInputText, FormInputSelect, FormInputSwitch, FormInputCheckbox, FormInputColor,
  FormInputFileSelect, FormInputToggle, InputSwitch, FormInputSQL, InputSQL, FormNote, FormInputDateTimePicker, PlainString,
  InputSelect, InputText, InputCheckbox, InputDateTimePicker, InputFileSelect, FormInputKeyboardShortcut, FormInputQueryThreshold, FormInputSelectThemes, InputRadio, FormButton, InputTree
} from '../components/FormComponents';
import Privilege from '../components/Privilege';
import { evalFunc } from 'sources/utils';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import { SelectRefresh } from '../components/SelectRefresh';

/* Control mapping for form view */
function MappedFormControlBase({ type, value, id, onChange, className, visible, inputRef, noLabel, onClick, withContainer, controlGridBasis, ...props }) {
  const name = id;
  const onTextChange = useCallback((e) => {
    let val = e;
    if(e && e.target) {
      val = e.target.value;
    }
    onChange && onChange(val);
  }, []);

  const onSqlChange = useCallback((changedValue) => {
    onChange && onChange(changedValue);
  }, []);

  const onTreeSelection = useCallback((selectedValues)=> {
    onChange && onChange(selectedValues);
  }, []);

  if (!visible) {
    return <></>;
  }

  /* The mapping uses Form* components as it comes with labels */
  switch (type) {
  case 'int':
    return <FormInputText name={name} value={value} onChange={onTextChange} className={className} inputRef={inputRef} {...props} type='int' />;
  case 'numeric':
    return <FormInputText name={name} value={value} onChange={onTextChange} className={className} inputRef={inputRef} {...props} type='numeric' />;
  case 'tel':
    return <FormInputText name={name} value={value} onChange={onTextChange} className={className} inputRef={inputRef} {...props} type='tel' />;
  case 'text':
    return <FormInputText name={name} value={value} onChange={onTextChange} className={className} inputRef={inputRef} {...props} />;
  case 'multiline':
    return <FormInputText name={name} value={value} onChange={onTextChange} className={className}
      inputRef={inputRef} controlProps={{ multiline: true }} {...props} />;
  case 'password':
    return <FormInputText name={name} value={value} onChange={onTextChange} className={className} type='password' inputRef={inputRef} {...props} />;
  case 'select':
    return <FormInputSelect name={name} value={value} onChange={onTextChange} className={className} inputRef={inputRef} {...props} />;
  case 'select-refresh':
    return <SelectRefresh name={name} value={value} onChange={onTextChange} className={className} {...props} />;
  case 'switch':
    return <FormInputSwitch name={name} value={value}
      onChange={(e) => onTextChange(e.target.checked, e.target.name)} className={className}
      withContainer={withContainer} controlGridBasis={controlGridBasis}
      {...props} />;
  case 'checkbox':
    return <FormInputCheckbox name={name} value={value}
      onChange={(e) => onTextChange(e.target.checked, e.target.name)} className={className}
      {...props} />;
  case 'toggle':
    return <FormInputToggle name={name} value={value}
      onChange={onTextChange} className={className} inputRef={inputRef}
      {...props} />;
  case 'color':
    return <FormInputColor name={name} value={value} onChange={onTextChange} className={className} {...props} />;
  case 'file':
    return <FormInputFileSelect name={name} value={value} onChange={onTextChange} className={className} inputRef={inputRef} {...props} />;
  case 'sql':
    return <FormInputSQL name={name} value={value} onChange={onSqlChange} className={className} noLabel={noLabel} inputRef={inputRef} {...props} />;
  case 'note':
    return <FormNote className={className} {...props} />;
  case 'datetimepicker':
    return <FormInputDateTimePicker name={name} value={value} onChange={onTextChange} className={className} {...props} />;
  case 'keyboardShortcut':
    return <FormInputKeyboardShortcut name={name} value={value} onChange={onTextChange} {...props}/>;
  case 'threshold':
    return <FormInputQueryThreshold name={name} value={value} onChange={onTextChange} {...props}/>;
  case 'theme':
    return <FormInputSelectThemes name={name} value={value} onChange={onTextChange} {...props}/>;
  case 'button':
    return <FormButton name={name} value={value} className={className} onClick={onClick}  {...props} />;
  case 'tree':
    return <InputTree name={name} treeData={props.treeData} onChange={onTreeSelection} {...props}/>;
  default:
    return <PlainString value={value} {...props} />;
  }
}

MappedFormControlBase.propTypes = {
  type: PropTypes.oneOfType([
    PropTypes.string, PropTypes.func,
  ]).isRequired,
  value: PropTypes.any,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
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
  treeData: PropTypes.array,
};

/* Control mapping for grid cell view */
function MappedCellControlBase({ cell, value, id, optionsLoaded, onCellChange, visible, reRenderRow, inputRef, ...props }) {
  const name = id;
  const onTextChange = useCallback((e) => {
    let val = e;
    if (e && e.target) {
      val = e.target.value;
    }

    onCellChange && onCellChange(val);
  }, []);

  const onRadioChange = useCallback((e) => {
    let val =e;
    if(e && e.target) {
      val = e.target.checked;
    }
    onCellChange && onCellChange(val);
  });

  const onSqlChange = useCallback((val) => {
    onCellChange && onCellChange(val);
  }, []);

  /* Some grid cells are based on options selected in other cells.
   * lets trigger a re-render for the row if optionsLoaded
   */
  const optionsLoadedRerender = useCallback((res) => {
    /* optionsLoaded is called when select options are fetched */
    optionsLoaded && optionsLoaded(res);
    reRenderRow && reRenderRow();
  }, []);

  if (!visible) {
    return <></>;
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
  'orientation', 'isvalidate', 'fields', 'radioType', 'hideBrowseButton', 'btnName', 'hidden',
  'withContainer', 'controlGridBasis', 'hasCheckbox', 'treeData'
];

const ALLOWED_PROPS_FIELD_FORM = [
  'type', 'onChange', 'state', 'noLabel', 'text','onClick'
];

const ALLOWED_PROPS_FIELD_CELL = [
  'cell', 'onCellChange', 'row', 'reRenderRow', 'validate', 'disabled', 'readonly', 'radioType', 'hideBrowseButton', 'hidden'
];


export const MappedFormControl = ({memoDeps, ...props}) => {
  let newProps = { ...props };
  let typeProps = evalFunc(null, newProps.type, newProps.state);
  if (typeof (typeProps) === 'object') {
    newProps = {
      ...newProps,
      ...typeProps,
    };
  } else {
    newProps.type = typeProps;
  }

  let origOnClick = newProps.onClick;
  newProps.onClick = ()=>{
    origOnClick?.();
    /* Consider on click as change for button.
    Just increase state val by 1 to inform the deps and self depChange */
    newProps.onChange?.((newProps.state[props.id]||0)+1);
  };

  /* Filter out garbage props if any using ALLOWED_PROPS_FIELD */
  return useMemo(()=><MappedFormControlBase {..._.pick(newProps, _.union(ALLOWED_PROPS_FIELD_COMMON, ALLOWED_PROPS_FIELD_FORM))} />, memoDeps??[]);
};

MappedFormControl.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export const MappedCellControl = (props) => {
  let newProps = { ...props };
  let cellProps = evalFunc(null, newProps.cell, newProps.row);
  if (typeof (cellProps) === 'object') {
    newProps = {
      ...newProps,
      ...cellProps,
    };
  } else {
    newProps.cell = cellProps;
  }

  /* Filter out garbage props if any using ALLOWED_PROPS_FIELD */
  return <MappedCellControlBase {..._.pick(newProps, _.union(ALLOWED_PROPS_FIELD_COMMON, ALLOWED_PROPS_FIELD_CELL))} />;
};
