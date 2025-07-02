/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import React, { useEffect, useRef, useCallback } from 'react';
import { Box, Link } from '@mui/material';
import PropTypes from 'prop-types';
import SchemaView from '../../../../static/js/SchemaView';
// Import helpers from new file



export default function RightPreference({ schema, filteredItemIds, selectedItem, setSelectedItem, initValues, onDataChange }) {
  const schemaViewRef = useRef(null);

  const getInitData = useCallback(() => {
    return new Promise((resolve, reject) => {
      try {
        resolve(initValues);
      } catch (error) {
        reject(error instanceof Error ? error : Error(gettext('Something went wrong')));
      }
    });
  }, [initValues]);

  const updateVisibleFields = () => {
    if(!selectedItem) return;

    schema.schemaFields.forEach((field) => {
      field.visible = field.parentId === selectedItem.id && filteredItemIds.includes(field.id);
    });
    schema.categoryUpdated(selectedItem.id);
  };

  useEffect(() => {
    updateVisibleFields();
  }, [filteredItemIds, selectedItem]);

  if(selectedItem?.children) {
    return (
      <Box className='PreferencesComponent-preferencesContainer'>
        <Box className='PreferencesComponent-noSelection'>
          <Box>{gettext('Navigate to any below item to view or edit its preferences.')}</Box>
          {selectedItem.children.map((child) => (
            <Box key={child.id}>
              <Link component='button' onClick={()=>setSelectedItem(child)} underline="hover">{child.name}</Link>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <div className='PreferencesComponent-preferencesContainer' ref={schemaViewRef}>
      <SchemaView
        key={selectedItem?.id ?? 0}
        formType={'dialog'}
        getInitData={getInitData}
        viewHelperProps={{ mode: 'edit' }}
        schema={schema}
        showFooter={false}
        isTabView={false}
        formClassName='PreferencesComponent-preferencesContainerBackground'
        onDataChange={(isChanged, changedData) => {
          onDataChange(changedData);
        }}
        focusOnFirstInput={false}
      />
    </div>
  );
}
RightPreference.propTypes = {
  schema: PropTypes.object.isRequired,
  initValues: PropTypes.object.isRequired,
  onDataChange: PropTypes.func.isRequired,
  filteredItemIds: PropTypes.arrayOf(PropTypes.any).isRequired,
  selectedItem: PropTypes.object,
  setSelectedItem: PropTypes.func.isRequired,
};
