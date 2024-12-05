/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
/* Common form components used in pgAdmin */

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box, FormControl, OutlinedInput, FormHelperText, ToggleButton, ToggleButtonGroup,
  Grid, IconButton, FormControlLabel, Switch, Checkbox, useTheme, InputLabel, Paper, Select as MuiSelect, Radio, Tooltip,
} from '@mui/material';
import ErrorRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentTurnedIn from '@mui/icons-material/AssignmentTurnedIn';
import Select, { components as RSComponents } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import PropTypes from 'prop-types';
import HTMLReactParse from 'html-react-parser';

import { DateTimePicker, DatePicker, TimePicker} from '@mui/x-date-pickers';
import * as DateFns from 'date-fns';

import CodeMirror from './ReactCodeMirror';
import gettext from 'sources/gettext';
import _ from 'lodash';
import { DefaultButton, PrimaryButton, PgIconButton } from './Buttons';
import CustomPropTypes from '../custom_prop_types';
import KeyboardShortcuts from './KeyboardShortcuts';
import QueryThresholds from './QueryThresholds';
import SelectThemes from './SelectThemes';
import { showFileManager } from '../helpers/showFileManager';
import { withColorPicker } from '../helpers/withColorPicker';
import { useWindowSize } from '../custom_hooks';
import PgTreeView from '../PgTreeView';
import Loader from 'sources/components/Loader';
import { MY_STORAGE } from '../../../misc/file_manager/static/js/components/FileManagerConstants';


const Root = styled('div')(({theme}) => ({
  '& .Form-optionIcon': {
    ...theme.mixins.nodeIcon,
  },
  '& .Form-sql': {
    border: '1px solid ' + theme.otherVars.inputBorderColor,
    borderRadius: theme.shape.borderRadius,
    height: '100%',
  },
  '& .Form-readOnlySwitch': {
    opacity: 0.75,
    '& .MuiSwitch-track': {
      opacity: theme.palette.action.disabledOpacity,
    }
  },
  '& .Form-colorBtn': {
    height: theme.spacing(3.5),
    minHeight: theme.spacing(3.5),
    width: theme.spacing(3.5),
    minWidth: theme.spacing(3.5),
  },
  '& .Form-noteRoot': {
    display: 'flex',
    backgroundColor: theme.otherVars.noteBg,
    padding: theme.spacing(1),
    border: `1px solid ${theme.otherVars.borderColor}`
  },
  '& .Form-plainstring': {
    padding: theme.spacing(0.5),
  }
}));


export const MESSAGE_TYPE = {
  SUCCESS: 'Success',
  ERROR: 'Error',
  INFO: 'Info',
  CLOSE: 'Close',
  WARNING: 'Warning'
};

/* Icon based on MESSAGE_TYPE */
function FormIcon({ type, close = false, ...props }) {
  let TheIcon = null;
  if (close) {
    TheIcon = CloseIcon;
  } else if (type === MESSAGE_TYPE.SUCCESS) {
    TheIcon = CheckRoundedIcon;
  } else if (type === MESSAGE_TYPE.ERROR) {
    TheIcon = ErrorRoundedIcon;
  } else if (type === MESSAGE_TYPE.INFO) {
    TheIcon = InfoRoundedIcon;
  } else if (type === MESSAGE_TYPE.WARNING) {
    TheIcon = WarningRoundedIcon;
  }

  return <TheIcon fontSize="small" {...props} data-testid={close ? 'Close' : type}/>;
}
FormIcon.propTypes = {
  type: PropTypes.oneOf(Object.values(MESSAGE_TYPE)),
  close: PropTypes.bool,
};

const StyledGrid = styled(Grid)(({theme}) => ({
  '& .Form-label': {
    margin: theme.spacing(0.75, 0.75, 0.75, 0.75),
    display: 'flex',
    wordBreak: 'break-word'
  },
  '& .Form-labelError': {
    color: theme.palette.error.main,
  },
}));

