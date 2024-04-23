/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import DataGridView, { DataGridHeader } from '../SchemaView/DataGridView';
import SchemaView, { SCHEMA_STATE_ACTIONS } from '../SchemaView';
import { DefaultButton } from '../components/Buttons';
import { evalFunc } from '../utils';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import _ from 'lodash';

const StyledBox = styled(Box)(({theme}) => ({
  '& .DataGridViewWithHeaderForm-border': {
    ...theme.mixins.panelBorder,
    borderBottom: 0,
    '& .DataGridViewWithHeaderForm-body': {
      padding: '0.25rem',
      '& .DataGridViewWithHeaderForm-addBtn': {
        marginLeft: 'auto',
      }
    },
  },
}));

export default function DataGridViewWithHeaderForm(props) {
  let {containerClassName, headerSchema, headerVisible, ...otherProps} = props;

  const headerFormData = useRef({});
  const schemaRef = useRef(otherProps.schema);
  const [addDisabled, setAddDisabled] = useState(true);
  const [headerFormResetKey, setHeaderFormResetKey] = useState(0);
  const onAddClick = useCallback(()=>{
    if(!otherProps.canAddRow) {
      return;
    }

    let newRow = headerSchema.getNewData(headerFormData.current);
    otherProps.dataDispatch({
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: otherProps.accessPath,
      value: newRow,
    });
    setHeaderFormResetKey((preVal)=>preVal+1);
  }, []);

  useEffect(()=>{
    headerSchema.top = schemaRef.current.top;
  }, []);

  let state = schemaRef.current.top ? _.get(schemaRef.current.top.sessData, _.slice(otherProps.accessPath, 0, -1))
    : _.get(schemaRef.current.sessData);

  headerVisible = headerVisible && evalFunc(null, headerVisible, state);
  return (
    <StyledBox className={containerClassName}>
      <Box className='DataGridViewWithHeaderForm-border'>
        {props.label && <DataGridHeader label={props.label} />}
        {headerVisible && <Box className='DataGridViewWithHeaderForm-body'>
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
            resetKey={headerFormResetKey}
          />
          <Box display="flex">
            <DefaultButton className='DataGridViewWithHeaderForm-addBtn' onClick={onAddClick} disabled={addDisabled}>Add</DefaultButton>
          </Box>
        </Box>}
      </Box>
      <DataGridView {...otherProps} label="" canAdd={false}/>
    </StyledBox>
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
