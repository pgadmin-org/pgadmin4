/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export default function rcdockOverride(theme) {
  return {
    '.dock-layout': {
      height: '100%',
      ...theme.mixins.panelBorder.top,
      '& .dock-ink-bar': {
        height: '2px',
        backgroundColor: theme.otherVars.activeBorder,
        color: theme.otherVars.activeColor,
        '&.dock-ink-bar-animated': {
          transition: 'none !important',
        }
      },
      '& .dock-content': {
        backgroundColor: theme.palette.background.default,
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
        '&.dock-style-playground':{
          '&:not([data-dockid="id-main"])': {
            '& .dock-extra-content': {
              display: 'none',
            }
          }
        },
        '&.dock-style-object-explorer': {
          '& .dock-ink-bar': {
            height: '0px',
          },
          '& .dock-tab-active': {
            color: theme.palette.text.primary,
            cursor: 'move',
            '&::hover': {
              color: theme.palette.text.primary,
            }
          },
          '& .dock-tab-btn': {
            pointerEvents: 'none',
          },
          '& .dock-nav-more': {
            display: 'none',
          }
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
          '& .dock-nav-more': {
            display: 'none',
          }
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
        '&.dock-tab-active': {
          color: theme.otherVars.activeColor,
          '&::hover': {
            color: theme.otherVars.activeColor,
          }
        },
        '&::hover': {
          color: 'unset',
        },
        '& > div': {
          padding: '4px 8px',
          '&:focus': {
            outline: '1px solid '+theme.otherVars.activeBorder,
            outlineOffset: '-1px',
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
        },
        '& .dock-tab-icon': {
          fontSize: '1rem',
          marginRight: '4px'
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
        content: '""',
      },
      '& .dock-nav-more': {
        color: theme.custom.icon.contrastText
      }
    },
    '.dock-dropdown': {
      zIndex: 1004,

      '& .dock-dropdown-menu': {
        padding: '4px 0px',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.otherVars.borderColor}`,
      },
      '& .dock-dropdown-menu-item': {
        display: 'flex',
        padding: '3px 12px',
        color: theme.palette.text.primary,
        transition: 'none',
        '&.dock-dropdown-menu-item-active, &:hover': {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        }
      }
    },
  };
}