/* Wrapper on any form component to add label, error indicator and help message */
export function FormInput({ children, error, className, label, helpMessage, required, testcid, lid, withContainer=true, labelGridBasis=3, controlGridBasis=9, labelTooltip='' }) {

  const cid = testcid || _.uniqueId('c');
  const helpid = `h${cid}`;
  if(!withContainer) {
    return (
      (<>
        <StyledGrid item lg={labelGridBasis} md={labelGridBasis} sm={12} xs={12}>
          <InputLabel id={lid} htmlFor={lid ? undefined : cid} className={'Form-label ' + (error ? 'Form-labelError' : null)} required={required}>
            {label}
            <FormIcon type={MESSAGE_TYPE.ERROR} style={{ marginLeft: 'auto', visibility: error ? 'unset' : 'hidden' }} />
          </InputLabel>
        </StyledGrid>
        <StyledGrid item lg={controlGridBasis} md={controlGridBasis} sm={12} xs={12}>
          <FormControl error={Boolean(error)} fullWidth>
            {React.cloneElement(children, { cid, helpid })}
          </FormControl>
          <FormHelperText id={helpid} variant="outlined">{HTMLReactParse(helpMessage || '')}</FormHelperText>
        </StyledGrid>
      </>)
    );
  }

  let labelComponent = <InputLabel id={lid} htmlFor={lid ? undefined : cid} className={'Form-label ' + (error ? 'Form-labelError' : null)} required={required}>
    {label}
    <FormIcon type={MESSAGE_TYPE.ERROR} style={{ marginLeft: 'auto', visibility: error ? 'unset' : 'hidden' }} />
  </InputLabel>;
  return (
    <StyledGrid container spacing={0} className={className} data-testid="form-input">
      <Grid item lg={labelGridBasis} md={labelGridBasis} sm={12} xs={12}>
        {
          labelTooltip ?
            <Tooltip title={labelTooltip}>
              {labelComponent}
            </Tooltip> : labelComponent
        }
      </Grid>
      <Grid item lg={controlGridBasis} md={controlGridBasis} sm={12} xs={12}>
        <FormControl error={Boolean(error)} fullWidth>
          {React.cloneElement(children, { cid, helpid })}
        </FormControl>
        <FormHelperText id={helpid} variant="outlined">{HTMLReactParse(helpMessage || '')}</FormHelperText>
      </Grid>
    </StyledGrid>
  );
}
FormInput.propTypes = {
  children: CustomPropTypes.children,
  error: PropTypes.bool,
  className: CustomPropTypes.className,
  label: PropTypes.string,
  helpMessage: PropTypes.string,
  required: PropTypes.bool,
  testcid: PropTypes.any,
  lid: PropTypes.any,
  withContainer: PropTypes.bool,
  labelGridBasis: PropTypes.number,
  controlGridBasis: PropTypes.number,
  labelTooltip: PropTypes.string
};

export function InputSQL({ value, options={}, onChange, className, controlProps, inputRef, ...props }) {

  const editor = useRef();
  const { autocompleteProvider, autocompleteOnKeyPress } = options;

  return (
    <Root style={{height: '100%'}}>
      <CodeMirror
        currEditor={(obj) => {
          editor.current = obj;
          inputRef?.(obj);
          if(autocompleteProvider) {
            editor.current.registerAutocomplete(autocompleteProvider);
          }
        }}
        value={value || ''}
        options={{
          ..._.omit(options, ['autocompleteProvider', 'autocompleteOnKeyPress']),
        }}
        className={'Form-sql ' + className}
        onChange={onChange}
        autocomplete={true}
        autocompleteOnKeyPress={autocompleteOnKeyPress}
        {...controlProps}
        {...props}
      />
    </Root>
  );
}
InputSQL.propTypes = {
  value: PropTypes.string,
  options: PropTypes.object,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
  className: CustomPropTypes.className,
  controlProps: PropTypes.object,
  inputRef: CustomPropTypes.ref,
};

export function FormInputSQL({ hasError, required, label, className, helpMessage, testcid, value, controlProps, noLabel, ...props }) {
  if (noLabel) {
    return <InputSQL value={value} options={controlProps} {...props} />;
  } else {
    const lid = _.uniqueId('l');
    return (
      <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} lid={lid}>
        <InputSQL value={value} options={controlProps} labelledBy={lid} {...props} />
      </FormInput>
    );
  }
}
FormInputSQL.propTypes = {
  hasError: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  value: PropTypes.string,
  controlProps: PropTypes.object,
  noLabel: PropTypes.bool,
  change: PropTypes.func,
};

/* https://date-fns.org/v2.24.0/docs/format */
const DATE_TIME_FORMAT = {
  DATE_TIME_12: 'yyyy-MM-dd hh:mm:ss aa xxx',
  DATE_TIME_24: 'yyyy-MM-dd HH:mm:ss xxx',
  DATE: 'yyyy-MM-dd',
  TIME_12: 'hh:mm:ss aa',
  TIME_24: 'HH:mm:ss',
};

export function InputDateTimePicker({ value, onChange, readonly, controlProps, ...props }) {
  let format = '';
  let placeholder = '';
  let regExp = /[a-zA-Z]/;
  let timeZoneString = '';

  controlProps = controlProps ?? {};
  if (controlProps?.pickerType === 'Date') {
    format = controlProps?.format || DATE_TIME_FORMAT.DATE;
    placeholder = controlProps.placeholder || 'YYYY-MM-DD';
  } else if (controlProps?.pickerType === 'Time') {
    format = controlProps?.format || (controlProps?.ampm ? DATE_TIME_FORMAT.TIME_12 : DATE_TIME_FORMAT.TIME_24);
    placeholder = controlProps?.placeholder || 'HH:mm:ss';
  } else {
    format = controlProps?.format || (controlProps?.ampm ? DATE_TIME_FORMAT.DATE_TIME_12 : DATE_TIME_FORMAT.DATE_TIME_24);
    placeholder = controlProps?.placeholder || 'YYYY-MM-DD HH:mm:ss Z';
  }

  const handleChange = (dateVal) => {
    if(DateFns.isValid(dateVal)) {
      onChange(DateFns.format(dateVal, format));
    } else{
      onChange(null);
    }
  };

  /* Value should be a date object instead of string */
  value = _.isUndefined(value) || regExp.test(value) ? null : value;
  if (!_.isNull(value)) {
    timeZoneString = value.slice(-6);
    let parseValue = DateFns.parse(value, format, new Date());
    if (!DateFns.isValid(parseValue)) {
      parseValue = DateFns.parseISO(value);
    }
    value = !DateFns.isValid(parseValue) ? value : parseValue;
  }

  if (readonly) {
    return (<InputText value={value ? DateFns.format(value, format) : value}
      readonly={readonly} controlProps={{ placeholder: controlProps.placeholder }} {...props} />);
  }

  let commonProps = {
    ...props,
    value: value,
    format: format.replace('xxx', timeZoneString),
    label: '',
    variant: 'inline',
    ampm: controlProps.ampm ? controlProps.ampm : undefined,
    disablePast: controlProps.disablePast || false,
    onChange: handleChange,
    slotProps: {textField: {placeholder:placeholder}}
  };

  if (controlProps?.pickerType === 'Date') {
    return (
      <DatePicker {...commonProps} />
    );
  } else if (controlProps?.pickerType === 'Time') {
    return (
      <TimePicker {...commonProps} />
    );
  }
  return (
    <DateTimePicker {...commonProps} />
  );
}
InputDateTimePicker.propTypes = {
  value: CustomPropTypes.className,
  options: PropTypes.object,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
  controlProps: PropTypes.object,
};

