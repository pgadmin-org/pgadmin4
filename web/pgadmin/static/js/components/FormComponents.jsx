/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
/* Common form components used in pgAdmin */

import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box, FormControl, OutlinedInput, FormHelperText,
  Grid, IconButton, FormControlLabel, Switch, Checkbox, useTheme, InputLabel, Paper } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import ErrorRoundedIcon from '@material-ui/icons/ErrorOutlineRounded';
import InfoRoundedIcon from '@material-ui/icons/InfoRounded';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import WarningRoundedIcon from '@material-ui/icons/WarningRounded';
import FolderOpenRoundedIcon from '@material-ui/icons/FolderOpenRounded';
import DescriptionIcon from '@material-ui/icons/Description';
import Select, {components as RSComponents} from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Pickr from '@simonwep/pickr';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import HTMLReactParse from 'html-react-parser';
import { KeyboardDateTimePicker, KeyboardDatePicker, KeyboardTimePicker, MuiPickersUtilsProvider} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import * as DateFns from 'date-fns';

import CodeMirror from './CodeMirror';
import gettext from 'sources/gettext';
import { showFileDialog } from '../helpers/legacyConnector';
import _ from 'lodash';
import { DefaultButton, PrimaryButton, PgIconButton } from './Buttons';
import CustomPropTypes from '../custom_prop_types';


