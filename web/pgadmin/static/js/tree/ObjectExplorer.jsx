import React, { useEffect, useMemo, useRef, useState } from 'react';
import {Tree} from './tree';
import * as pgadminUtils from '../utils';

import { Directory } from 'react-aspen';
import { ManageTreeNodes } from './tree_nodes';
import { FileTreeX, TreeModelX } from '../components/PgTree';
import ContextMenu from '../components/ContextMenu';
import { generateNodeUrl } from '../../../browser/static/js/node_ajax';
import { copyToClipboard } from '../clipboard';
import { usePgAdmin } from '../BrowserComponent';

function postTreeReady(b) {
  const draggableTypes = [
    'collation domain domain_constraints fts_configuration fts_dictionary fts_parser fts_template synonym table partition type sequence package view mview foreign_table edbvar',
    'schema column database cast event_trigger extension language foreign_data_wrapper foreign_server user_mapping compound_trigger index index_constraint primary_key unique_constraint check_constraint exclusion_constraint foreign_key rule publication subscription',
    'trigger trigger_function',
    'edbfunc function edbproc procedure',
    'coll-column'
  ];
  const getQualifiedName = (data, item)=>{
    if(draggableTypes[0].includes(data._type)) {
      return pgadminUtils.fully_qualify(b, data, item);
    } else if(draggableTypes[1].includes(data._type)) {
      return pgadminUtils.quote_ident(data._label);
    } else if(draggableTypes[3].includes(data._type)) {
      let newData = {...data};
      let parsedFunc = pgadminUtils.parseFuncParams(newData._label);
      newData._label = parsedFunc.func_name;
      return pgadminUtils.fully_qualify(b, newData, item);
    } else {
      return data._label;
    }
  };

  b.tree.registerDraggableType({
    [draggableTypes[0]] : (data, item, treeNodeInfo)=>{
      let text = getQualifiedName(data, item);
      return {
        text: text,
        objUrl: generateNodeUrl.call(b.Nodes[data._type], treeNodeInfo, 'properties', data, true),
        nodeType: data._type,
        cur: {
          from: text.length,
          to: text.length,
        },
      };
    },
    [draggableTypes[1]] : (data)=>{
      return getQualifiedName(data);
    },
    [draggableTypes[2]] : (data)=>{
      return getQualifiedName(data);
    },
    [draggableTypes[3]] : (data, item)=>{
      let parsedFunc = pgadminUtils.parseFuncParams(data._label),
        dropVal = getQualifiedName(data, item),
        curPos = {from: 0, to: 0};

      if(parsedFunc.params.length > 0) {
        dropVal = dropVal + '(';
        curPos.from =  dropVal.length;
        dropVal = dropVal + parsedFunc.params[0][0];
        curPos.to = dropVal.length;

        for(let i=1; i<parsedFunc.params.length; i++) {
          dropVal = dropVal + ', ' + parsedFunc.params[i][0];
        }

        dropVal = dropVal + ')';
      } else {
        dropVal = dropVal + '()';
        curPos.from = curPos.to = dropVal.length + 1;
      }

      return {
        text: dropVal,
        cur: curPos,
      };
    },
    [draggableTypes[4]] : (_data, item)=>{
      return item?.children?.map((ci)=>{
        return getQualifiedName(ci._metadata.data);
      }).join(', ') ?? '';
    }
  });

  b.tree.onNodeCopy((data, item)=>{
    copyToClipboard(getQualifiedName(data, item));
  });
}

export default function ObjectExplorer() {
  const [contextPos, setContextPos] = React.useState(null);
  const pgAdmin = usePgAdmin();
  const contextMenuItems = pgAdmin.Browser.BrowserContextMenu;
  const [treeModelLoaded, setTreeModelLoaded] = useState(false);
  const treeModelXRef = useRef();
  const MOUNT_POINT = '/browser';
  const mtree = useMemo(()=>new ManageTreeNodes(), []);

  useEffect(()=>{
    // Init Tree with the Tree Parent node '/browser'
    mtree.init(MOUNT_POINT);

    const host = {
      pathStyle: 'unix',
      getItems: async (path) => {
        return mtree.readNode(path);
      },
      sortComparator: (a, b) => {
        // No nee to sort columns
        if (a._metadata && a._metadata.data._type == 'column') return 0;
        // Sort alphabetically
        if (a.constructor === b.constructor) {
          return pgAdmin.natural_sort(a.fileName, b.fileName);
        }
        let retval = 0;
        if (a.constructor === Directory) {
          retval = -1;
        } else if (b.constructor === Directory) {
          retval = 1;
        }
        return retval;
      },
    };

    treeModelXRef.current = new TreeModelX(host, MOUNT_POINT);

    treeModelXRef.current.root.ensureLoaded().then(()=>{
      setTreeModelLoaded(true);
    });
  }, []);

  const itemHandle = function onReady(handler) {
    pgAdmin.Browser.tree = new Tree(handler, mtree, pgAdmin.Browser);
    postTreeReady(pgAdmin.Browser);
  };
  // Create Node
  const create = async (parentPath, _data) => {
    try {
      const _node_path = parentPath + '/' + _data.id;
      return mtree.addNode(parentPath, _node_path, _data);
    } catch {
      return null; // or throw error as you see fit
    }
  };

  // Remove Node
  const remove = async (path, _removeOnlyChild) => {
    try {
      await mtree.removeNode(path, _removeOnlyChild);
      return true;
    } catch {
      return false; // or throw error as you see fit
    }
  };

  // Update Node
  const update = async (path, data) => {
    try {
      await mtree.updateNode(path, data);
      return true;
    } catch {
      return false; // or throw error as you see fit
    }
  };

  const onContextMenu = React.useCallback(async (ev, item)=>{
    ev.preventDefault();
    if(item) {
      await pgAdmin.Browser.tree.select(item);
      setContextPos({x: ev.clientX, y: ev.clientY});
    }
  }, []);

  if(!treeModelLoaded) {
    return <span>Loading...</span>;
  }

  return (
    <>
      <FileTreeX
        model={treeModelXRef.current}
        onReady={itemHandle}
        create={create} update={update} remove={remove}
        height={'100%'} disableCache={true} onContextMenu={onContextMenu}
        onScroll={()=>{
          contextPos && setContextPos(null);
        }}
      />
      <ContextMenu position={contextPos} onClose={()=>setContextPos(null)}
        menuItems={contextMenuItems} label="Object Context Menu" />
    </>
  );
}