export function FormInputDateTimePicker({ hasError, required, label, className, helpMessage, testcid, labelTooltip, ...props }) {
  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} labelTooltip={labelTooltip}>
      <InputDateTimePicker {...props} />
    </FormInput>
  );
}
FormInputDateTimePicker.propTypes = {
  hasError: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  value: CustomPropTypes.className,
  controlProps: PropTypes.object,
  change: PropTypes.func,
  labelTooltip: PropTypes.string
};

/* Use forwardRef to pass ref prop to OutlinedInput */
export const InputText = forwardRef(({
  cid, helpid, readonly, disabled, value, onChange, controlProps, type, size, inputStyle, ...props }, ref) => {

  const maxlength = typeof(controlProps?.maxLength) != 'undefined' ? controlProps.maxLength : 255;
  const patterns = {
    'numeric': '^-?[0-9]\\d*\\.?\\d*$',
    'int': '^-?[0-9]\\d*$',
  };

  let finalValue = (_.isNull(value) || _.isUndefined(value)) ? '' : value;

  if (controlProps?.formatter) {
    finalValue = controlProps.formatter.fromRaw(finalValue);
  }

  if (_.isNull(finalValue) || _.isUndefined(finalValue)) finalValue = '';

  const [val, setVal] = useState(finalValue);

  useEffect(() => setVal(finalValue), [finalValue]);
  const onChangeFinal = (e) => {
    let changeVal = e.target.value;

    /* For type number, we set type as tel with number regex to get validity.*/
    if (['numeric', 'int', 'tel'].indexOf(type) > -1) {
      if (!e.target.validity.valid && changeVal !== '' && changeVal !== '-') {
        return;
      }
    }
    if (controlProps?.formatter) {
      changeVal = controlProps.formatter.toRaw(changeVal);
    }
    setVal(changeVal);
    onChange?.(changeVal);
  };


  const filteredProps = _.pickBy(props, (_v, key)=>(
    /* When used in ButtonGroup, following props should be skipped */
    !['color', 'disableElevation', 'disableFocusRipple', 'disableRipple'].includes(key)
  ));

  return (
    <OutlinedInput
      ref={ref}
      color="primary"
      fullWidth
      size={size}
      margin={size == 'small' ? 'dense' : 'none'}
      inputProps={{
        id: cid,
        maxLength: controlProps?.multiline ? null : maxlength,
        'aria-describedby': helpid,
        ...(type ? { pattern: !_.isUndefined(controlProps) && !_.isUndefined(controlProps.pattern) ? controlProps.pattern : patterns[type] } : {}),
        style: inputStyle || {},
        autoComplete: _.isUndefined(controlProps?.autoComplete) ? 'off' : controlProps?.autoComplete,
        'data-testid': 'input-text',
        title: controlProps?.title,
      }}
      readOnly={Boolean(readonly)}
      disabled={Boolean(disabled)}
      rows={4}
      notched={false}
      value={val}
      onChange={onChangeFinal}
      {
        ...(controlProps?.onKeyDown && { onKeyDown: controlProps.onKeyDown })
      }
      {...controlProps}
      {...filteredProps}
      {...(['numeric', 'int'].indexOf(type) > -1 ? { type: 'tel' } : { type: type })}
    />
  );
});
InputText.displayName = 'InputText';
InputText.propTypes = {
  cid: PropTypes.string,
  helpid: PropTypes.string,
  label: PropTypes.string,
  readonly: PropTypes.bool,
  disabled: PropTypes.bool,
  value: PropTypes.any,
  onChange: PropTypes.func,
  controlProps: PropTypes.object,
  type: PropTypes.string,
  size: PropTypes.string,
  inputStyle: PropTypes.object
};

export function FormInputText({ hasError, required, label, className, helpMessage, testcid, labelTooltip, ...props }) {
  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} labelTooltip={labelTooltip} >
      <InputText label={label} {...props} />
    </FormInput>
  );
}
FormInputText.propTypes = {
  hasError: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  labelTooltip: PropTypes.string
};

