/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as React from 'react';
import ReactDOM from 'react-dom';
import {Tree} from './tree';

import { IBasicFileSystemHost, Directory, FileOrDir } from 'react-aspen';
import { ManageTreeNodes } from './tree_nodes';
import pgAdmin from 'sources/pgadmin';
import { FileTreeX, TreeModelX } from '../components/PgTree';
import Theme from '../Theme';
import { PgMenu, PgMenuDivider, PgMenuItem, PgSubMenu } from '../components/Menu';

const initBrowserTree = (pgBrowser) => {
  return new Promise((resolve)=>{
    const MOUNT_POINT = '/browser';

    // Setup host
    const mtree = new ManageTreeNodes();

    // Init Tree with the Tree Parent node '/browser'
    mtree.init(MOUNT_POINT);

    const host: IBasicFileSystemHost = {
      pathStyle: 'unix',
      getItems: async (path) => {
        return mtree.readNode(path);
      },
      sortComparator: (a: FileEntry | Directory, b: FileEntry | Directory) => {
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

    // Create Node
    const create = async (parentPath, _data): Promise<IFileEntryItem> => {
      try {
        const _node_path = parentPath + '/' + _data.id;
        return mtree.addNode(parentPath, _node_path, _data);
      } catch (error) {
        return null; // or throw error as you see fit
      }
    };

    // Remove Node
    const remove = async (path: string, _removeOnlyChild): Promise<boolean> => {
      try {
        await mtree.removeNode(path, _removeOnlyChild);
        return true;
      } catch (error) {
        return false; // or throw error as you see fit
      }
    };

    // Update Node
    const update = async (path: string, data): Promise<boolean> => {
      try {
        await mtree.updateNode(path, data);
        return true;
      } catch (error) {
        return false; // or throw error as you see fit
      }
    };

    const treeModelX = new TreeModelX(host, MOUNT_POINT);

    const itemHandle = function onReady(handler) {
      // Initialize pgBrowser Tree
      pgBrowser.tree = new Tree(handler, mtree, pgBrowser);
      resolve(pgBrowser);
    };

    treeModelX.root.ensureLoaded().then(()=>{
      // Render Browser Tree
      ReactDOM.render(
        <BrowserTree model={treeModelX}
          onReady={itemHandle} create={create} remove={remove} update={update} />
        , document.getElementById('tree')
      );
    });
  });
};

function BrowserTree(props) {
  const [contextPos, setContextPos] = React.useState<{x: number, y: number} | null>(null);
  const contextMenuItems = pgAdmin.Browser.BrowserContextMenu;

  const getPgMenuItem = (menuItem, i)=>{
    if(menuItem.type == 'separator') {
      return <PgMenuDivider key={i}/>;
    }
    if(menuItem.isDisabled) {
      return <React.Fragment key={i}><div style={{padding: '0 0.7rem',opacity: '0.5'}}>{menuItem.label}</div></React.Fragment>;
    }
    const hasCheck = typeof menuItem.checked == 'boolean';

    return <PgMenuItem
      key={i}
      disabled={menuItem.isDisabled}
      onClick={()=>{
        menuItem.callback();
      }}
      hasCheck={hasCheck}
      checked={menuItem.checked}
    >{menuItem.label}</PgMenuItem>;
  };

  const onContextMenu = React.useCallback(async (ev: MouseEvent, item: FileOrDir)=>{
    ev.preventDefault();
    if(item) {
      await pgAdmin.Browser.tree.select(item);
      setContextPos({x: ev.clientX, y: ev.clientY});
    }
  }, []);

  return (
    <Theme>
      <FileTreeX
        {...props} height={'100%'} disableCache={true} onContextMenu={onContextMenu}
        onScroll={()=>{
          contextPos && setContextPos(null);
        }}
      />
      <PgMenu
        anchorPoint={{
          x: contextPos?.x,
          y: contextPos?.y
        }}
        open={Boolean(contextPos) && contextMenuItems.length !=0}
        onClose={()=>setContextPos(null)}
        label="context"
        portal
      >
        {contextMenuItems.length !=0 && contextMenuItems.map((menuItem, i)=>{
          const submenus = menuItem.getMenuItems();
          if(submenus) {
            return <PgSubMenu key={i} label={menuItem.label}>
              {submenus.map((submenuItem, si)=>{
                return getPgMenuItem(submenuItem, i+'-'+si);
              })}
            </PgSubMenu>;
          }
          return getPgMenuItem(menuItem, i);
        })}
      </PgMenu>
    </Theme>
  );
}

module.exports = {
  initBrowserTree: initBrowserTree,
};