const useStyles = makeStyles((theme) => ({
  formRoot: {
    padding: '1rem'
  },
  img: {
    maxWidth: '100%',
    height: 'auto'
  },
  info: {
    color: theme.palette.info.main,
    marginLeft: '0.25rem',
    fontSize: '1rem',
  },
  formLabel: {
    margin: theme.spacing(0.75, 0.75, 0.75, 0.75),
    display: 'flex',
  },
  formLabelError:  {
    color: theme.palette.error.main,
  },
  sql: {
    border: '1px solid ' + theme.otherVars.inputBorderColor,
    borderRadius: theme.shape.borderRadius,
    height: '100%',
  },
  optionIcon: {
    ...theme.mixins.nodeIcon,
  },
  colorBtn: {
    height: theme.spacing(3.5),
    minHeight: theme.spacing(3.5),
    width: theme.spacing(3.5),
    minWidth: theme.spacing(3.5),
  },
  noteRoot: {
    display: 'flex',
    backgroundColor: theme.otherVars.borderColor,
    padding: theme.spacing(1),
  },
  readOnlySwitch: {
    opacity: 0.75,
    '& .MuiSwitch-track': {
      opacity: theme.palette.action.disabledOpacity,
    }
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
function FormIcon({type, close=false, ...props}) {
  let TheIcon = null;
  if(close) {
    TheIcon = CloseIcon;
  } else if(type === MESSAGE_TYPE.SUCCESS) {
    TheIcon = CheckRoundedIcon;
  } else if(type === MESSAGE_TYPE.ERROR) {
    TheIcon = ErrorRoundedIcon;
  } else if(type === MESSAGE_TYPE.INFO) {
    TheIcon = InfoRoundedIcon;
  } else if(type === MESSAGE_TYPE.WARNING) {
    TheIcon = WarningRoundedIcon;
  }

  return <TheIcon fontSize="small" {...props} />;
}
FormIcon.propTypes = {
  type: PropTypes.oneOf(Object.values(MESSAGE_TYPE)),
  close: PropTypes.bool,
};

/* Wrapper on any form component to add label, error indicator and help message */
export function FormInput({children, error, className, label, helpMessage, required, testcid}) {
  const classes = useStyles();
  const cid = testcid || _.uniqueId('c');
  const helpid = `h${cid}`;
  return (
    <Grid container spacing={0} className={className}>
      <Grid item lg={3} md={3} sm={3} xs={12}>
        <InputLabel htmlFor={cid} className={clsx(classes.formLabel, error?classes.formLabelError : null)} required={required}>
          {label}
          <FormIcon type={MESSAGE_TYPE.ERROR} style={{marginLeft: 'auto', visibility: error ? 'unset' : 'hidden'}}/>
        </InputLabel>
      </Grid>
      <Grid item lg={9} md={9} sm={9} xs={12}>
        <FormControl error={Boolean(error)} fullWidth>
          {React.cloneElement(children, {cid, helpid})}
        </FormControl>
        <FormHelperText id={helpid} variant="outlined">{HTMLReactParse(helpMessage || '')}</FormHelperText>
      </Grid>
    </Grid>
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
};

export function InputSQL({value, options, onChange, className, ...props}) {
  const classes = useStyles();
  const editor = useRef();

  return (
    <CodeMirror
      currEditor={(obj)=>editor.current=obj}
      value={value||''}
      options={{
        lineNumbers: true,
        mode: 'text/x-pgsql',
        ...options,
      }}
      className={clsx(classes.sql, className)}
      events={{
        change: (cm)=>{
          onChange && onChange(cm.getValue());
        },
      }}
      {...props}
    />
  );
}
InputSQL.propTypes = {
  value: PropTypes.string,
  options: PropTypes.object,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
  className: CustomPropTypes.className,
};

export function FormInputSQL({hasError, required, label, className, helpMessage, testcid, value, controlProps, noLabel, ...props}) {
  if(noLabel) {
    return <InputSQL value={value} options={controlProps} {...props}/>;
  } else {
    return (
      <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid} >
        <InputSQL value={value} options={controlProps} {...props}/>
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

export function InputDateTimePicker({value, onChange, readonly, controlProps, ...props}) {
  let format = '';
  let placeholder = '';
  if (controlProps?.pickerType === 'Date') {
    format = controlProps.format || DATE_TIME_FORMAT.DATE;
    placeholder = controlProps.placeholder || 'YYYY-MM-DD';
  } else if (controlProps?.pickerType === 'Time') {
    format = controlProps.format || (controlProps.ampm ? DATE_TIME_FORMAT.TIME_12 : DATE_TIME_FORMAT.TIME_24);
    placeholder = controlProps.placeholder || 'HH:mm:ss';
  } else {
    format = controlProps.format || (controlProps.ampm ? DATE_TIME_FORMAT.DATE_TIME_12 : DATE_TIME_FORMAT.DATE_TIME_24);
    placeholder = controlProps.placeholder || 'YYYY-MM-DD HH:mm:ss Z';
  }

  const handleChange = (dateVal, stringVal)=> {
    onChange(stringVal);
  };

  /* Value should be a date object instead of string */
  value = _.isUndefined(value) ? null : value;
  if(!_.isNull(value)) {
    let parseValue = DateFns.parse(value, format, new Date());
    if(!DateFns.isValid(parseValue)) {
      parseValue = DateFns.parseISO(value);
    }
    value = !DateFns.isValid(parseValue) ? value : parseValue;
  }

  if (readonly) {
    return (<InputText value={value ? DateFns.format(value, format) : value}
      readonly={readonly} controlProps={{placeholder: controlProps.placeholder}} {...props}/>);
  }

  let commonProps = {
    ...props,
    value: value,
    format: format,
    placeholder: placeholder,
    label: '',
    variant: 'inline',
    readOnly: Boolean(readonly),
    autoOk: controlProps.autoOk || false,
    ampm: controlProps.ampm || false,
    disablePast: controlProps.disablePast || false,
    invalidDateMessage: '',
    maxDateMessage: '',
    minDateMessage: '',
    onChange: handleChange,
    fullWidth: true,
  };

  if (controlProps?.pickerType === 'Date') {
    return (
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <KeyboardDatePicker {...commonProps}/>
      </MuiPickersUtilsProvider>
    );
  } else if (controlProps?.pickerType === 'Time') {
    return (
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <KeyboardTimePicker {...commonProps}/>
      </MuiPickersUtilsProvider>
    );
  }

  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <KeyboardDateTimePicker {...commonProps}/>
    </MuiPickersUtilsProvider>
  );
}
InputDateTimePicker.propTypes = {
  value: PropTypes.string,
  options: PropTypes.object,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
  controlProps: PropTypes.object,
};

export function FormInputDateTimePicker({hasError, required, label, className, helpMessage, testcid, ...props}) {
  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid}>
      <InputDateTimePicker {...props}/>
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
  value: PropTypes.string,
  controlProps: PropTypes.object,
  change: PropTypes.func,
};

/* Use forwardRef to pass ref prop to OutlinedInput */
export const InputText = forwardRef(({
  cid, helpid, readonly, disabled, maxlength=255, value, onChange, controlProps, type, ...props}, ref)=>{

  const classes = useStyles();
  const patterns = {
    'numeric': '^-?[0-9]\\d*\\.?\\d*$',
    'int': '^-?[0-9]\\d*$',
  };
  let onChangeFinal = (e)=>{
    let changeVal = e.target.value;

    /* For type number, we set type as tel with number regex to get validity.*/
    if(['numeric', 'int', 'tel'].indexOf(type) > -1) {
      if(!e.target.validity.valid && changeVal !== '' && changeVal !== '-') {
        return;
      }
    }
    if(controlProps?.formatter) {
      changeVal = controlProps.formatter.toRaw(changeVal);
    }
    onChange && onChange(changeVal);
  };

  let finalValue = (_.isNull(value) || _.isUndefined(value)) ? '' : value;

  if(controlProps?.formatter) {
    finalValue = controlProps.formatter.fromRaw(finalValue);
  }

  return(
    <OutlinedInput
      ref={ref}
      color="primary"
      fullWidth
      className={classes.formInput}
      inputProps={{
        id: cid,
        maxLength: controlProps?.multiline ? null : maxlength,
        'aria-describedby': helpid,
        ...(type ? {pattern: !_.isUndefined(controlProps) && !_.isUndefined(controlProps.pattern) ? controlProps.pattern : patterns[type]} : {})
      }}
      readOnly={Boolean(readonly)}
      disabled={Boolean(disabled)}
      rows={4}
      notched={false}
      value={(_.isNull(finalValue) || _.isUndefined(finalValue)) ? '' : finalValue}
      onChange={onChangeFinal}
      {...controlProps}
      {...props}
      {...(['numeric', 'int'].indexOf(type) > -1 ? {type: 'tel'} : {type: type})}
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
  maxlength: PropTypes.number,
  value: PropTypes.any,
  onChange: PropTypes.func,
  controlProps: PropTypes.object,
  type: PropTypes.string,
};

export function FormInputText({hasError, required, label, className, helpMessage, testcid, ...props}) {
  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid}>
      <InputText label={label} {...props}/>
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
};

/* Using the existing file dialog functions using showFileDialog */
export function InputFileSelect({controlProps, onChange, disabled, readonly, ...props}) {
  const inpRef = useRef();
  const onFileSelect = (value)=>{
    onChange && onChange(decodeURI(value));
    inpRef.current.focus();
  };
  return (
    <InputText ref={inpRef} disabled={disabled} readonly={readonly} onChange={onChange} {...props} endAdornment={
      <IconButton onClick={()=>showFileDialog(controlProps, onFileSelect)}
        disabled={disabled||readonly} aria-label={gettext('Select a file')}><FolderOpenRoundedIcon /></IconButton>
    } />
  );
}
InputFileSelect.propTypes = {
  controlProps: PropTypes.object,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  readonly: PropTypes.bool,
};

export function FormInputFileSelect({
  hasError, required, label, className, helpMessage, testcid, ...props}) {

  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid}>
      <InputFileSelect required={required} label={label} {...props}/>
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
};

export function InputSwitch({cid, helpid, value, onChange, readonly, controlProps, ...props}) {
  const classes = useStyles();
  return (
    <Switch color="primary"
      checked={Boolean(value)}
      onChange={
        readonly ? ()=>{} : onChange
      }
      id={cid}
      inputProps={{
        'aria-describedby': helpid,
      }}
      {...controlProps}
      {...props}
      className={(readonly || props.disabled) ? classes.readOnlySwitch : null}
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

export function FormInputSwitch({hasError, required, label, className, helpMessage, testcid, ...props}) {

  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid}>
      <InputSwitch {...props}/>
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
};

export function InputCheckbox({cid, helpid, value, onChange, controlProps, readonly, ...props}) {
  controlProps = controlProps || {};
  return (
    <FormControlLabel
      control={
        <Checkbox
          id={cid}
          checked={Boolean(value)}
          onChange={readonly ? ()=>{} : onChange}
          color="primary"
          inputProps={{'aria-describedby': helpid}}
          {...props}/>
      }
      label={controlProps.label}
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
};

export function FormInputCheckbox({hasError, required, label,
  className, helpMessage, testcid, ...props}) {

  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid}>
      <InputCheckbox {...props}/>
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
};


export function InputToggle({cid, value, onChange, options, disabled, readonly, ...props}) {
  return (
    <ToggleButtonGroup
      id={cid}
      value={value}
      exclusive
      onChange={(e, val)=>{val!==null && onChange(val);}}
      {...props}
    >
      {
        (options||[]).map((option)=>{
          const isSelected = option.value === value;
          const isDisabled = disabled || option.disabled || (readonly && !isSelected);
          return (
            <ToggleButton key={option.label} value={option.value} component={isSelected ? PrimaryButton : DefaultButton}
              disabled={isDisabled} aria-label={option.label}>
              <CheckRoundedIcon style={{visibility: isSelected ? 'visible': 'hidden'}}/>&nbsp;{option.label}
            </ToggleButton>
          );
        })
      }
    </ToggleButtonGroup>
  );
}
InputToggle.propTypes = {
  cid: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  options: PropTypes.array,
  controlProps: PropTypes.object,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  readonly: PropTypes.bool,
};

export function FormInputToggle({hasError, required, label,
  className, helpMessage, testcid, ...props}) {

  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid}>
      <InputToggle {...props}/>
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
};

/* react-select package is used for select input
 * Customizing the select styles to fit existing theme
 */
const customReactSelectStyles = (theme, readonly)=>({
  input: (provided) => {
    return {...provided, padding: 0, margin: 0, color: 'inherit'};
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
      boxShadow: 'inset 0 0 0 1px '+theme.palette.primary.main,
      '&:hover': {
        borderColor: theme.palette.primary.main,
      }
    } : {}),
  }),
  dropdownIndicator: (provided)=>({
    ...provided,
    padding: '0rem 0.25rem',
  }),
  indicatorsContainer: (provided)=>({
    ...provided,
    ...(readonly ? {display: 'none'} : {})
  }),
  clearIndicator: (provided)=>({
    ...provided,
    padding: '0rem 0.25rem',
  }),
  valueContainer: (provided)=>({
    ...provided,
    padding: theme.otherVars.reactSelect.padding,
  }),
  menu: (provided)=>({
    ...provided,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    boxShadow: 'none',
    border: '1px solid ' + theme.otherVars.inputBorderColor,
    marginTop: '2px',
  }),
  menuPortal: (provided)=>({
    ...provided, zIndex: 9999,
    backgroundColor: 'inherit',
    color: 'inherit',
  }),
  option: (provided, state)=>{
    return {
      ...provided,
      padding: '0.5rem',
      color: 'inherit',
      backgroundColor: state.isFocused ?
        theme.palette.grey[400] : (state.isSelected ?
          theme.palette.primary.light : 'inherit'),
    };
  },
  multiValue: (provided)=>({
    ...provided,
    backgroundColor: theme.palette.grey[400],
  }),
  multiValueLabel: (provided)=>({
    ...provided,
    fontSize: '1em',
    zIndex: 99,
    color: theme.palette.text.primary
  }),
  multiValueRemove: (provided)=>({
    ...provided,
    '&:hover': {
      backgroundColor: 'unset',
      color: theme.palette.error.main,
    },
    ...(readonly ? {display: 'none'} : {})
  }),
});

function OptionView({image, label}) {
  const classes = useStyles();
  return (
    <>
      {image && <span className={clsx(classes.optionIcon, image)}></span>}
      <span>{label}</span>
    </>
  );
}
OptionView.propTypes = {
  image: PropTypes.string,
  label: PropTypes.string,
};

function CustomSelectOption(props) {
  return (
    <RSComponents.Option {...props}>
      <OptionView image={props.data.image} label={props.data.label} />
    </RSComponents.Option>
  );
}
CustomSelectOption.propTypes = {
  data: PropTypes.object,
};

function CustomSelectSingleValue(props) {
  return (
    <RSComponents.SingleValue {...props}>
      <OptionView image={props.data.image} label={props.data.label} />
    </RSComponents.SingleValue>
  );
}
CustomSelectSingleValue.propTypes = {
  data: PropTypes.object,
};

function getRealValue(options, value, creatable, formatter) {
  let realValue = null;
  if(_.isArray(value)) {
    realValue = [...value];
    /* If multi select options need to be in some format by UI, use formatter */
    if(formatter) {
      realValue = formatter.fromRaw(realValue, options);
    } else {
      if(creatable) {
        realValue = realValue.map((val)=>({label:val, value: val}));
      } else {
        realValue = realValue.map((val)=>(_.find(options, (option)=>_.isEqual(option.value, val))));
      }
    }
  } else {
    realValue = _.find(options, (option)=>option.value==value) ||
        (creatable && !_.isUndefined(value) && !_.isNull(value) ? {label:value, value: value} : null);
  }
  return realValue;
}

export function InputSelect({
  cid, onChange, options, readonly=false, value, controlProps={}, optionsLoaded, optionsReloadBasis, disabled, ...props}) {
  const [[finalOptions, isLoading], setFinalOptions] = useState([[], true]);
  const theme = useTheme();

  /* React will always take options var as changed parameter. So,
  We cannot run the below effect with options dependency as it will keep on
  loading the options. optionsReloadBasis is helpful to avoid repeated
  options load. If optionsReloadBasis value changes, then options will be loaded again.
  */
  useEffect(()=>{
    let optPromise = options, umounted=false;
    if(typeof options === 'function') {
      optPromise = options();
    }
    Promise.resolve(optPromise)
      .then((res)=>{
        /* If component unmounted, dont update state */
        if(!umounted) {
          optionsLoaded && optionsLoaded(res, value);
          setFinalOptions([res || [], false]);
        }
      });
    return ()=>umounted=true;
  }, [optionsReloadBasis]);


  /* Apply filter if any */
  const filteredOptions = (controlProps.filter && controlProps.filter(finalOptions)) || finalOptions;
  let realValue = getRealValue(filteredOptions, value, controlProps.creatable, controlProps.formatter);
  if(realValue && _.isPlainObject(realValue) && _.isUndefined(realValue.value)) {
    console.error('Undefined option value not allowed', realValue, filteredOptions);
  }
  const otherProps = {
    isSearchable: !readonly,
    isClearable: !readonly && (!_.isUndefined(controlProps.allowClear) ? controlProps.allowClear : true),
    isDisabled: Boolean(disabled),
  };

  const styles = customReactSelectStyles(theme, readonly || disabled);

  const onChangeOption = useCallback((selectVal, action)=>{
    if(_.isArray(selectVal)) {
      // Check if select all option is selected
      if (!_.isUndefined(selectVal.find(x => x.label === 'Select All'))) {
        selectVal = filteredOptions;
      }
      /* If multi select options need to be in some format by UI, use formatter */
      if(controlProps.formatter) {
        selectVal = controlProps.formatter.toRaw(selectVal, filteredOptions);
      } else {
        selectVal = selectVal.map((option)=>option.value);
      }
      onChange && onChange(selectVal, action.name);
    } else {
      onChange && onChange(selectVal ? selectVal.value : null, action.name);
    }
  }, [onChange, filteredOptions]);

  const commonProps = {
    components: {
      Option: CustomSelectOption,
      SingleValue: CustomSelectSingleValue,
    },
    isMulti: Boolean(controlProps.multiple),
    openMenuOnClick: !readonly,
    onChange: onChangeOption,
    isLoading: isLoading,
    options: controlProps.allowSelectAll ? [{ label: gettext('Select All'), value: '*' }, ...filteredOptions] : filteredOptions,
    value: realValue,
    menuPortalTarget: document.body,
    styles: styles,
    inputId: cid,
    placeholder: (readonly || disabled) ? '' : controlProps.placeholder || gettext('Select an item...'),
    ...otherProps,
    ...props
  };
  if(!controlProps.creatable) {
    return (
      <Select {...commonProps}/>
    );
  } else {
    return (
      <CreatableSelect {...commonProps}/>
    );
  }
}
InputSelect.propTypes = {
  cid: PropTypes.string,
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
  hasError, required, className, label, helpMessage, testcid, ...props}) {

  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid}>
      <InputSelect {...props}/>
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
};

