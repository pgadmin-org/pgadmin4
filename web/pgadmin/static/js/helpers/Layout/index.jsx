import React, { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import DockLayout from 'rc-dock';
import PropTypes from 'prop-types';
import EventBus from '../EventBus';
import getApiInstance from '../../api_instance';
import url_for from 'sources/url_for';
import { PgIconButton } from '../../components/Buttons';
import CloseIcon from '@material-ui/icons/CloseRounded';
import gettext from 'sources/gettext';
import {ExpandDialogIcon, MinimizeDialogIcon } from '../../components/ExternalIcon';
import { Box } from '@material-ui/core';
import ErrorBoundary from '../ErrorBoundary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ContextMenu from '../../components/ContextMenu';
import { showRenameTab } from '../../Dialogs';
import usePreferences from '../../../../preferences/static/js/store';
import _ from 'lodash';

function TabTitle({id, closable, defaultInternal}) {
  const layoutDocker = React.useContext(LayoutDockerContext);
  const internal = layoutDocker?.find(id)?.internal ?? defaultInternal;
  const [attrs, setAttrs] = useState({
    icon: internal.icon,
    title: internal.title,
    tooltip: internal.tooltip ?? internal.title,
  });
  const onContextMenu = useCallback((e)=>{
    const g = layoutDocker.find(id)?.group??'';
    if((layoutDocker.noContextGroups??[]).includes(g)) return;

    e.preventDefault();
    layoutDocker.eventBus.fireEvent(LAYOUT_EVENTS.CONTEXT, e, id);
  }, []);

  useEffect(()=>{
    const deregister = layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.REFRESH_TITLE, _.debounce((panelId)=>{
      if(panelId == id) {
        const internal = layoutDocker?.find(id)?.internal??{};
        setAttrs({
          icon: internal.icon,
          title: internal.title,
          tooltip: internal.tooltip ?? internal.title,
        });
      }
    }, 100));

    return ()=>deregister?.();
  }, []);

  return (
    <Box display="flex" alignItems="center" title={attrs.tooltip} onContextMenu={onContextMenu} width="100%">
      {attrs.icon && <span style={{fontSize: '1rem', marginRight: '4px'}} className={attrs.icon}></span>}
      <span style={{textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}} data-visible={layoutDocker.isTabVisible(id)}>{attrs.title}</span>
      {closable && <PgIconButton title={gettext('Close')} icon={<CloseIcon style={{height: '0.7em'}} />} size="xs" noBorder onClick={()=>{
        layoutDocker.close(id);
      }} style={{margin: '-1px -10px -1px 0'}} />}
    </Box>
  );
}

TabTitle.propTypes = {
  id: PropTypes.string,
  closable: PropTypes.bool,
  defaultInternal: PropTypes.object
};

export class LayoutDocker {
  constructor(layoutId, defaultLayout, resetToTabPanel, noContextGroups) {
    this.layoutId = layoutId;
    this.defaultLayout = defaultLayout;
    /* When reset layout, we'll move the manually added tabs to this panel */
    this.resetToTabPanel = resetToTabPanel;
    // don't show context for these groups
    this.noContextGroups = noContextGroups??[];
    this.noContextGroups.push('dialogs');

    this.layoutObj = null;
    this.eventBus = new EventBus();
  }

  close(panelId, force=false) {
    const panelData = this.find(panelId);
    if(!panelData) {
      return;
    }
    if(!panelData.internal?.closable) {
      return;
    }
    if(panelData.internal?.manualClose && !force) {
      this.eventBus.fireEvent(LAYOUT_EVENTS.CLOSING, panelId);
    } else {
      this.layoutObj.dockMove(panelData, 'remove');
      // rc-dock is not firing the "active" event after a tab is removed
      // and another is focussed. here we try get the new active id and
      // manually fire the active event
      const newActiveId = this.find(panelData?.parent?.id)?.activeId;
      if(newActiveId) {
        this.eventBus.fireEvent(LAYOUT_EVENTS.ACTIVE, newActiveId);
      }
    }
  }

  closeAll(panelId, exceptCurrent=false) {
    let parentData = this.find(panelId);
    if(_.isUndefined(parentData.tabs)) {
      parentData = parentData.parent;
    }
    if(parentData?.tabs) {
      parentData.tabs.filter((t)=>(t.internal?.closable && (exceptCurrent ? t.id!=panelId : true))).forEach((t)=>{
        this.close(t.id);
      });
    }
  }

