import React, { useRef, useMemo } from 'react';
import DockLayout from 'rc-dock';
import { makeStyles } from '@material-ui/styles';
import PropTypes from 'prop-types';
import EventBus from './EventBus';
import getApiInstance from '../api_instance';
import url_for from 'sources/url_for';
import { PgIconButton } from '../components/Buttons';
import CloseIcon from '@material-ui/icons/CloseRounded';
import gettext from 'sources/gettext';
import {ExpandDialogIcon, MinimizeDialogIcon } from '../components/ExternalIcon';


const useStyles = makeStyles((theme)=>({
  docklayout: {
    height: '100%',
    '& .dock-tab-active': {
      color: theme.otherVars.activeColor,
      '&::hover': {
        color: theme.otherVars.activeColor,
      }
    },
    '& .dock-ink-bar': {
      height: '3px',
      backgroundColor: theme.otherVars.activeBorder,
      color: theme.otherVars.activeColor,
      '&.dock-ink-bar-animated': {
        transition: 'none !important',
      }
    },
    '& .dock-bar': {
      paddingLeft: 0,
      backgroundColor: theme.palette.background.default,
      ...theme.mixins.panelBorder.bottom,
      '& .dock-nav-wrap': {
        cursor: 'move',
      }
    },
    '& .dock-panel': {
      border: 'none',
      '&.dragging': {
        opacity: 0.6,
      },
      '& .dock':  {
        borderRadius: 'inherit',
      },
      '&.dock-style-dialogs': {
        borderRadius: theme.shape.borderRadius,
        '&.dock-panel.dragging': {
          opacity: 1,
          pointerEvents: 'visible',
        },
        '& .dock-ink-bar': {
          height: '0px',
        },
        '& .dock-panel-drag-size-b-r': {
          zIndex: 1020,
        },
        '& .dock-tab-active': {
          color: theme.palette.text.primary,
          fontWeight: 'bold',
          '&::hover': {
            color: theme.palette.text.primary,
          }
        },
      },
      '& .dock-tabpane': {
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      },
      '& #id-schema-diff': {
        overflowY: 'auto'
      },
      '& #id-results': {
        overflowY: 'auto'
      }
    },
    '& .dock-tab': {
      minWidth: 'unset',
      borderBottom: 'none',
      marginRight: 0,
      background: 'unset',
      fontWeight: 'unset',
      color: theme.palette.text.primary,
      '&::hover': {
        color: 'unset',
      },
      '& > div': {
        padding: '4px 10px',
        '&:focus': {
          outline: '2px solid '+theme.otherVars.activeBorder,
        }
      },
      '& .drag-initiator': {
        display: 'flex',
        '& .dock-tab-close-btn': {
          color: theme.palette.text.primary,
          position: 'unset',
          marginLeft: '8px',
          fontSize: '18px',
          transition: 'none',
          '&::before': {
            content: '"\\00d7"',
            position: 'relative',
            top: '-5px',
          }
        }
      }
    },
    '& .dock-extra-content': {
      alignItems: 'center',
      paddingRight: '10px',
    },
    '& .dock-vbox, & .dock-hbox .dock-vbox': {
      '& .dock-divider': {
        flexBasis: '1px',
        transform: 'scaleY(8)',
        '&::before': {
          backgroundColor: theme.otherVars.borderColor,
          display: 'block',
          content: '""',
          width: '100%',
          transform: 'scaleY(0.125)',
          height: '1px',
        }
      }
    },
    '& .dock-hbox, & .dock-vbox .dock-hbox': {
      '& .dock-divider': {
        flexBasis: '1px',
        transform: 'scaleX(8)',
        '&::before': {
          backgroundColor: theme.otherVars.borderColor,
          display: 'block',
          content: '""',
          height: '100%',
          transform: 'scaleX(0.125)',
          width: '1px',
        }
      }
    },
    '& .dock-content-animated': {
      transition: 'none',
    },
    '& .dock-fbox': {
      zIndex: 1060,
    },
    '& .dock-mbox': {
      zIndex: 1080,
    },
    '& .drag-accept-reject::after': {
      content: '',
    }
  }
}));

export const LayoutEventsContext = React.createContext();

export class LayoutHelper {
  static getPanel(attrs) {
    return {
      cached: true,
      group: 'default',
      minWidth: 200,
      ...attrs,
    };
  }

  static close(docker, panelId) {
    docker?.dockMove(docker.find(panelId), 'remove');
  }

  static focus(docker, panelId) {
    docker?.updateTab(panelId, null, true);
  }

