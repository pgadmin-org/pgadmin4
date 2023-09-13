import { Checkbox, makeStyles } from '@material-ui/core';
import clsx from 'clsx';
import gettext from 'sources/gettext';
import React, { useEffect, useRef } from 'react';
import { Tree } from 'react-arborist';
import AutoSizer from 'react-virtualized-auto-sizer';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import PropTypes from 'prop-types';
import IndeterminateCheckBoxIcon from '@material-ui/icons/IndeterminateCheckBox';
import EmptyPanelMessage from '../components/EmptyPanelMessage';
import CheckBoxIcon from '@material-ui/icons/CheckBox';


const useStyles = makeStyles((theme) => ({
  node: {
    display: 'inline-block',
    paddingLeft: '1.5rem',
    height: '1.5rem'
  },
  checkboxStyle: {
    fill: theme.palette.primary.main
  },
  tree: {
    background: theme.palette.background.default,
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  selectedNode: {
    background: theme.otherVars.stepBg,
  },
  focusedNode: {
    background: theme.palette.primary.light,
  },
  leafNode: {
    marginLeft: '1.5rem'
  },
}));

export const PgTreeSelectionContext = React.createContext();

export default function PgTreeView({ data = [], hasCheckbox = false, selectionChange = null}) {
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

    selectionChange?.(treeObj.current.selectedNodes);
  };

  return (<>
    { treeData.length > 0 ?
      <PgTreeSelectionContext.Provider value={_.isUndefined(selectedCheckBoxNodes) ? []: selectedCheckBoxNodes}>
        <div className={clsx(classes.tree)}>
          <AutoSizer>
            {({ width, height }) => (
              <Tree
                ref={(obj) => {
                  treeObj.current = obj;
                }}
                width={width}
                height={height}
                data={treeData}
              >
                {
                  (props) => <Node onNodeSelectionChange={onSelectionChange} hasCheckbox={hasCheckbox} {...props}></Node>
                }
              </Tree>
            )}
          </AutoSizer>
        </div>
      </PgTreeSelectionContext.Provider>
      :
      <EmptyPanelMessage text={gettext('No objects are found to display')}/>
    }
  </>
  );
}

PgTreeView.propTypes = {
  data: PropTypes.array,
  selectionChange: PropTypes.func,
  hasCheckbox: PropTypes.bool,
};

function Node({ node, style, tree, hasCheckbox, onNodeSelectionChange}) {
  const classes = useStyles();
  const pgTreeSelCtx = React.useContext(PgTreeSelectionContext);
  const [isSelected, setIsSelected] = React.useState(pgTreeSelCtx.includes(node.id) ? true : false);
  const [isIndeterminate, setIsIndeterminate] = React.useState(node?.parent.level==0? true: false);


  useEffect(()=>{
    setIsIndeterminate(node.data.isIndeterminate);
  }, [node?.data?.isIndeterminate]);

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

        if(node?.level == 0) {
          node.data.isIndeterminate = false;
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
    <div style={style} className={clsx(node.isFocused ? classes.focusedNode : '', node.isSelected ? classes.selectedNode : '')} onClick={(e) => {
      node.focus();
      e.stopPropagation();
    }}>
      <CollectionArrow node={node} tree={tree} />
      {
        hasCheckbox ? <Checkbox style={{ padding: 0 }} color="primary" className={clsx(!node.isInternal ? classes.leafNode: null)}
          checked={isSelected ? true: false}
          checkedIcon={isIndeterminate  ? <IndeterminateCheckBoxIcon />: <CheckBoxIcon />}
          onChange={onCheckboxSelection}/> :
          <span className={clsx(node.data.icon)}></span>
      }
      <div className={clsx(node.data.icon, classes.node)}>{node.data.name}</div>
    </div>
  );
}

Node.propTypes = {
  node: PropTypes.object,
  style: PropTypes.any,
  tree: PropTypes.object,
  hasCheckbox: PropTypes.bool,
  onNodeSelectionChange: PropTypes.func
};

function CollectionArrow({ node, tree }) {
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
      {node.isInternal ? <ToggleArrowIcon node={node} /> : null}
    </span>
  );
}

CollectionArrow.propTypes = {
  node: PropTypes.object,
  tree: PropTypes.object
};


function ToggleArrowIcon({node}){
  return (<>{node.isOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}</>);
}

ToggleArrowIcon.propTypes = {
  node: PropTypes.object,
};

function checkAndSelectParent(chNode){
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

    checkAndSelectParent(chNode.parent);
  }
}

checkAndSelectParent.propTypes = {
  chNode: PropTypes.object
};

function delectPrentNode(chNode){
  if (chNode) {
    let isAnyChildSelected = false;
    chNode.children.forEach((childNode)=>{
      if(childNode.isSelected && !isAnyChildSelected){
        isAnyChildSelected = true;
      }
    });
    if(isAnyChildSelected){
      chNode.data.isIndeterminate = true;
    } else {
      chNode.deselect(chNode);
    }
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