export function InputFileSelect({ controlProps, onChange, disabled, readonly, isvalidate = false, hideBrowseButton=false,validate, ...props }) {
  const inpRef = useRef();
  let textControlProps = {};
  if(controlProps?.placeholder) {
    const {placeholder} = controlProps;
    textControlProps = {placeholder};
  }
  const showFileDialog = ()=>{
    let params = {
      supported_types: controlProps.supportedTypes || [],
      dialog_type: controlProps.dialogType || 'select_file',
      dialog_title: controlProps.dialogTitle || '',
      btn_primary: controlProps.btnPrimary || '',
    };
    showFileManager(params, (fileName, dir)=>{
      if (dir && dir != MY_STORAGE){
        onChange?.(dir + ':' + decodeURI(fileName));
      }else{
        onChange?.(decodeURI(fileName));
      }
      inpRef.current.focus();
    });
  };

  return (
    <InputText ref={inpRef} disabled={disabled} readonly={readonly} onChange={onChange} controlProps={textControlProps} {...props} endAdornment={
      <>
        {!hideBrowseButton &&
        <IconButton onClick={showFileDialog}
          disabled={disabled || readonly} aria-label={gettext('Select a file')}><FolderOpenRoundedIcon /></IconButton>
        }
        {isvalidate &&
          <PgIconButton title={gettext('Validate')} style={{ border: 'none' }} disabled={!props.value} onClick={() => { validate(props.value); }} icon={<AssignmentTurnedIn />}></PgIconButton>
        }
      </>
    } />
  );
}
InputFileSelect.propTypes = {
  controlProps: PropTypes.object,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  readonly: PropTypes.bool,
  isvalidate: PropTypes.bool,
  validate: PropTypes.func,
  value: PropTypes.string,
  hideBrowseButton: PropTypes.bool
};

export function FormInputFileSelect({
  hasError, required, label, className, helpMessage, testcid, labelTooltip, ...props }) {

  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} labelTooltip={labelTooltip}>
      <InputFileSelect required={required} label={label} {...props} />
    </FormInput>
  );
}
FormInputFileSelect.propTypes = {
  hasError: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  labelTooltip: PropTypes.string
};

export function InputSwitch({ cid, helpid, value, onChange, readonly, controlProps, ...props }) {

  return (
    <Switch color="primary"
      checked={Boolean(value)}
      onChange={
        readonly ? () => {/*This is intentional (SonarQube)*/ } : onChange
      }
      id={cid}
      inputProps={{
        'aria-describedby': helpid,
      }}
      {...controlProps}
      {...props}
      className={(readonly || props.disabled) ? 'Form-readOnlySwitch' : null}
    />
  );
}
InputSwitch.propTypes = {
  cid: PropTypes.string,
  helpid: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
  disabled: PropTypes.bool,
  controlProps: PropTypes.object,
};

export function FormInputSwitch({ hasError, required, label, className, helpMessage, testcid, withContainer, controlGridBasis, labelTooltip, ...props }) {
  return (
    <FormInput required={required} label={label} error={hasError} className={className}
      helpMessage={helpMessage} testcid={testcid} withContainer={withContainer} controlGridBasis={controlGridBasis} labelTooltip={labelTooltip}>
      <InputSwitch {...props} />
    </FormInput>
  );
}
FormInputSwitch.propTypes = {
  hasError: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  withContainer: PropTypes.bool,
  controlGridBasis: PropTypes.number,
  labelTooltip: PropTypes.string
};

export function InputCheckbox({ cid, helpid, value, onChange, controlProps, readonly, disabled, labelPlacement, ...props }) {
  controlProps = controlProps || {};
  return (
    <FormControlLabel
      control={
        <Checkbox
          id={cid}
          checked={Boolean(value)}
          onChange={readonly ? () => {/*This is intentional (SonarQube)*/ } : onChange}
          color="primary"
          inputProps={{ 'aria-describedby': helpid, 'title': controlProps.label}}
          {...props} />
      }
      disabled={disabled}
      label={controlProps.label}
      labelPlacement={labelPlacement}
    />
  );
}
InputCheckbox.propTypes = {
  cid: PropTypes.string,
  helpid: PropTypes.string,
  value: PropTypes.bool,
  controlProps: PropTypes.object,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
  disabled: PropTypes.bool,
  labelPlacement: PropTypes.string
};

export function FormInputCheckbox({ hasError, required, label,
  className, helpMessage, testcid, labelTooltip, ...props }) {

  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} labelTooltip={labelTooltip}>
      <InputCheckbox {...props} />
    </FormInput>
  );
}
FormInputCheckbox.propTypes = {
  hasError: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  labelTooltip: PropTypes.string
};

export function InputRadio({ helpid, value, onChange, controlProps, readonly, labelPlacement, disabled }) {
  controlProps = controlProps || {};
  return (
    <FormControlLabel
      control={
        <Radio
          color="primary"
          checked={value}
          onChange={
            readonly ? () => {
              /*This is intentional (SonarQube)*/ } : onChange
          }
          value={value}
          name="radio-button-demo"
          inputProps={{ 'aria-label': value, 'aria-describedby': helpid }}
          disableRipple
        />
      }
      disabled={disabled}
      label={controlProps.label}
      labelPlacement={labelPlacement}
    />
  );
}
InputRadio.propTypes = {
  helpid: PropTypes.string,
  value: PropTypes.bool,
  controlProps: PropTypes.object,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
  disabled: PropTypes.bool,
  labelPlacement: PropTypes.string
};