  focus(panelId) {
    this.layoutObj.updateTab(panelId, null, true);
  }

  find(...args) {
    return this.layoutObj?.find(...args);
  }

  setTitle(panelId, title, icon, tooltip) {
    const panelData = this.find(panelId);
    if(!panelData) return;

    const internal = {
      ...panelData.internal,
    };
    if(title) {
      internal.title = title;
    }
    if(icon) {
      internal.icon = icon;
    }
    if(tooltip) {
      internal.tooltip = tooltip;
    }
    panelData.internal = internal;
    this.eventBus.fireEvent(LAYOUT_EVENTS.REFRESH_TITLE, panelId);
  }

  setInternalAttrs(panelId, attrs) {
    const panelData = this.find(panelId);
    panelData.internal = {
      ...panelData.internal,
      ...attrs,
    };
    this.eventBus.fireEvent(LAYOUT_EVENTS.REFRESH_TITLE, panelId);
  }

  getInternalAttrs(panelId) {
    const panelData = this.find(panelId);
    return panelData.internal;
  }

  openDialog(panelData, width=500, height=300) {
    let panel = this.layoutObj.find(panelData.id);
    if(panel) {
      this.layoutObj.dockMove(panel, null, 'front');
    } else {
      let {width: lw, height: lh} = this.layoutObj.getLayoutSize();
      /* position in more top direction */
      lw = (lw - width)/2;
      lh = (lh - height)/5;
      this.layoutObj.dockMove({
        x: lw,
        y: lh,
        w: width,
        h: height,
        tabs: [LayoutDocker.getPanel({
          ...panelData,
          content: <ErrorBoundary>{panelData.content}</ErrorBoundary>,
          group: 'dialogs',
          closable: true,
        })],
      }, null, 'float');
    }
  }

  isTabOpen(panelId) {
    return Boolean(this.layoutObj.find(panelId));
  }

  isTabVisible(panelId) {
    let panelData = this.layoutObj?.find(panelId);
    return panelData?.parent?.activeId == panelData?.id;
  }

  openTab(panelData, refTabId, direction='middle', forceRerender=false) {
    let panel = this.layoutObj.find(panelData.id);
    if(panel) {
      if(forceRerender) {
        this.layoutObj.updateTab(panelData.id, LayoutDocker.getPanel(panelData), true);
      } else {
        this.focus(panelData.id);
      }
    } else {
      let tgtPanel = this.layoutObj.find(refTabId);
      this.layoutObj.dockMove(LayoutDocker.getPanel(panelData), tgtPanel, direction);
    }
  }

  loadLayout(savedLayout) {
    try {
      this.layoutObj.loadLayout(JSON.parse(savedLayout));
    } catch {
      /* Fallback to default */
      this.layoutObj.loadLayout(this.defaultLayout);
    }
  }

  saveLayout(l) {
    let api = getApiInstance();
    if(!this.layoutId || !this.layoutObj) {
      return;
    }
    const formData = new FormData();
    formData.append('setting', this.layoutId);
    formData.append('value', JSON.stringify(l || this.layoutObj.saveLayout()));
    api.post(url_for('settings.store_bulk'), formData)
      .catch(()=>{/* No need to throw error */});
  }

  resetLayout() {
    const flatCurr = [];
    const flatDefault = [];

    // flatten the nested tabs into an array
    const flattenLayout = (box, arr)=>{
      box.children.forEach((child)=>{
        if(child.children) {
          flattenLayout(child, arr);
        } else {
          arr.push(...child.tabs??[]);
        }
      });
    };

    flattenLayout(this.defaultLayout.dockbox, flatDefault);
    flattenLayout(this.layoutObj.getLayout().dockbox, flatCurr);

    // Find the difference between default layout and current layout
    let saveNonDefaultTabs = _.differenceBy(flatCurr, flatDefault, 'id');

    // load the default layout
    this.layoutObj.loadLayout(this.defaultLayout);
    const focusOn = this.find(this.resetToTabPanel)?.activeId;

    // restor the tabs opened
    saveNonDefaultTabs.forEach((t)=>{
      this.openTab({
        id: t.id, content: t.content, ...t.internal
      }, this.resetToTabPanel, 'middle');
    });

    focusOn && this.focus(focusOn);
    this.saveLayout();
  }

