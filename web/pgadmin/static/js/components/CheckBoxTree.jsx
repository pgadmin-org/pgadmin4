/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { styled } from '@mui/material/styles';
import CheckboxTree from 'react-checkbox-tree';
import { Checkbox, FormControlLabel } from '@mui/material';
import gettext from 'sources/gettext';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PropTypes from 'prop-types';


const StyledDiv = styled('div')(({theme}) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '& .CheckBoxTree-selectAll': {
    marginLeft: 0,
    marginRight: 0,
    paddingBottom: '5px',
    '& .MuiCheckbox-root': {
      padding: '0 4px 0 0'
    },
    '& .MuiFormControlLabel-label': {
      fontSize: '0.815rem'
    }
  },
  '& .rct-collapse, .rct-checkbox': {
    padding: 0
  },
  '& .rct-node-leaf':{
    padding: '0 0 0 10px'
  },
  '& .react-checkbox-tree': {
    flexGrow: 1,
    minHeight: 0,
    marginBottom: '5px',
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

// react-checkbox-tree reports only checked leaf values, as strings.
function getLeafValues(nodes) {
  return (nodes ?? []).flatMap((node) => (
    node.children?.length ? getLeafValues(node.children) : [String(node.value)]
  ));
}

export default function CheckBoxTree({treeData, showSelectAll = false, ...props}) {
  const [checked, setChecked] = React.useState([]);
  const [expanded, setExpanded] = React.useState([]);
  const leafValues = React.useMemo(() => getLeafValues(treeData), [treeData]);
  const checkedSet = new Set(checked);
  const checkedLeafCount = leafValues.filter((v) => checkedSet.has(v)).length;
  const allChecked = leafValues.length > 0 && checkedLeafCount === leafValues.length;

  React.useEffect(() => {
    if (props.getSelectedServers) {
      props.getSelectedServers(checked);
    }
  }, [checked]);

  return (
    <StyledDiv>
      {showSelectAll &&
        <FormControlLabel
          className='CheckBoxTree-selectAll'
          label={gettext('Select all')}
          disabled={leafValues.length === 0}
          control={
            <Checkbox
              checked={allChecked}
              indeterminate={checkedLeafCount > 0 && !allChecked}
              onChange={(e) => setChecked(e.target.checked ? leafValues : [])}
              icon={<CheckBoxOutlineBlankIcon className='CheckBoxTree-unchecked'/>}
              checkedIcon={<CheckBoxIcon className='CheckBoxTree-checked'/>}
              indeterminateIcon={<IndeterminateCheckBoxIcon className='CheckBoxTree-checked'/>}
            />
          }
        />
      }
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
  showSelectAll: PropTypes.bool,
  getSelectedServers: PropTypes.func
};
