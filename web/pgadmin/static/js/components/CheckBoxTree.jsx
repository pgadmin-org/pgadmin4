/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { styled } from '@mui/material/styles';
import CheckboxTree from 'react-checkbox-tree';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PropTypes from 'prop-types';


const StyledDiv = styled('div')(({theme}) => ({
  height: '100%',
  '& .rct-collapse, .rct-checkbox': {
    padding: 0
  },
  '& .rct-node-leaf':{
    padding: '0 0 0 10px'
  },
  '& .react-checkbox-tree': {
    height: '97%',
    fontSize: '0.815rem',
    overflow: 'auto',
    ...theme.mixins.panelBorder
  },
  '& .CheckBoxTree-unchecked': {
    fill: theme.otherVars.borderColor
  },
  '& .CheckBoxTree-checked': {
    fill: theme.palette.primary.main
  }
}));

export default function CheckBoxTree({treeData, ...props}) {
  const [checked, setChecked] = React.useState([]);
  const [expanded, setExpanded] = React.useState([]);

  React.useEffect(() => {
    if (props.getSelectedServers) {
      props.getSelectedServers(checked);
    }
  }, [checked]);

  return (
    <StyledDiv>
      <CheckboxTree
        nodes={treeData}
        checked={checked}
        expanded={expanded}
        onCheck={checkedVal => setChecked(checkedVal)}
        onExpand={expandedVal => setExpanded(expandedVal)}
        showNodeIcon={false}
        icons={{
          check: <CheckBoxIcon className='CheckBoxTree-checked'/>,
          uncheck: <CheckBoxOutlineBlankIcon className='CheckBoxTree-unchecked'/>,
          halfCheck: <IndeterminateCheckBoxIcon className='CheckBoxTree-checked'/>,
          expandClose: <ChevronRightIcon />,
          expandOpen: <ExpandMoreIcon />,
          leaf: <ChevronRightIcon />
        }}
      />
    </StyledDiv>
  );
}

CheckBoxTree.propTypes = {
  treeData: PropTypes.array,
  getSelectedServers: PropTypes.func
};
