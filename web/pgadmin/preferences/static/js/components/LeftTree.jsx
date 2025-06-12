/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Resizable } from 're-resizable';
// Import helpers from new file


import PgTreeView from '../../../../static/js/PgTreeView';

export default function LeftTree({prefTreeData, selectedItem, setSelectedItem, filteredList}) {
  const filteredTreeData = useMemo(() => {
    const parentIds = filteredList.map((item) => item.parentId);
    const filteredTreeData = prefTreeData.reduce((retVal, category) => {
      const filteredChildren = category.children.filter((child) => parentIds.includes(child.id));
      if( filteredChildren.length > 0) {
        retVal.push({
          ...category,
          children: filteredChildren,
        });
      }
      return retVal;
    }, []);
    return filteredTreeData;
  }, [prefTreeData, filteredList]);

  useEffect(() => {
    // When the filtered list changes, we need to update the selected item
    // to the first item in the filtered tree data, if available.
    if (filteredTreeData.length > 0) {
      setSelectedItem(filteredTreeData[0]?.children[0] ?? null);
    }
  }, [filteredList.length]);

  return (
    <Resizable className='PreferencesComponent-treeContainer'
      enable={{ top:false, right:true, bottom:false, left:false, topRight:false, bottomRight:false, bottomLeft:false, topLeft:false }}
      maxWidth='50%' minWidth='10%'
      defaultSize={{ width: '25%', height: '100%' }}
      id='treeContainer'
    >
      <PgTreeView
        idAccessor='id'
        data={filteredTreeData}
        openByDefault={true}
        disableMultiSelection={true}
        selection={selectedItem?.id}
        onFocus={(item) => {
          setSelectedItem(item.data);
        }}
        // don't need virtualization for preferences tree
        overscanCount={50}
      />
    </Resizable>
  );
}

LeftTree.propTypes = {
  prefTreeData: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    key: PropTypes.string.isRequired,
    children: PropTypes.array.isRequired,
  })).isRequired,
  selectedItem: PropTypes.object,
  setSelectedItem: PropTypes.func.isRequired,
  filteredList: PropTypes.array,
};