export const ToggleCheckButton = forwardRef(({ value, selected, label, ...props }, ref) => {
  return (
    <ToggleButton ref={ref} value={value} component={selected ? PrimaryButton : DefaultButton}
      aria-label={label} {...props}>
      <CheckRoundedIcon style={{ visibility: selected ? 'visible' : 'hidden', fontSize: '1.2rem' }} />&nbsp;{label}
    </ToggleButton>
  );
});
ToggleCheckButton.displayName = 'ToggleCheckButton';
ToggleCheckButton.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  selected: PropTypes.bool,
  options: PropTypes.array,
  label: PropTypes.string,
};

export const InputToggle = forwardRef(({ cid, value, onChange, options, disabled, readonly, helpid, ...props }, ref) => {
  return (
    <>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(e, val) => { val !== null && onChange(val); }}
        {...props}
      >
        {
          (options || []).map((option, i) => {
            const isSelected = option.value === value;
            const isDisabled = disabled || option.disabled || (readonly && !isSelected);

            return <ToggleCheckButton ref={i == 0 ? ref : null} key={option.label} label={option.label}
              selected={isSelected} value={option.value} disabled={isDisabled} title={option.tooltip}
            />;
          })
        }
      </ToggleButtonGroup>
      {helpid && <input style={{display: 'none'}} defaultValue={options?.find((o)=>o.value==value)?.label} id={cid} aria-describedby={helpid} />}
    </>
  );
});
InputToggle.displayName = 'InputToggle';
InputToggle.propTypes = {
  cid: PropTypes.string,
  helpid: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  options: PropTypes.array,
  controlProps: PropTypes.object,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  readonly: PropTypes.bool,
};

export function FormInputToggle({ hasError, required, label,
  className, helpMessage, testcid, inputRef, labelTooltip, ...props }) {
  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} labelTooltip={labelTooltip}>
      <InputToggle ref={inputRef} {...props} />
    </FormInput>
  );
}
FormInputToggle.propTypes = {
  hasError: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  inputRef: CustomPropTypes.ref,
  labelTooltip: PropTypes.string
};

/* react-select package is used for select input
 * Customizing the select styles to fit existing theme
 */
const customReactSelectStyles = (theme, readonly) => ({
  input: (provided) => {
    return { ...provided, padding: 0, margin: 0, color: 'inherit' };
  },
  singleValue: (provided) => {
    return {
      ...provided,
      color: 'inherit',
    };
  },
  control: (provided, state) => ({
    ...provided,
    minHeight: '0',
    backgroundColor: readonly ? theme.otherVars.inputDisabledBg : theme.palette.background.default,
    color: readonly ? theme.palette.text.muted : theme.palette.text.primary,
    borderColor: theme.otherVars.inputBorderColor,
    ...(state.isFocused ? {
      borderColor: theme.palette.primary.main,
      boxShadow: 'inset 0 0 0 1px ' + theme.palette.primary.main,
      '&:hover': {
        borderColor: theme.palette.primary.main,
      }
    } : {}),
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: '0rem 0.25rem',
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    ...(readonly ? { display: 'none' } : {})
  }),
  clearIndicator: (provided) => ({
    ...provided,
    padding: '0rem 0.25rem',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: theme.otherVars.reactSelect.padding,
  }),
  groupHeading: (provided) => ({
    ...provided,
    color: 'inherit',
    fontSize: '0.85em',
    fontWeight: 'bold',
    textTransform: 'none',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    boxShadow: 'none',
    border: '1px solid ' + theme.otherVars.inputBorderColor,
    marginTop: '2px',
  }),
  menuPortal: (provided) => ({
    ...provided, zIndex: 9999,
    backgroundColor: 'inherit',
    color: 'inherit',
  }),
  option: (provided, state) => {
    let bgColor = 'inherit';
    if (state.isFocused) {
      bgColor = theme.palette.grey[400];
    } else if (state.isSelected) {
      bgColor = theme.palette.primary.light;
    }
    return {
      ...provided,
      padding: '0.5rem',
      color: 'inherit',
      backgroundColor: bgColor,
    };
  },
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: theme.palette.grey[400],
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    fontSize: '1em',
    zIndex: 99,
    color: theme.palette.text.primary
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    '&:hover': {
      backgroundColor: 'unset',
      color: theme.palette.error.main,
    },
    ...(readonly ? { display: 'none' } : {})
  }),
});

function OptionView({ image, imageUrl, label }) {

  return (
    <Root>
      {image && <span className={'Form-optionIcon ' + image}></span>}
      {imageUrl && <img style={{height: '20px', marginRight: '4px'}} src={imageUrl} alt="" />}
      <span>{label}</span>
    </Root>
  );
}
OptionView.propTypes = {
  image: PropTypes.string,
  imageUrl: PropTypes.string,
  label: PropTypes.string,
};

function CustomSelectInput(props) {
  const { maxLength } = props.selectProps;
  return (
    <RSComponents.Input {...props} maxLength={maxLength} autoComplete='off' autoCorrect='off' spellCheck='off' />
  );
}
CustomSelectInput.propTypes = {
  selectProps: PropTypes.object,
};

function CustomSelectOption(props) {
  return (
    <RSComponents.Option {...props}>
      <OptionView image={props.data.image} imageUrl={props.data.imageUrl} label={props.data.label} />
    </RSComponents.Option>
  );
}
CustomSelectOption.propTypes = {
  data: PropTypes.object,
};

