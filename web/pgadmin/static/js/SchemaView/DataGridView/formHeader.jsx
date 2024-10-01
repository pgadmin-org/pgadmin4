/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, {
  useCallback, useContext, useEffect, useRef, useState
} from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';

import { SCHEMA_STATE_ACTIONS } from 'sources/SchemaView/SchemaState';
import { DefaultButton } from 'sources/components/Buttons';
import CustomPropTypes from 'sources/custom_prop_types';
import gettext from 'sources/gettext';
import { requestAnimationAndFocus } from 'sources/utils';

import { SchemaStateContext } from '../SchemaState';
import { booleanEvaluator, registerOptionEvaluator } from '../options';
import { View } from '../registry';

import { SearchBox, SEARCH_STATE_PATH } from './SearchBox';
import { DataGridContext } from './context';


// Register the 'headerFormVisible' options for the collection
registerOptionEvaluator(
  'headerFormVisible', booleanEvaluator, false, ['collection']
);

const StyledBox = styled(Box)(({theme}) => ({
  '& .DataGridFormHeader-border': {
    ...theme.mixins.panelBorder,
    borderBottom: 0,
    '& .DataGridFormHeader-gridHeader': {
      display: 'flex',
      flexWrap: 'wrap',
    },
    '& .DataGridView-gridHeaderText': {
      padding: theme.spacing(0.5, 1),
      fontWeight: theme.typography.fontWeightBold,
    },
    '& .DataGridFormHeader-gridHeader-search': {
      flex: 1,
      padding: 0,
      display: 'flex',
    },
    '& .DataGridFormHeader-body': {
      padding: '0',
      backgroundColor: theme.palette.grey[400],
      '& .FormView-singleCollectionPanel': {
        paddingBottom: 0,
      },
      '& .DataGridFormHeader-btn-group' :{
        display: 'flex',
        padding: theme.spacing(1),
        paddingTop: 0,
        '& .DataGridFormHeader-addBtn': {
          marginLeft: 'auto',
        },
      },
      '& [data-test="tabpanel"]': {
        overflow: 'unset',
      },
    },
  },
}));

export function DataGridFormHeader({tableEleRef, rows}) {

  const {
    accessPath, field, dataDispatch, options, virtualizer, viewHelperProps,
  } = useContext(DataGridContext);
  const {
    canAdd, addOnTop, canAddRow, canEdit, expandEditOnAdd, headerFormVisible
  } = options;

  const label = field.label || '';
  const newRowIndex = useRef(-1);
  const schemaState = useContext(SchemaStateContext);
  const [addDisabled, setAddDisabled] = useState(!canAdd || !canAddRow);
  const {headerSchema} = field;
  const disableAddButton = (flag) => {
    if (!canAdd || !canAddRow) return;
    setAddDisabled(flag);
  };

  const onAddClick = useCallback(() => {

    if(!canAddRow) {
      return;
    }

    let newRow = headerSchema.getNewData(headerSchema.state.data);

    newRowIndex.current = addOnTop ? 0 : rows.length;

    dataDispatch({
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: accessPath,
      value: newRow,
      addOnTop: addOnTop
    });

    schemaState.setState(accessPath.concat(SEARCH_STATE_PATH), '');
    headerSchema.state?.validate(headerSchema._defaults || {});
  }, [canAddRow, rows?.length, addOnTop]);

  useEffect(() => {
    if (newRowIndex.current < -1) return;

    virtualizer.scrollToIndex(newRowIndex.current);

    // Try autofocus on newly added row.
    setTimeout(() => {
      const rowInput = tableEleRef.current?.querySelector(
        `.pgrt-row[data-index="${newRowIndex.current}"] input`
      );

      if(!rowInput) return;

      requestAnimationAndFocus(tableEleRef.current.querySelector(
        `.pgrt-row[data-index="${newRowIndex.current}"] input`
      ));

      expandEditOnAdd && canEdit &&
        rows[newRowIndex.current]?.toggleExpanded(true);

      newRowIndex.current = undefined;
    }, 50);
  }, [rows?.length]);

  const SchemaView = View('SchemaView');

  return (
    <StyledBox>
      <Box className='DataGridFormHeader-border'>
        <Box className='DataGridFormHeader-gridHeader'>
          {label && <Box className='DataGridView-gridHeaderText'>{label}</Box>}
          <Box className='DataGridFormHeader-gridHeader-search'>
            <SearchBox/>
          </Box>
        </Box>
        {headerFormVisible &&
        <Box className='DataGridFormHeader-body'>
          <SchemaView
            formType={'dialog'}
            getInitData={()=>Promise.resolve({})}
            schema={headerSchema}
            viewHelperProps={viewHelperProps}
            showFooter={false}
            onDataChange={()=>{
              disableAddButton(
                headerSchema.addDisabled(headerSchema.state.data)
              );
            }}
            hasSQL={false}
            isTabView={false}
          />
          <Box className='DataGridFormHeader-btn-group'>
            <DefaultButton
              className='DataGridFormHeader-addBtn'
              onClick={onAddClick} disabled={addDisabled}>
              {gettext('Add')}
            </DefaultButton>
          </Box>
        </Box>}
      </Box>
    </StyledBox>
  );
}

DataGridFormHeader.propTypes = {
  tableEleRef: CustomPropTypes.ref,
  rows: PropTypes.any,
};