  static openDialog(docker, panelData, width=500, height=300) {
    let panel = docker.find(panelData.id);
    if(panel) {
      docker.dockMove(panel, null, 'front');
    } else {
      let {width: lw, height: lh} = docker.getLayoutSize();
      lw = (lw - width)/2;
      lh = (lh - height)/2;
      docker.dockMove({
        x: lw,
        y: lh,
        w: width,
        h: height,
        tabs: [LayoutHelper.getPanel({
          ...panelData,
          group: 'dialogs',
          closable: false,
        })],
      }, null, 'float');
    }
  }

  static isTabOpen(docker, panelId) {
    return Boolean(docker.find(panelId));
  }

  static isTabVisible(docker, panelId) {
    let panelData = docker.find(panelId);
    return panelData?.parent?.activeId == panelData.id;
  }

  static openTab(docker, panelData, refTabId, direction, forceRerender=false) {
    let panel = docker.find(panelData.id);
    if(panel) {
      if(forceRerender) {
        docker.updateTab(panelData.id, LayoutHelper.getPanel(panelData), true);
      } else {
        LayoutHelper.focus(docker, panelData.id);
      }
    } else {
      let tgtPanel = docker.find(refTabId);
      docker.dockMove(LayoutHelper.getPanel(panelData), tgtPanel, direction);
    }
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

function saveLayout(layoutObj, layoutId) {
  let api = getApiInstance();
  if(!layoutId || !layoutObj) {
    return;
  }
  const formData = new FormData();
  formData.append('setting', layoutId);
  formData.append('value', JSON.stringify(layoutObj.saveLayout()));
  api.post(url_for('settings.store_bulk'), formData)
    .catch(()=>{/* No need to throw error */});
}

function getDialogsGroup() {
  return {
    disableDock: true,
    tabLocked: true,
    floatable: 'singleTab',
    panelExtra: (panelData, context) => (
      <div>
        <PgIconButton title={gettext('Close')} icon={<CloseIcon  />} size="xs" noBorder onClick={()=>{
          context.dockMove(panelData, null, 'remove');
        }} />
      </div>
    )
  };
}

function getDefaultGroup() {
  return {
    maximizable: false,
    panelExtra: (panelData, context) => {
      let icon = <ExpandDialogIcon style={{width: '0.7em'}}/>;
      let title = gettext('Maximise');
      if(panelData?.parent?.mode == 'maximize') {
        icon = <MinimizeDialogIcon />;
        title = gettext('Restore');
      }
      return <div>
        <PgIconButton title={title} icon={icon} size="xs" noBorder onClick={()=>{
          context.dockMove(panelData, null, 'maximize');
        }} />
      </div>;
    }
  };
}

export default function Layout({groups, getLayoutInstance, layoutId, savedLayout, ...props}) {
  const classes = useStyles();
  const layoutObj = useRef();
  const defaultGroups = React.useMemo(()=>({
    'dialogs': getDialogsGroup(),
    'default': getDefaultGroup(),
    ...groups,
  }), [groups]);

  const layoutEventBus = React.useRef(new EventBus());
  return useMemo(()=>(
    <div className={classes.docklayout}>
      <LayoutEventsContext.Provider value={layoutEventBus.current}>
        <DockLayout
          style={{
            height: '100%',
          }}
          ref={(obj)=>{
            layoutObj.current = obj;
            if(layoutObj.current) {
              layoutObj.current.resetLayout = ()=>{
                layoutObj.current.loadLayout(props.defaultLayout);
                saveLayout(layoutObj.current, layoutId);
              };
            }
            getLayoutInstance?.(layoutObj.current);
            try {
              layoutObj.current?.loadLayout(JSON.parse(savedLayout));
            } catch {
              /* Fallback to default */
              layoutObj.current?.loadLayout(props.defaultLayout);
            }
          }}
          groups={defaultGroups}
          onLayoutChange={(_l, currentTabId, direction)=>{
            saveLayout(layoutObj.current, layoutId);
            direction = direction == 'update' ? 'active' : direction;
            if(Object.values(LAYOUT_EVENTS).indexOf(direction) > -1) {
              layoutEventBus.current.fireEvent(LAYOUT_EVENTS[direction.toUpperCase()], currentTabId);
            }
          }}
          {...props}
        />
      </LayoutEventsContext.Provider>
    </div>
  ), []);
}

Layout.propTypes = {
  groups: PropTypes.object,
  getLayoutInstance: PropTypes.func,
};


export const LAYOUT_EVENTS = {
  ACTIVE: 'active',
  REMOVE: 'remove',
  FLOAT: 'float',
  FRONT: 'front',
  MAXIMIZE: 'maximize',
  MOVE: 'move',
};
