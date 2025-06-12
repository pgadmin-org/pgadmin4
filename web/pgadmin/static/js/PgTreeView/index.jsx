/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Checkbox } from '@mui/material';
import { styled } from '@mui/material/styles';
import gettext from 'sources/gettext';
import React, { useEffect, useRef } from 'react';
import { Tree } from 'react-arborist';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PropTypes from 'prop-types';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import EmptyPanelMessage from '../components/EmptyPanelMessage';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
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

export const PgTreeSelectionContext = React.createContext();

export default function PgTreeView({ data = [], hasCheckbox = false,
  selectionChange = null, NodeComponent = null, ...props }) {

  let treeData = data;
  const Node = NodeComponent ?? DefaultNode;
  const treeObj = useRef();
  const treeContainerRef = useRef();
  const [selectedCheckBoxNodes, setSelectedCheckBoxNodes] = React.useState([]);
  const { ref: containerRef, width, height } = useResizeObserver();

  const onSelectionChange = () => {
    let selectedChNodes = treeObj.current.selectedNodes;
    if (hasCheckbox) {
      let selectedChildNodes = [];

      treeObj.current.selectedNodes.forEach((node) => {
        if (node.isInternal && !node.isOpen) {
          node.children.forEach((ch) => {
            if (ch.data.isSelected && ch.isLeaf && !selectedChildNodes.includes(ch.id)) {
              selectedChildNodes.push(ch.id);
              selectedChNodes.push(ch);
            }
          });
        }
        selectedChildNodes.push(node.id);
      });
      setSelectedCheckBoxNodes(selectedChildNodes);
    }

    selectionChange?.(selectedChNodes);
  };

  return (<Root ref={containerRef} className={'PgTree-tree'}>
    {treeData.length > 0 ?
      <PgTreeSelectionContext.Provider value={selectedCheckBoxNodes}>
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
          {
            (props) => <Node onNodeSelectionChange={onSelectionChange} hasCheckbox={hasCheckbox} {...props} />
          }
        </Tree>
      </PgTreeSelectionContext.Provider>
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

function DefaultNode({ node, style, tree, hasCheckbox, onNodeSelectionChange, ...props }) {

  const pgTreeSelCtx = React.useContext(PgTreeSelectionContext);
  const [isSelected, setIsSelected] = React.useState(pgTreeSelCtx.includes(node.id) || node.data?.isSelected);
  const [isIndeterminate, setIsIndeterminate] = React.useState(node?.parent.level == 0);

  useEffect(() => {
    setIsIndeterminate(node.data.isIndeterminate);
  }, [node?.data?.isIndeterminate]);


  useEffect(() => {
    if (isSelected) {
      if (!pgTreeSelCtx.includes(node.id)) {
        tree.selectMulti(node.id);
        onNodeSelectionChange();
      }
    }
  }, [isSelected]);


  const onCheckboxSelection = (e) => {
    if (hasCheckbox) {
      setIsSelected(e.currentTarget.checked);
      node.data.isSelected = e.currentTarget.checked;
      if (e.currentTarget.checked) {
        node.selectMulti(node.id);
        if (!node.isLeaf) {
          node.data.isIndeterminate = false;
          selectAllChild(node, tree, 'checkbox', pgTreeSelCtx);
        } else if (node?.parent) {
          checkAndSelectParent(node);
        }

        if (node?.level == 0) {
          node.data.isIndeterminate = false;
        }
        node.focus();
      } else {
        node.deselect(node);
        if (!node.isLeaf) {
          deselectAllChild(node);
        }

        if (node?.parent) {
          node.parent.data.isIndeterminate = false;
          delectPrentNode(node.parent);
        }
      }
    }
    tree.scrollTo(node.id, 'center');
    onNodeSelectionChange();
  };

  const className = `${node.isSelected ? 'PgTree-focusedNode' : ''}`;
  return (
    <div style={style} className={className} {...props}>
      <div className={'PgTree-defaultNode'}>
        <ExpandIcon node={node} tree={tree} selectedNodeIds={pgTreeSelCtx} />
        <IndentIcon node={node} hasCheckbox={hasCheckbox} isSelected={isSelected} isIndeterminate={isIndeterminate} onCheckboxSelection={onCheckboxSelection}  />
        <div className='PgTree-nodeLabel'>
          <span className={`PgTree-icon ${node.data.icon || 'no-icon'}`} />
          {node.data.name}
        </div>
      </div>
    </div>
  );
}

DefaultNode.propTypes = {
  node: PropTypes.object,
  style: PropTypes.any,
  tree: PropTypes.object,
  hasCheckbox: PropTypes.bool,
  onNodeSelectionChange: PropTypes.func
};

function IndentIcon({node, hasCheckbox, isSelected, isIndeterminate, onCheckboxSelection}) {
  if(hasCheckbox) {
    return (
      <Checkbox style={{ padding: 0 }} color="primary"
        checked={isSelected}
        checkedIcon={isIndeterminate ? <IndeterminateCheckBoxIcon style={{ height: '1.5rem' }} /> : <CheckBoxIcon style={{ height: '1.5rem' }} />}
        onChange={onCheckboxSelection}
      />
    );
  }
  if(hasExpand(node)) {
    return <></>;
  }
  return <div className='PgTree-indentLine'></div>;
}

IndentIcon.propTypes = {
  node: PropTypes.object,
  hasCheckbox: PropTypes.bool,
  isSelected: PropTypes.bool,
  isIndeterminate: PropTypes.bool,
  onCheckboxSelection: PropTypes.func
};

function ExpandIcon({ node, tree, selectedNodeIds }) {
  const toggleNode = () => {
    node.isInternal && node.toggle();
    if (node.isSelected && node.isOpen) {
      node.data.isSelected = true;
      selectAllChild(node, tree, 'expand', selectedNodeIds);
    }
  };
  if(hasExpand(node)) {
    return (
      <span onClick={toggleNode} onKeyDown={() => {/* handled by parent */ }}>
        {node.isOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}
      </span>
    );
  }
  return (<div className='PgTree-expandSpacer'></div>);
}

ExpandIcon.propTypes = {
  node: PropTypes.object,
  tree: PropTypes.object,
  selectedNodeIds: PropTypes.array
};


function ToggleArrowIcon({ node }) {
  return (<>{node.isOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}</>);
}

ToggleArrowIcon.propTypes = {
  node: PropTypes.object,
};

function checkAndSelectParent(chNode) {
  let isAllChildSelected = true;
  chNode?.parent?.children?.forEach((child) => {
    if (!child.isSelected) {
      isAllChildSelected = false;
    }
  });
  if (chNode?.parent) {
    if (isAllChildSelected) {
      if (chNode.parent?.level == 0) {
        chNode.parent.data.isIndeterminate = true;
      } else {
        chNode.parent.data.isIndeterminate = false;
      }
      chNode.parent.selectMulti(chNode.parent.id);
    } else {
      chNode.parent.data.isIndeterminate = true;
      chNode.parent.selectMulti(chNode.parent.id);
    }
    chNode.parent.data.isSelected = true;
    checkAndSelectParent(chNode.parent);
  }
}

function hasExpand(node) {
  return node.isInternal && node?.children.length > 0;
}

function delectPrentNode(chNode) {
  if (chNode) {
    let isAnyChildSelected = false;
    chNode.children.forEach((childNode) => {
      if (childNode.isSelected && !isAnyChildSelected) {
        isAnyChildSelected = true;
      }
    });
    if (isAnyChildSelected) {
      chNode.data.isSelected = true;
      chNode.data.isIndeterminate = true;
    } else {
      chNode.deselect(chNode);
      chNode.data.isSelected = false;
    }
  }

  if (chNode?.parent) {
    delectPrentNode(chNode.parent);
  }
}

function selectAllChild(chNode, tree, source, selectedNodeIds) {
  let selectedChild = 0;
  chNode?.children?.forEach(child => {

    if (!child.isLeaf) {
      child.data.isIndeterminate = false;
    }
    if ((source == 'expand' && selectedNodeIds.includes(child.id)) || source == 'checkbox') {
      child.data.isSelected = true;
      selectedChild += 1;
    }
    child.selectMulti(child.id);

    if (child?.children) {
      selectAllChild(child, tree, source, selectedNodeIds);
    }
  });

  if (selectedChild < chNode?.children.length) {
    chNode.data.isIndeterminate = true;
  } else {
    chNode.data.isIndeterminate = false;
  }

  if (chNode?.parent) {
    checkAndSelectParent(chNode);
  }
}

function deselectAllChild(chNode) {
  chNode?.children.forEach(child => {
    child.deselect(child);
    child.data.isSelected = false;
    if (child?.children) {
      deselectAllChild(child);
    }
  });
}
