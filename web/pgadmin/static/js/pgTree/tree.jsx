import { Box, Checkbox, makeStyles } from '@material-ui/core';
import clsx from 'clsx';
import { icon } from 'leaflet';
import React from 'react';
import { NodeRendererProps, Tree } from 'react-arborist';


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
  }
}));

const treeNodeType = {
  'normal': Node,
  'checkbox': CheckboxNode
}

export function PgTree({data=[], type='normal'}){
    let treeData = data;
    console.log('Data:::::', data)
    // treeData = []

    let treeType = type in treeNodeType ? type: 'normal';


    return (
        <>
            <Tree
            data={treeData}
            >
              {treeNodeType[treeType]}
            </Tree>
        </>
    )
}

function Node({node, style, dragHandle}) {
  const classes = useStyles();
  /* This node instance can do many things. See the API reference. */
  return (
    <div style={style} ref={dragHandle}>
      <span className={clsx(node.data.icon, classes.nodeIcon)}></span>
      <div className={classes.node}>{node.data.name}</div>
    </div>
  );
}


function CheckboxNode({node, style, dragHandle}) {
  const classes = useStyles();
  const nodeSelection = (node) => {
    node.selectContiguous(node.id)
  }
  /* This node instance can do many things. See the API reference. */
  return (
    <div style={style}  ref={dragHandle} onClick={() => node.toggle()}>
      <Checkbox style={{ padding: 0 }} color="primary" className={classes.checkboxStyle} checked={node.state.isSelected} onClick={(node) => nodeSelection(node)} />
      <div className={clsx(node.data.icon, classes.node)}>{node.data.name}</div>
    </div>
  );
}