import { Checkbox, makeStyles } from '@material-ui/core';
import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import { Tree } from 'react-arborist';
import AutoSizer from 'react-virtualized-auto-sizer';
import EventBus from '../../helpers/EventBus';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import PropTypes from 'prop-types';


const useStyles = makeStyles((theme) => ({
  node: {
    display: 'inline-block',
    paddingLeft: '1.5rem',
    height: '1.5rem'
  },
  nodeIcon: {

  },
  checkboxStyle: {
    fill: theme.palette.primary.main
  },
  treeBgColor: {
    background: theme.palette.background.default,
  },
  selectedNode: {
    background: theme.otherVars.stepBg,
  },
  focusedNode: {
    background: theme.palette.primary.light,
  },
}));


export const TreeEventContext = React.createContext();

function TreeView({data, treeRef, eventBusObj, onSelectionChange, hasCheckbox=false}){
  const treeEventContextValue = useRef(eventBusObj || new EventBus());

  return <AutoSizer>
    {({ width, height }) => (
      <Tree
        ref={(obj) => {
          treeRef.current = obj;
        }}
        width={width}
        height={height}
        data={data}
      >
        {
          (props) => <TreeEventContext.Provider value={treeEventContextValue.current}>
            <Node onNodeSelectionChange={onSelectionChange} hasCheckbox={hasCheckbox} {...props}></Node>
          </TreeEventContext.Provider>
        }
      </Tree>
    )}
  </AutoSizer>;
}

TreeView.propTypes = {
  data: PropTypes.object,
  treeRef: PropTypes.object,
  hasCheckbox: PropTypes.bool,
  onSelectionChange: PropTypes.func,
  eventBusObj: PropTypes.object
};

export const PgTreeSelectionContext = React.createContext();

export function PgTreeView({ data = [], hasCheckbox = false, eventBusObj = null, selectionChange = null, isResetSelection=false, ...props}) {
  let classes = useStyles();
  let treeData = data;
  const treeObj = useRef();
  const [selectedCheckBoxNodes, setSelectedCheckBoxNodes] = React.useState();

  const onSelectionChange = () => {
    if (hasCheckbox) {
      let selectedChildNodes = [];
      treeObj.current.selectedNodes.forEach((node) => {
        selectedChildNodes.push(node.id);
      });
      setSelectedCheckBoxNodes(selectedChildNodes);
    }

    let selectedNode = treeObj.current.selectedNodes;
    let selectedNodeCollection = {
      'schema': [],
      'table': [],
      'view': [],
      'sequence': [],
      'foreign_table': [],
      'mview': [],
    };
    selectedNode.forEach((node)=> {
      if(node.data.is_schema) {
        selectedNodeCollection['schema'].push(node.data.name);
      } else if(['table', 'view', 'mview', 'foreign_table', 'sequence'].includes(node.data.type) && !node.data.is_collection && !selectedNodeCollection['schema'].includes(node.data.schema) && !node?.parent?.parent.isSelected) {
        selectedNodeCollection[node.data.type].push(node.data);
      }
    });
    selectionChange?.(selectedNodeCollection);
  };

  useEffect(()=>{
    if(isResetSelection){
      treeObj.current?.deselectAll();
    }
  },[isResetSelection]);

  return (
    <PgTreeSelectionContext.Provider value={_.isUndefined(selectedCheckBoxNodes) ? []: isResetSelection ? []: selectedCheckBoxNodes}>
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }} className={classes.treeBgColor}>
        <TreeView data={treeData} treeRef={treeObj} hasCheckbox={hasCheckbox} eventBusObj={eventBusObj} onSelectionChange={onSelectionChange} {...props}></TreeView>
      </div>
    </PgTreeSelectionContext.Provider>
  );
}

PgTreeView.propTypes = {
  data: PropTypes.object,
  eventBusObj: PropTypes.object,
  selectionChange: PropTypes.func,
  isResetSelection: PropTypes.bool,
  hasCheckbox: PropTypes.bool,

};

function Node({ node, style, dragHandle, tree, hasCheckbox, onNodeSelectionChange}) {
  const classes = useStyles();
  const pgTreeSelCtx = React.useContext(PgTreeSelectionContext);
  const [isSelected, setIsSelected] = React.useState(pgTreeSelCtx.includes(node.id) ? true : false);


  const onCheckboxSelection = (e) => {
    if (hasCheckbox) {
      setIsSelected(e.currentTarget.checked);
      if (e.currentTarget.checked) {

        node.selectMulti(node.id);
        if (!node.isLeaf && node.isOpen) {
          selectAllChild(node, tree);
        } else {
          if (node?.parent) {
            checkAndSelectParent(node);
          }
        }
      } else {
        node.deselect(node);
        if (!node.isLeaf) {
          deselectAllChild(node);
        }

        if(node?.parent){
          delectPrentNode(node.parent);
        }
      }
    }

    onNodeSelectionChange();
  };

  return (
    <div style={style} ref={dragHandle} className={clsx(node.isFocused ? classes.focusedNode : '', node.isSelected ? classes.selectedNode : '')} onClick={(e) => {
      node.focus();
      e.stopPropagation();
    }}>
      <FolderArrow node={node} tree={tree} />
      {
        hasCheckbox ? <Checkbox style={{ padding: 0 }} color="primary" className={classes.checkboxStyle} checked={isSelected ? true: false}
          onChange={onCheckboxSelection}/> :
          <span className={clsx(node.data.icon, classes.nodeIcon)}></span>
      }
      <div className={clsx(node.data.icon, classes.node)}>{node.data.name}</div>
    </div>
  );
}

Node.propTypes = {
  node: PropTypes.object,
  style: PropTypes.style,
  dragHandle: PropTypes.bool,
  tree: PropTypes.object,
  hasCheckbox: PropTypes.bool,
  onNodeSelectionChange: PropTypes.func
};

function FolderArrow({ node, tree }) {
  const toggleNode = () => {
    node.isInternal && node.toggle();
    if (node.isSelected && node.isOpen) {
      setTimeout(()=>{
        selectAllChild(node, tree);
      }, 0);

    }
  };
  return (
    <span onClick={toggleNode} >
      {node.isInternal ? (
        node.isOpen ? (
          <ExpandMoreIcon />
        ) : (
          <ChevronRightIcon />
        )
      ) : null}
    </span>
  );
}

FolderArrow.propTypes = {
  node: PropTypes.object,
  tree: PropTypes.object
};

function checkAndSelectParent(chNode){
  let isAllChildSelected = true;
  chNode?.parent?.children?.forEach((child) => {
    if (!child.isSelected) {
      isAllChildSelected = false;
    }
  });
  if (isAllChildSelected && chNode?.parent) {
    chNode.parent.selectMulti(chNode.parent.id);
  }

  if (chNode?.parent) {
    checkAndSelectParent(chNode.parent);
  }
}

checkAndSelectParent.propTypes = {
  chNode: PropTypes.object
};

function delectPrentNode(chNode){
  if (chNode) {
    chNode.deselect(chNode);
  }

  if (chNode?.parent) {
    delectPrentNode(chNode.parent);
  }
}

function selectAllChild(chNode, tree){

  chNode?.children?.forEach(child => {
    child.selectMulti(child.id);

    if (child?.children) {
      selectAllChild(child, tree);
    }
  });

  if (chNode?.parent) {
    checkAndSelectParent(chNode);
  }
}

function deselectAllChild(chNode){
  chNode?.children.forEach(child => {
    child.deselect(child);

    if (child?.children) {
      deselectAllChild(child);
    }
  });
}
