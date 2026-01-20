/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Checkbox } from '@mui/material';
import { styled } from '@mui/material/styles';
import gettext from 'sources/gettext';
import React, { useRef } from 'react';
import { Tree } from 'react-arborist';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PropTypes from 'prop-types';
import EmptyPanelMessage from '../components/EmptyPanelMessage';
import useResizeObserver from 'use-resize-observer';


const Root = styled('div')(({ theme }) => ({
  height: '100%',
  background: theme.palette.background.default,
  width: '100%',
  '& *:focus-visible': {
    outline: 'none',
  },
  '& .PgTree-defaultNode': {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    flexWrap: 'nowrap',

    '& .PgTree-expandSpacer': {
      width: '24px',
      height: '24px',
      flexShrink: 0,
    },

    '& .PgTree-indentLine': {
      width: '24px',
      height: '24px',
      marginLeft: '-36px',
      borderLeft: '1px solid ' + theme.otherVars.borderColor,
      flexShrink: 0,
    },

    '& .PgTree-nodeLabel': {
      height: '100%',
      flexGrow: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',

      '& .PgTree-icon': {
        display: 'inline-block',
        width: '20px',
        backgroundPosition: 'center',
      },

      '& .no-icon': {
        display: 'none',
        paddingLeft: '0rem',
      },
    },
  },
  '& .PgTree-focusedNode': {
    background: theme.palette.primary.light,
  },
}));

export default function PgTreeView({ data = [], hasCheckbox = false,
  selectionChange = null, NodeComponent = null, ...props }) {

  let treeData = data;
  const Node = NodeComponent ?? DefaultNode;
  const treeObj = useRef();
  const treeContainerRef = useRef();
  const [checkedState, setCheckedState] = React.useState({});
  const { ref: containerRef, width, height } = useResizeObserver();

  const toggleCheck = (node, isChecked) => {
    const newState = { ...checkedState };
    const selectedChNodes = [];

    // Update the node itself and all descendants
    const updateDescendants = (n, val) => {
      newState[n.id] = val;
      if (val) {
        selectedChNodes.push(n);
      }
      n.children?.forEach(child => updateDescendants(child, val));
    };
    updateDescendants(node, isChecked);

    // Update ancestors (Indeterminate logic)
    let parent = node.parent;
    while (parent && parent.id !== '__root__') {
      const allChecked = parent.children.every(c => newState[c.id]);
      const noneChecked = parent.children.every(c => !newState[c.id]);

      if (allChecked) {
        newState[parent.id] = true;
        // logic for custom indeterminate property if needed
      } else if (noneChecked) {
        newState[parent.id] = false;
      } else {
        newState[parent.id] = 'indeterminate'; // Store string for 3rd state
      }
      parent = parent.parent;
    }

    setCheckedState(newState);
    selectionChange?.(selectedChNodes);
  };

  return (<Root ref={containerRef} className={'PgTree-tree'}>
    {treeData.length > 0 ?
      <Tree
        ref={(obj) => {
          treeObj.current = obj;
        }}
        width={isNaN(width) ? 100 : width}
        height={isNaN(height) ? 100 : height}
        data={treeData}
        disableDrag={true}
        disableDrop={true}
        dndRootElement={treeContainerRef.current}
        selectionFollowsFocus
        {...props}
        indent={24}
      >
        {(nodeProps) => (
          <Node
            {...nodeProps}
            isChecked={checkedState[nodeProps.node.id]}
            onToggle={toggleCheck}
            hasCheckbox={hasCheckbox}
          />
        )}
      </Tree>
      :
      <EmptyPanelMessage text={gettext('No objects are found to display')} />
    }
  </Root>
  );
}

PgTreeView.propTypes = {
  data: PropTypes.array,
  selectionChange: PropTypes.func,
  hasCheckbox: PropTypes.bool,
  NodeComponent: PropTypes.func
};

const DefaultNode = React.memo(({ node, style, isChecked, onToggle, hasCheckbox }) => {
  const handleCheck = (e) => {
    e.stopPropagation();
    onToggle(node, e.target.checked);
  };

  return (
    <div style={style} className={node.isSelected ? 'PgTree-focusedNode' : ''}>
      <div className="PgTree-defaultNode">
        {/* Expand */}
        <span onClick={() => node.toggle()}>
          {node.isInternal ? (node.isOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />) : <div className="PgTree-expandSpacer" />}
        </span>

        {hasCheckbox && (
          <Checkbox
            size="small"
            style={{ padding: 0 }}
            checked={isChecked === true}
            indeterminate={isChecked === 'indeterminate'}
            onChange={handleCheck}
          />
        )}

        <div className="PgTree-nodeLabel">
          <span className={`PgTree-icon ${node.data.icon || 'no-icon'}`} />
          {node.data.name}
        </div>
      </div>
    </div>
  );
});

DefaultNode.displayName = 'DefaultNode';

DefaultNode.propTypes = {
  node: PropTypes.object,
  style: PropTypes.any,
  tree: PropTypes.object,
  hasCheckbox: PropTypes.bool,
  onNodeSelectionChange: PropTypes.func
};
