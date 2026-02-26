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

  // Handle checkbox toggle and collect all checked nodes
  // to pass complete selection state to the backup dialog
  const toggleCheck = (node, isChecked) => {
    const newState = { ...checkedState };

    // Update the clicked node and all its descendants with the new checked value
    const updateDescendants = (n, val) => {
      newState[n.id] = val;
      n.children?.forEach(child => { updateDescendants(child, val); });
    };
    updateDescendants(node, isChecked);

    // Update ancestor nodes to reflect the correct state (checked/unchecked/indeterminate)
    // This ensures parent nodes show proper visual feedback based on children's state
    let parent = node.parent;
    while (parent && parent.id !== '__root__') {
      // Check if ALL children are fully checked (state must be exactly true,
      // not 'indeterminate') to mark parent as fully checked
      const allChecked = parent.children.every(c => newState[c.id] === true);
      // Check if ALL children are unchecked (falsy value: false, undefined, or null)
      const noneChecked = parent.children.every(c => !newState[c.id]);

      if (allChecked) {
        // All children checked -> parent is fully checked
        newState[parent.id] = true;
      } else if (noneChecked) {
        // No children checked -> parent is unchecked
        newState[parent.id] = false;
      } else {
        // Some children checked, some not -> parent shows indeterminate state
        newState[parent.id] = 'indeterminate';
      }
      parent = parent.parent;
    }

    setCheckedState(newState);

    // Collect all checked/indeterminate nodes from the entire tree
    // to provide complete selection state to selectionChange callback.
    // We use wrapper objects to avoid mutating the original node data.
    const allCheckedNodes = [];
    const collectAllCheckedNodes = (n) => {
      if (!n) return;
      const state = newState[n.id];
      if (state === true || state === 'indeterminate') {
        // Pass wrapper object with isIndeterminate flag to differentiate
        // full schema selection from partial selection in backup dialog
        allCheckedNodes.push({
          node: n,
          isIndeterminate: state === 'indeterminate'
        });
      }
      // Recursively check all children
      n.children?.forEach(child => { collectAllCheckedNodes(child); });
    };

    // Navigate up to find the root level of the tree (parent of root nodes is '__root__')
    let rootNode = node;
    while (rootNode.parent && rootNode.parent.id !== '__root__') {
      rootNode = rootNode.parent;
    }

    // Traverse all root-level nodes to collect checked nodes from entire tree
    const rootParent = rootNode.parent;
    if (rootParent && rootParent.children) {
      // Iterate through all sibling root nodes to collect all checked nodes
      rootParent.children.forEach(root => { collectAllCheckedNodes(root); });
    } else {
      // Fallback: if we can't find siblings, just traverse from the found root
      collectAllCheckedNodes(rootNode);
    }

    // Pass all checked nodes to callback with current selection state.
    selectionChange?.(allCheckedNodes);
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