function CustomSelectSingleValue(props) {
  return (
    <RSComponents.SingleValue {...props}>
      <OptionView image={props.data.image} imageUrl={props.data.imageUrl} label={props.data.label} />
    </RSComponents.SingleValue>
  );
}
CustomSelectSingleValue.propTypes = {
  data: PropTypes.object,
};

export function flattenSelectOptions(options) {
  return _.flatMap(options, (option) => {
    if (option.options) {
      return option.options;
    } else {
      return option;
    }
  });
}

function getRealValue(options, value, creatable, formatter) {
  let realValue = null;
  if(options?.length == 0 && !creatable) {
    return realValue;
  }
  if (_.isArray(value)) {
    realValue = [...value];
    /* If multi select options need to be in some format by UI, use formatter */
    if (formatter) {
      realValue = formatter.fromRaw(realValue, options);
    } else if (creatable) {
      realValue = realValue.map((val) => ({ label: val, value: val }));
    } else {
      realValue = realValue.map((val) => (_.find(options, (option) => _.isEqual(option.value, val))));
    }
  } else {
    let flatOptions = flattenSelectOptions(options);
    realValue = _.find(flatOptions, (option) => option.value == value) ||
      (creatable && !_.isUndefined(value) && !_.isNull(value) ? { label: value, value: value } : null);
  }
  return realValue;
}
export function InputSelectNonSearch({ options, ...props }) {
  return <MuiSelect native {...props} variant="outlined">
    {(options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </MuiSelect>;
}
InputSelectNonSearch.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.shape,
    value: PropTypes.any,
  })),
};

export const InputSelect = forwardRef(({
  cid, helpid, onChange, options, readonly = false, value, controlProps = {}, optionsLoaded, optionsReloadBasis, disabled, ...props }, ref) => {
  const [[finalOptions, isLoading], setFinalOptions] = useState([[], true]);
  const theme = useTheme();

  useWindowSize();

  /* React will always take options let as changed parameter. So,
  We cannot run the below effect with options dependency as it will keep on
  loading the options. optionsReloadBasis is helpful to avoid repeated
  options load. If optionsReloadBasis value changes, then options will be loaded again.
  */
  useEffect(() => {
    let optPromise = options, umounted = false;
    if (typeof options === 'function') {
      optPromise = options();
    }
    setFinalOptions([[], true]);
    Promise.resolve(optPromise)
      .then((res) => {
        /* If component unmounted, dont update state */
        if (!umounted) {
          optionsLoaded?.(res, value);
          /* Auto select if any option has key as selected */
          const flatRes = flattenSelectOptions(res || []);
          let selectedVal;
          if (controlProps.multiple) {
            selectedVal = _.filter(flatRes, (o) => o.selected)?.map((o) => o.value);
          } else {
            selectedVal = _.find(flatRes, (o) => o.selected)?.value;
          }

          if ((!_.isUndefined(selectedVal) && !_.isArray(selectedVal)) || (_.isArray(selectedVal) && selectedVal.length != 0)) {
            onChange?.(selectedVal);
          }
          setFinalOptions([res || [], false]);
        }
      });
    return () => umounted = true;
  }, [optionsReloadBasis]);

  /* Apply filter if any */
  const filteredOptions = (controlProps.filter?.(finalOptions)) || finalOptions;
  const flatFiltered = flattenSelectOptions(filteredOptions);
  let realValue = getRealValue(flatFiltered, value, controlProps.creatable, controlProps.formatter);
  if (realValue && _.isPlainObject(realValue) && _.isUndefined(realValue.value)) {
    console.error('Undefined option value not allowed', realValue, filteredOptions);
  }
  const otherProps = {
    isSearchable: !readonly,
    isClearable: !readonly && (!_.isUndefined(controlProps.allowClear) ? controlProps.allowClear : true),
    isDisabled: Boolean(disabled),
  };

  const styles = customReactSelectStyles(theme, readonly || disabled);

  const onChangeOption = useCallback((selectVal) => {
    if (_.isArray(selectVal)) {
      // Check if select all option is selected
      if (!_.isUndefined(selectVal.find(x => x.label === '<Select All>'))) {
        selectVal = filteredOptions;
      }
      /* If multi select options need to be in some format by UI, use formatter */
      if (controlProps.formatter) {
        selectVal = controlProps.formatter.toRaw(selectVal, filteredOptions);
      } else {
        selectVal = selectVal.map((option) => option.value);
      }
      onChange?.(selectVal);
    } else {
      onChange?.(selectVal ? selectVal.value : null);
    }
  }, [onChange, filteredOptions]);

  const commonProps = {
    components: {
      Option: CustomSelectOption,
      SingleValue: CustomSelectSingleValue,
      IndicatorSeparator: controlProps.noDropdown ? null: RSComponents.IndicatorSeparator,
      DropdownIndicator: controlProps.noDropdown ? null: RSComponents.DropdownIndicator,
      Input: CustomSelectInput,
    },
    isMulti: Boolean(controlProps.multiple),
    openMenuOnClick: !readonly,
    onChange: onChangeOption,
    isLoading: isLoading,
    options: controlProps.allowSelectAll ? [{ label: gettext('<Select All>'), value: '*' }, ...filteredOptions] : filteredOptions,
    value: realValue,
    menuPortalTarget: document.body,
    styles: styles,
    inputId: cid,
    placeholder: (readonly || disabled) ? '' : controlProps.placeholder || gettext('Select an item...'),
    maxLength: controlProps.maxLength,
    ...otherProps,
    ...props,
  };
  const selectValue = useMemo(()=>{
    if(_.isArray(realValue)) {
      return realValue.map((o)=>o?.label)?.join(',');
    }
    return realValue?.label;
  }, [realValue]);
  if (!controlProps.creatable) {
    return (
      <>
        <Select ref={ref} {...commonProps} />
        {helpid && <input data-testid="select-value" style={{display: 'none'}} defaultValue={selectValue} id={cid} aria-describedby={helpid} />}
      </>
    );
  } else {
    return (
      <>
        <CreatableSelect
          ref={ref}
          {...commonProps}
          noOptionsMessage={() =>
            !controlProps.noDropdown ? 'No options' : null
          }
        />
        {helpid && <input data-testid="select-value" style={{display: 'none'}} defaultValue={selectValue} id={cid} aria-describedby={helpid} />}
      </>
    );
  }
});
InputSelect.displayName = 'InputSelect';
InputSelect.propTypes = {
  cid: PropTypes.string,
  helpid: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array, PropTypes.bool]),
  options: PropTypes.oneOfType([PropTypes.array, PropTypes.instanceOf(Promise), PropTypes.func]),
  controlProps: PropTypes.object,
  optionsLoaded: PropTypes.func,
  optionsReloadBasis: PropTypes.any,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  readonly: PropTypes.bool,
};