  static getPanel({icon, title, closable, tooltip, renamable, manualClose, ...attrs}) {
    const internal = {
      icon: icon,
      title: title,
      tooltip: tooltip,
      closable: _.isUndefined(closable) ? manualClose : closable,
      renamable: renamable,
      manualClose: manualClose,
    };
    return {
      cached: true,
      group: 'default',
      minWidth: 200,
      ...attrs,
      closable: false,
      title: <TabTitle id={attrs.id} closable={attrs.group!='dialogs' && closable} defaultInternal={internal}/>,
      internal: internal
    };
  }

  static moveTo(direction) {
    let dockBar = document.activeElement.closest('.dock')?.querySelector('.dock-bar.drag-initiator');
    if(dockBar) {
      let key = {
        key: 'ArrowRight', keyCode: 39, which: 39, code: 'ArrowRight',
        metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
        bubbles: true,
      };
      if(direction == 'right') {
        key = {
          ...key,
          key: 'ArrowRight', keyCode: 39, which: 39, code: 'ArrowRight'
        };
      } else if(direction == 'left') {
        key = {
          ...key,
          key: 'ArrowLeft', keyCode: 37, which: 37, code: 'ArrowLeft',
        };
      }
      dockBar.dispatchEvent(new KeyboardEvent('keydown', key));
    }
  }

  static switchPanel() {
    let currDockPanel = document.activeElement.closest('.dock-panel.dock-style-default');
    let dockLayoutPanels = currDockPanel?.closest('.dock-layout').querySelectorAll('.dock-panel.dock-style-default');
    if(dockLayoutPanels?.length > 1) {
      for(let i=0; i<dockLayoutPanels.length; i++) {
        if(dockLayoutPanels[i] == currDockPanel) {
          let newPanelIdx = (i+1)%dockLayoutPanels.length;
          dockLayoutPanels[newPanelIdx]?.querySelector('.dock-tab.dock-tab-active .dock-tab-btn')?.focus();
          break;
        }
      }
    }
  }
}

export const LayoutDockerContext = React.createContext(new LayoutDocker(null, null));

function DialogClose({panelData}) {
  const layoutDocker = React.useContext(LayoutDockerContext);
  // In a dialog, panelData is the data of the container panel and not the
  // data of actual dialog tab. panelData.activeId gives the id of dialog tab.
  return (
    <Box display="flex" alignItems="center">
      <PgIconButton title={gettext('Close')} icon={<CloseIcon />} size="xs" noBorder onClick={()=>{
        layoutDocker.close(panelData.activeId);
      }} style={{marginRight: '-4px'}}/>
    </Box>
  );
}
DialogClose.propTypes = {
  panelData: PropTypes.object
};

function getDialogsGroup() {
  return {
    disableDock: true,
    tabLocked: true,
    floatable: 'singleTab',
    moreIcon: <ExpandMoreIcon style={{height: '0.9em'}} />,
    panelExtra: (panelData) => {
      return <DialogClose panelData={panelData} />;
    }
  };
}

export function getDefaultGroup() {
  return {
    closable: false,
    maximizable: false,
    floatable: false,
    moreIcon: <ExpandMoreIcon style={{height: '0.9em', marginTop: '4px'}} />,
    panelExtra: (panelData, context) => {
      let icon = <ExpandDialogIcon style={{width: '0.7em'}}/>;
      let title = gettext('Maximise');
      if(panelData?.parent?.mode == 'maximize') {
        icon = <MinimizeDialogIcon />;
        title = gettext('Restore');
      }
      return <Box display="flex" alignItems="center">
        {Boolean(panelData.maximizable) && <PgIconButton title={title} icon={icon} size="xs" noBorder onClick={()=>{
          context.dockMove(panelData, null, 'maximize');
        }} />}
      </Box>;
    }
  };
}

