/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

export const StyledBox = styled(Box)(({theme}) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  '& .Dialog-form': {
    flexGrow: 1,
    position: 'relative',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  '& .Dialog-footer': {
    padding: theme.spacing(1),
    background: theme.otherVars.headerBg,
    display: 'flex',
    zIndex: 1010,
    ...theme.mixins.panelBorder.top,
    '& .Dialog-buttonMargin': {
      marginRight: '0.5rem',
    },
  },
  '& .Properties-toolbar': {
    padding: theme.spacing(1),
    background: theme.palette.background.default,
    ...theme.mixins.panelBorder.bottom,
  },
  '& .Properties-form': {
    padding: theme.spacing(1),
    overflow: 'auto',
    flexGrow: 1,
    '& .Properties-controlRow:not(:last-child)': {
      marginBottom: theme.spacing(1),
    },
  },
  '& .Properties-noPadding': {
    padding: 0,
  },
}));

export const StyleDataGridBox = styled(Box)(({theme}) => ({
  '& .DataGridView-grid': {
    ...theme.mixins.panelBorder,
    backgroundColor: theme.palette.background.default,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
    '& .DataGridView-gridHeader': {
      display: 'flex',
      ...theme.mixins.panelBorder.bottom,
      backgroundColor: theme.otherVars.headerBg,
      '& .DataGridView-gridHeaderText': {
        padding: theme.spacing(0.5, 1),
        fontWeight: theme.typography.fontWeightBold,
      },
      '& .DataGridView-gridControls': {
        marginLeft: 'auto',
        '& .DataGridView-gridControlsButton': {
          border: 0,
          borderRadius: 0,
          ...theme.mixins.panelBorder.left,
        },
      },
    },
    '& .DataGridView-table': {
      '&.pgrt-table': {
        '& .pgrt-body':{
          '& .pgrt-row': {
            backgroundColor: theme.otherVars.emptySpaceBg,
            '& .pgrt-row-content':{
              '& .pgrd-row-cell': {
                height: 'auto',
                padding: theme.spacing(0.5),
                '&.btn-cell, &.expanded-icon-cell': {
                  padding: '2px 0px'
                },
              }
            },
          }
        }
      }
    },
  },
  '& .DataGridView-tableRowHovered': {
    position: 'relative',
    '& .hover-overlay': {
      backgroundColor: theme.palette.primary.light,
      position: 'absolute',
      inset: 0,
      opacity: 0.75,
    }
  },
  '& .DataGridView-resizer': {
    display: 'inline-block',
    width: '5px',
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
    transform: 'translateX(50%)',
    zIndex: 1,
    touchAction: 'none',
  },
  '& .DataGridView-expandedForm': {
    border: '1px solid '+theme.palette.grey[400],
  },
  '& .DataGridView-expandedIconCell': {
    backgroundColor: theme.palette.grey[400],
    borderBottom: 'none',
  }
}));

export const FormContentBox = styled(Box)(({theme}) => ({
  '& .FormView-nestedControl': {
    height: 'unset !important',
    '& .FormView-controlRow': {
      marginBottom: theme.spacing(1),
    },
    '& .FormView-nestedTabPanel': {
      backgroundColor: theme.otherVars.headerBg,
    }
  },
  '& .FormView-errorMargin': {
    /* Error footer space */
    paddingBottom: '36px !important',
  },
  '& .FormView-fullSpace': {
    padding: '0 !important',
    height: '100%',
    overflow: 'hidden',
    '& .FormView-fullControl': {
      display: 'flex',
      flexDirection: 'column',
      '& .FormView-sqlTabInput, & .Form-sql': {
        border: 0,
      },
    }
  },
  '& .FormView-nonTabPanel': {
    ...theme.mixins.tabPanel,
    '& .FormView-nonTabPanelContent': {
      '&:not(.FormView-fullControl)': {
        height: 'unset',
      },
      '& .FormView-controlRow': {
        marginBottom: theme.spacing(1),
      },
    }
  },
  '& .FormView-singleCollectionPanel': {
    ...theme.mixins.tabPanel,
    '& .FormView-singleCollectionPanelContent': {
      '& .FormView-controlRow': {
        marginBottom: theme.spacing(1),
        height: '100%',
      },
    }
  },
}));