export function FormInputSelect({
  hasError, required, className, label, helpMessage, testcid, labelTooltip, ...props }) {
  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} labelTooltip={labelTooltip}>
      <InputSelect ref={props.inputRef} {...props} />
    </FormInput>
  );
}
FormInputSelect.propTypes = {
  hasError: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  inputRef: CustomPropTypes.ref,
  labelTooltip: PropTypes.string
};

const ColorButton = withColorPicker(PgIconButton);
export function InputColor({ value, controlProps, disabled, onChange, currObj }) {
  let btnStyles = { backgroundColor: value };
  return (
    <Root>
      <ColorButton title={gettext('Select the color')} className='Form-colorBtn' style={btnStyles} disabled={disabled}
        icon={(_.isUndefined(value) || _.isNull(value) || value === '') && <CloseIcon data-label="CloseIcon" />} options={{
          ...controlProps,
          disabled: disabled
        }} onChange={onChange} value={value} currObj={currObj}
      />
    </Root>
  );
}
InputColor.propTypes = {
  value: PropTypes.string,
  controlProps: PropTypes.object,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  currObj: PropTypes.func,
};

export function FormInputColor({
  hasError, required, className, label, helpMessage, testcid, labelTooltip, ...props }) {

  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} labelTooltip={labelTooltip}>
      <InputColor {...props} />
    </FormInput>
  );
}
FormInputColor.propTypes = {
  hasError: PropTypes.bool,
  required: PropTypes.bool,
  className: CustomPropTypes.className,
  label: PropTypes.string,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  labelTooltip: PropTypes.string
};

export function PlainString({ controlProps, value }) {
  let finalValue = value;
  if (controlProps?.formatter) {
    finalValue = controlProps.formatter.fromRaw(finalValue);
  }
  return  <Root>
    <div className="Form-plainstring">{finalValue}</div>
  </Root>;
}
PlainString.propTypes = {
  controlProps: PropTypes.object,
  value: PropTypes.any,
};

export function FormNote({ text, className, controlProps }) {

  /* If raw, then remove the styles and icon */
  return (
    <Root>
      <Box className={className}>
        <Paper elevation={0} className={controlProps?.raw ? '' : 'Form-noteRoot'}>
          {!controlProps?.raw && <Box paddingRight="0.25rem"><DescriptionIcon fontSize="small" /></Box>}
          <Box>{HTMLReactParse(text || '')}</Box>
        </Paper>
      </Box>
    </Root>
  );
}
FormNote.propTypes = {
  text: PropTypes.string,
  className: CustomPropTypes.className,
  controlProps: PropTypes.object,
};


const StyledBox = styled(Box)(({theme}) => ({
  padding: theme.spacing(0.5),
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 10,
}));

/* The form footer used mostly for showing error */
export function FormFooterMessage({style, ...props}) {
  if (!props.message) {
    return <></>;
  }
  return (
    <StyledBox style={style}>
      <NotifierMessage {...props}></NotifierMessage>
    </StyledBox>
  );
}

FormFooterMessage.propTypes = {
  style: PropTypes.object,
  message: PropTypes.string,
};

const StyledFormInput = styled(FormInput)(() => ({
  '&.FormInput-customRow': {
    paddingTop: 5
  }
}));

export function FormInputKeyboardShortcut({ hasError, label, className, helpMessage, onChange, labelTooltip, ...props }) {
  return (
    <StyledFormInput label={label} error={hasError} className={'FormInput-customRow ' + className} helpMessage={helpMessage} labelTooltip={labelTooltip}>
      <KeyboardShortcuts onChange={onChange} {...props} />
    </StyledFormInput>

  );
}
FormInputKeyboardShortcut.propTypes = {
  hasError: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  onChange: PropTypes.func,
  labelTooltip: PropTypes.string
};