export default function Layout({groups, noContextGroups, getLayoutInstance, layoutId, savedLayout, resetToTabPanel, ...props}) {
  const [[contextPos, contextPanelId, contextExtraMenus], setContextPos] = React.useState([null, null, null]);
  const defaultGroups = React.useMemo(()=>({
    'dialogs': getDialogsGroup(),
    'default': getDefaultGroup(),
    ...groups,
  }), [groups]);
  const layoutDockerObj = React.useMemo(()=>new LayoutDocker(layoutId, props.defaultLayout, resetToTabPanel, noContextGroups), []);
  const prefStore = usePreferences();
  const dynamicTabsStyleRef = useRef();

  useEffect(()=>{
    layoutDockerObj.eventBus.registerListener(LAYOUT_EVENTS.REMOVE, (panelId)=>{
      layoutDockerObj.close(panelId);
    });

    layoutDockerObj.eventBus.registerListener(LAYOUT_EVENTS.CONTEXT, (e, id, extraMenus)=>{
      setContextPos([{x: e.clientX, y: e.clientY}, id, extraMenus]);
    });
  }, []);

  useEffect(()=>{
    const dynamicTabs = prefStore.getPreferencesForModule('browser')?.dynamic_tabs;
    // Add a class to set max width for non dynamic Tabs
    if(!dynamicTabs && !dynamicTabsStyleRef.current) {
      const css = '.dock-tab:not(div.dock-tab-active) { max-width: 180px; }',
        head = document.head || document.getElementsByTagName('head')[0];

      dynamicTabsStyleRef.current = document.createElement('style');
      head.appendChild(dynamicTabsStyleRef.current);
      dynamicTabsStyleRef.current.appendChild(document.createTextNode(css));
    } else if(dynamicTabs && dynamicTabsStyleRef.current) {
      dynamicTabsStyleRef.current.remove();
      dynamicTabsStyleRef.current = null;
    }
  }, [prefStore]);

  const getTabMenuItems = (panelId)=>{
    const ret = [];
    if(panelId) {
      const panelData = layoutDockerObj?.find(panelId);
      if(_.isUndefined(panelData.tabs)) {
        if(panelData.internal.closable) {
          ret.push({
            label: gettext('Close'),
            callback: ()=>{
              layoutDockerObj.close(panelId);
            }
          });
        }
        if(panelData.parent?.tabs?.length > 1) {
          ret.push({
            label: gettext('Close Others'),
            callback: ()=>{
              layoutDockerObj.closeAll(panelId, true);
            }
          });
        }
      }
      ret.push({
        label: gettext('Close All'),
        callback: ()=>{
          layoutDockerObj.closeAll(panelId);
        }
      });
      if(panelData.internal?.renamable) {
        ret.push({
          type: 'separator',
        }, {
          label: gettext('Rename'),
          callback: ()=>{
            showRenameTab(panelId, layoutDockerObj);
          }
        });
      }
    }
    return ret;
  };

  const contextMenuItems = getTabMenuItems(contextPanelId)
    .concat(contextExtraMenus ? [{type: 'separator'}, ...contextExtraMenus] : []);

  return (
    <LayoutDockerContext.Provider value={layoutDockerObj}>
      {useMemo(()=>(<DockLayout
        style={{
          height: '100%',
        }}
        ref={(obj)=>{
          if(obj) {
            layoutDockerObj.layoutObj = obj;
            getLayoutInstance?.(layoutDockerObj);
            layoutDockerObj.loadLayout(savedLayout);
          }
        }}
        groups={defaultGroups}
        onLayoutChange={(l, currentTabId, direction)=>{
          if(Object.values(LAYOUT_EVENTS).indexOf(direction) > -1) {
            layoutDockerObj.eventBus.fireEvent(LAYOUT_EVENTS[direction.toUpperCase()], currentTabId);
            layoutDockerObj.saveLayout(l);
          } else if(direction && direction != 'update') {
            layoutDockerObj.eventBus.fireEvent(LAYOUT_EVENTS.CHANGE, currentTabId);
            layoutDockerObj.saveLayout(l);
          }
        }}
        {...props}
      />), [])}
      <div id="layout-portal"></div>
      <ContextMenu menuItems={contextMenuItems} position={contextPos} onClose={()=>setContextPos([null, null, null])}
        label="Layout Context Menu" />
    </LayoutDockerContext.Provider>
  );
}

Layout.propTypes = {
  groups: PropTypes.object,
  defaultLayout: PropTypes.object,
  noContextGroups: PropTypes.array,
  getLayoutInstance: PropTypes.func,
  layoutId: PropTypes.string,
  savedLayout: PropTypes.string,
  resetToTabPanel: PropTypes.string,
};


export const LAYOUT_EVENTS = {
  ACTIVE: 'active',
  REMOVE: 'remove',
  FLOAT: 'float',
  FRONT: 'front',
  MAXIMIZE: 'maximize',
  MOVE: 'move',
  CLOSING: 'closing',
  CONTEXT: 'context',
  CHANGE: 'change',
  REFRESH_TITLE: 'refresh-title'
};
