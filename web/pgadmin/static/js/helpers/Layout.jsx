import React from 'react';
import DockLayout from 'rc-dock';
import { makeStyles } from '@material-ui/styles';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';


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
    },
    '& .dock-panel': {
      border: 'none',
      '&.dock-style-dialogs': {
        '&.dock-panel.dragging': {
          opacity: 1,
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
      }
    },
    '& .dock-tab': {
      minWidth: 'unset',
      borderBottom: 'none',
      marginRight: 0,
      background: 'unset',
      fontWeight: 'unset',
      '&::hover': {
        color: 'unset',
      }
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
    }
  }
}));


export class LayoutHelper {
  static getPanel(attrs) {
    return {
      cached: true,
      ...attrs,
    };
  }

  static close(docker, panelId) {
    docker.dockMove(docker.find(panelId), 'remove');
  }

  static focus(docker, panelId) {
    docker.updateTab(panelId, null, true);
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
          closable: true,
        })],
      }, null, 'float');
    }
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
}

export default function Layout({groups, layoutInstance, ...props}) {
  const classes = useStyles();
  const defaultGroups = React.useMemo(()=>({
    'dialogs': {
      disableDock: true,
      tabLocked: true,
      floatable: 'singleTab',
    },
    ...groups,
  }), [groups]);
  return (
    <div className={classes.docklayout}>
      <DockLayout
        style={{
          height: '100%',
        }}
        ref={layoutInstance}
        groups={defaultGroups}
        {...props}
      />
    </div>
  );
}

Layout.propTypes = {
  groups: PropTypes.object,
  layoutInstance: CustomPropTypes.ref,
};