export function FormInputQueryThreshold({ hasError, label, className, helpMessage, testcid, onChange, labelTooltip, ...props }) {
  const cid = _.uniqueId('c');
  const helpid = `h${cid}`;
  return (
    <FormInput label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} labelTooltip={labelTooltip}>
      <QueryThresholds cid={cid} helpid={helpid} onChange={onChange} {...props} />
    </FormInput>

  );
}
FormInputQueryThreshold.propTypes = {
  hasError: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  onChange: PropTypes.func,
  labelTooltip: PropTypes.string
};


export function FormInputSelectThemes({ hasError, label, className, helpMessage, testcid, onChange, labelTooltip, ...props }) {
  const cid = _.uniqueId('c');
  const helpid = `h${cid}`;
  return (
    <FormInput label={label} error={hasError} className={className}  testcid={testcid} labelTooltip={labelTooltip}>
      <SelectThemes cid={cid} helpid={helpid} helpMessage={helpMessage} onChange={onChange} {...props} />
    </FormInput>
  );
}

FormInputSelectThemes.propTypes = {
  hasError: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  testcid: PropTypes.string,
  onChange: PropTypes.func,
  labelTooltip: PropTypes.string
};

const StyledNotifierMessageBox = styled(Box)(({theme}) => ({
  borderWidth: '1px',
  borderStyle: 'solid',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(0.5),
  display: 'flex',
  alignItems: 'center',
  minHeight: '36px',
  '&.FormFooter-containerError': {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.error.light,
    '& .FormFooter-iconError': {
      color: theme.palette.error.main,
    },
  },
  '&.FormFooter-containerSuccess': {
    borderColor: theme.palette.success.main,
    backgroundColor: theme.palette.success.light,
    '& .FormFooter-iconSuccess': {
      color: theme.palette.success.main,
    },
  },
  '&.FormFooter-containerInfo': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light,
    '& .FormFooter-iconInfo': {
      color: theme.palette.primary.main,
    },
  },
  '&.FormFooter-containerWarning': {
    borderColor: theme.palette.warning.main,
    backgroundColor: theme.palette.warning.light,
    '& .FormFooter-iconWarning': {
      color: theme.palette.warning.main,
    },
  },
  '& .FormFooter-message': {
    color: theme.palette.text.primary,
    marginLeft: theme.spacing(0.5),
  },
  '& .FormFooter-messageCenter': {
    color: theme.palette.text.primary,
    margin: 'auto',
  },
  '& .FormFooter-closeButton': {
    marginLeft: 'auto',
  },
}));

export function NotifierMessage({
  type = MESSAGE_TYPE.SUCCESS, message, style, closable = true, showIcon=true, textCenter=false,
  onClose = () => {/*This is intentional (SonarQube)*/ }}) {
  return (
    <StyledNotifierMessageBox className={`FormFooter-container${type}`} style={style} data-test="notifier-message">
      {showIcon && <FormIcon type={type} className={`FormFooter-icon${type}`} />}
      <Box className={textCenter ? 'FormFooter-messageCenter' : 'FormFooter-message'}>{HTMLReactParse(message || '')}</Box>
      {closable && <IconButton title={gettext('Close Message')} className={'FormFooter-closeButton ' + `FormFooter-icon${type}`} onClick={onClose}>
        <FormIcon close={true} />
      </IconButton>}
    </StyledNotifierMessageBox>
  );
}

NotifierMessage.propTypes = {
  type: PropTypes.oneOf(Object.values(MESSAGE_TYPE)).isRequired,
  message: PropTypes.string,
  closable: PropTypes.bool,
  showIcon: PropTypes.bool,
  textCenter: PropTypes.bool,
  onClose: PropTypes.func,
  style: PropTypes.object,
};


export function FormButton({required, label,
  className, helpMessage, onClick, disabled, ...props }) {
  return (
    <FormInput required={required} label={label} className={className}  helpMessage={helpMessage}>
      <PrimaryButton onClick={onClick} disabled={disabled} >{gettext(props.btnName)}</PrimaryButton>
    </FormInput>
  );
}
FormButton.propTypes = {
  required: PropTypes.bool,
  label: PropTypes.string,
  className: CustomPropTypes.className,
  helpMessage: PropTypes.string,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  btnName: PropTypes.string
};

export function InputTree({hasCheckbox, treeData, onChange, ...props}){
  const [[finalData, isLoading], setFinalData] = useState([[], true]);

  useEffect(() => {
    let tdata = treeData, umounted = false;
    if (typeof treeData === 'function') {
      tdata = treeData();
    }
    setFinalData([[], true]);
    Promise.resolve(tdata)
      .then((res) => {
        if(!umounted){
          setFinalData([res, false]);
        }
      });
    return () => umounted = true;
  }, []);
  return <>{isLoading ? <Loader message={gettext('Loading')}></Loader> : <PgTreeView data={finalData} hasCheckbox={hasCheckbox} selectionChange={onChange} {...props}></PgTreeView>}</>;
}

InputTree.propTypes = {
  hasCheckbox: PropTypes.bool,
  treeData: PropTypes.oneOfType([PropTypes.array, PropTypes.instanceOf(Promise), PropTypes.func]),
  onChange: PropTypes.func,
  selectionChange: PropTypes.func,
};
