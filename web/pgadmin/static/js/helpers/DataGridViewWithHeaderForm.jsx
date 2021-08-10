import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, makeStyles } from '@material-ui/core';
import DataGridView, { DataGridHeader } from '../SchemaView/DataGridView';
import SchemaView, { SCHEMA_STATE_ACTIONS } from '../SchemaView';
import { DefaultButton } from '../components/Buttons';
import { evalFunc } from '../utils';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

const useStyles = makeStyles((theme)=>({
  formBorder: {
    ...theme.mixins.panelBorder,
    borderBottom: 0,
  },
  form: {
    padding: '0.25rem',
  },
  addBtn: {
    marginLeft: 'auto',
  }
}));

export default function DataGridViewWithHeaderForm(props) {
  let {containerClassName, headerSchema, headerVisible, ...otherProps} = props;
  const classes = useStyles();
  const headerFormData = useRef({});
  const schemaRef = useRef(otherProps.schema);
  const [isAddDisabled, setAddDisabled] = useState(true);

  const onAddClick = useCallback(()=>{
    if(otherProps.canAddRow) {
      let state = schemaRef.current.top ? schemaRef.current.top.sessData : schemaRef.current.sessData;
      let canAddRow = evalFunc(schemaRef.current, otherProps.canAddRow, state || {});
      if(!canAddRow) {
        return;
      }
    }

    let newRow = headerSchema.getNewData(headerFormData.current);
    otherProps.dataDispatch({
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: otherProps.accessPath,
      value: newRow,
    });
  }, []);

  useEffect(()=>{
    headerSchema.top = schemaRef.current.top;
  }, []);

  let state = schemaRef.current.top ? schemaRef.current.top.origData : schemaRef.current.origData;
  headerVisible = headerVisible && evalFunc(null, headerVisible, state);
  return (
    <Box className={containerClassName}>
      <Box className={classes.formBorder}>
        <DataGridHeader label={props.label} />
        {headerVisible && <Box className={classes.form}>
          <SchemaView
            formType={'dialog'}
            getInitData={()=>Promise.resolve({})}
            schema={headerSchema}
            viewHelperProps={props.viewHelperProps}
            showFooter={false}
            onDataChange={(isDataChanged, dataChanged)=>{
              headerFormData.current = dataChanged;
              setAddDisabled(headerSchema.addDisabled(headerFormData.current));
            }}
            hasSQL={false}
            isTabView={false}
          />
          <Box display="flex">
            <DefaultButton className={classes.addBtn} onClick={onAddClick} disabled={isAddDisabled}>Add</DefaultButton>
          </Box>
        </Box>}
      </Box>
      <DataGridView {...otherProps} label="" canAdd={false}/>
    </Box>
  );
}

DataGridViewWithHeaderForm.propTypes = {
  label: PropTypes.string,
  value: PropTypes.array,
  viewHelperProps: PropTypes.object,
  formErr: PropTypes.object,
  headerSchema: CustomPropTypes.schemaUI.isRequired,
  headerVisible: PropTypes.func,
  schema: CustomPropTypes.schemaUI,
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func.isRequired,
  containerClassName: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
};