/* React wrapper on color pickr */
export function InputColor({value, controlProps, disabled, onChange, currObj}) {
  const pickrOptions = {
    showPalette: true,
    allowEmpty: true,
    colorFormat: 'HEX',
    defaultColor: null,
    position: 'right-middle',
    clearText: gettext('No color'),
    ...controlProps,
    disabled: disabled,
  };
  const eleRef = useRef();
  const pickrObj = useRef();
  const classes = useStyles();

  const setColor = (value)=>{
    pickrObj.current &&
      pickrObj.current.setColor((_.isUndefined(value) || value == '') ? pickrOptions.defaultColor : value);
  };

  const destroyPickr = ()=>{
    if(pickrObj.current) {
      pickrObj.current.destroy();
      pickrObj.current = null;
    }
  };

  const initPickr = ()=>{
    /* pickr does not have way to update options, need to
    destroy and recreate pickr to reflect options */
    destroyPickr();

    pickrObj.current = new Pickr({
      el: eleRef.current,
      useAsButton: true,
      theme: 'monolith',
      swatches: [
        '#000', '#666', '#ccc', '#fff', '#f90', '#ff0', '#0f0',
        '#f0f', '#f4cccc', '#fce5cd', '#d0e0e3', '#cfe2f3', '#ead1dc', '#ea9999',
        '#b6d7a8', '#a2c4c9', '#d5a6bd', '#e06666','#93c47d', '#76a5af', '#c27ba0',
        '#f1c232', '#6aa84f', '#45818e', '#a64d79', '#bf9000', '#0c343d', '#4c1130',
      ],
      position: pickrOptions.position,
      strings: {
        clear: pickrOptions.clearText,
      },
      components: {
        palette: pickrOptions.showPalette,
        preview: true,
        hue: pickrOptions.showPalette,
        interaction: {
          clear: pickrOptions.allowEmpty,
          defaultRepresentation: pickrOptions.colorFormat,
          disabled: pickrOptions.disabled,
        },
      },
    }).on('init', instance => {
      setColor(value);
      disabled && instance.disable();

      const {lastColor} = instance.getRoot().preview;
      const {clear} = instance.getRoot().interaction;

      /* Cycle the keyboard navigation within the color picker */
      clear.addEventListener('keydown', (e)=>{
        if(e.keyCode === 9) {
          e.preventDefault();
          e.stopPropagation();
          lastColor.focus();
        }
      });

      lastColor.addEventListener('keydown', (e)=>{
        if(e.keyCode === 9 && e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          clear.focus();
        }
      });
    }).on('clear', () => {
      onChange && onChange('');
    }).on('change', (color) => {
      onChange && onChange(color.toHEXA().toString());
    }).on('show', (color, instance) => {
      const {palette} = instance.getRoot().palette;
      palette.focus();
    }).on('hide', (instance) => {
      const button = instance.getRoot().button;
      button.focus();
    });

    if(currObj) {
      currObj(pickrObj.current);
    }
  };

  useEffect(()=>{
    initPickr();
    return ()=>{
      destroyPickr();
    };
  }, [...Object.values(pickrOptions)]);

  useEffect(()=>{
    if(pickrObj.current) {
      setColor(value);
    }
  }, [value]);

  let btnStyles = {backgroundColor: value};
  return (
    <PgIconButton ref={eleRef} title={gettext('Select the color')} className={classes.colorBtn} style={btnStyles} disabled={pickrOptions.disabled}
      icon={(_.isUndefined(value) || _.isNull(value) || value === '') && <CloseIcon />}
    />
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
  hasError, required, className, label, helpMessage, testcid, ...props}) {

  return (
    <FormInput required={required} label={label} error={hasError} className={className} helpMessage={helpMessage} testcid={testcid}>
      <InputColor {...props}/>
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
};

export function PlainString({controlProps, value}) {
  let finalValue = value;
  if(controlProps?.formatter) {
    finalValue = controlProps.formatter.fromRaw(finalValue);
  }
  return <span>{finalValue}</span>;
}
PlainString.propTypes = {
  controlProps: PropTypes.object,
  value: PropTypes.any,
};

export function FormNote({text, className}) {
  const classes = useStyles();
  return (
    <Box className={className}>
      <Paper elevation={0} className={classes.noteRoot}>
        <Box paddingRight="0.25rem"><DescriptionIcon fontSize="small" /></Box>
        <Box>{HTMLReactParse(text || '')}</Box>
      </Paper>
    </Box>
  );
}
FormNote.propTypes = {
  text: PropTypes.string,
  className: CustomPropTypes.className,
};

const useStylesFormFooter = makeStyles((theme)=>({
  root: {
    padding: theme.spacing(0.5),
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  container: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
  },
  containerSuccess: {
    borderColor: theme.palette.success.main,
    backgroundColor: theme.palette.success.light,
  },
  iconSuccess: {
    color: theme.palette.success.main,
  },
  containerError: {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.error.light,
  },
  iconError: {
    color: theme.palette.error.main,
  },
  containerInfo: {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light,
  },
  iconInfo: {
    color: theme.palette.primary.main,
  },
  containerWarning: {
    borderColor: theme.palette.warning.main,
    backgroundColor: theme.palette.warning.light,
  },
  iconWarning: {
    color: theme.palette.warning.main,
  },
  message: {
    marginLeft: theme.spacing(0.5),
  },
  closeButton: {
    marginLeft: 'auto',
  },
}));

/* The form footer used mostly for showing error */
export function FormFooterMessage(props) {
  const classes = useStylesFormFooter();

  if(!props.message) {
    return <></>;
  }
  return (
    <Box className={classes.root}>
      <NotifierMessage {...props}></NotifierMessage>
    </Box>
  );
}

FormFooterMessage.propTypes = {
  message: PropTypes.string,
};

export function NotifierMessage({type=MESSAGE_TYPE.SUCCESS, message, closable=true, onClose=()=>{}}) {
  const classes = useStylesFormFooter();

  return (
    <Box className={clsx(classes.container, classes[`container${type}`])}>
      <FormIcon type={type} className={classes[`icon${type}`]}/>
      <Box className={classes.message}>{message}</Box>
      {closable && <IconButton className={clsx(classes.closeButton, classes[`icon${type}`])} onClick={onClose}>
        <FormIcon close={true}/>
      </IconButton>}
    </Box>
  );
}

NotifierMessage.propTypes = {
  type: PropTypes.oneOf(Object.values(MESSAGE_TYPE)).isRequired,
  message: PropTypes.string,
  closable: PropTypes.bool,
  onClose: PropTypes.func,
};
