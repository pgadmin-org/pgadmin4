import { Box, Checkbox } from '@material-ui/core';
import React from 'react';
import { NodeRendererProps, Tree } from 'react-arborist';

export function SelectedObjectSchema(){
    const data = [
        {
          id: "3",
          name: "Public",
          children: [
            { id: "p1", name: "Sample Table 1" },
            { id: "p2", name: "Sample Table 2" },
            { id: "p3", name: "Sample Table 3" },
          ],
        },
        // {
        //   id: "4",
        //   name: "Test Schema",
        //   children: [
        //     { id: "t1", name: "Test Table 1" },
        //     { id: "t2", name: "Test Table 1" },
        //     { id: "t3", name: "Test Table 1" },
        //   ],
        // },
      ];

    return (
        <>
            <Tree
            initialData={data}
            >
              {Node}
            </Tree>
        </>
    )
}

function Node({node, style, dragHandle}) {
  /* This node instance can do many things. See the API reference. */
  return (
    <div style={style} ref={dragHandle} onClick={() => node.toggle()}>

      {<Checkbox style={{ padding: 0 }} checked={node.state.isSelected} onClick={() => tree.selectMulti(node.id)} />}
      <div className={node.isLeaf ? 'file-icon icon-table' : 'file-icon icon-schema'} style={{paddingLeft: '25px', height: '25px', display: 'inline-block'}}>{node.data.name}</div>
    </div>
  );
}