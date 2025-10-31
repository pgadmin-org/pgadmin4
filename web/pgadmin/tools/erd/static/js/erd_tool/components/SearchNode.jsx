/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import PropTypes from 'prop-types';
import { InputSelect } from '../../../../../../static/js/components/FormComponents';


export default function SearchNode({tableNodes, onClose, scrollToNode}) {
  const onSelectChange = (val) => {
    let node = tableNodes[val];
    if(node) {
      scrollToNode(node);
    }
    onClose();
  };

  return (
    <InputSelect
      options={Object.values(tableNodes).map(node => ({
        value: node.getID(),
        label: node.getDisplayName(),
      }))}
      onChange={onSelectChange}
      autoFocus
      placeholder="Select a table"
      openMenuOnFocus
    />
  );
}

SearchNode.propTypes = {
  tableNodes: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
