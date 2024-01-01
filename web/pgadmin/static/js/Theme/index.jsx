/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The complete styling file for Material-UI components used
 * This will become the main theme file for pgAdmin. All the
 * custom themes info will come here.
 */

import React, { useMemo } from 'react';
import { createTheme, ThemeProvider, makeStyles } from '@material-ui/core/styles';
import CustomPropTypes from '../custom_prop_types';

import getStandardTheme from './standard';
import getDarkTheme from './dark';
import getHightContrastTheme from './high_contrast';
import { CssBaseline } from '@material-ui/core';
import pickrOverride from './overrides/pickr.override';
import uplotOverride from './overrides/uplot.override';
import rcdockOverride from './overrides/rcdock.override';

/* Common settings across all themes */
let basicSettings = createTheme();
basicSettings = createTheme(basicSettings, {
  typography: {
    fontSize: 14,
    htmlFontSize: 14,
    fontFamily: [
      'Roboto',
      '"Helvetica Neue"',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  shape: {
    borderRadius: 4,
  },
  palette: {
    action: {
      disabledOpacity: 0.32,
    }
  },
  overrides: {
    MuiTabs: {
      root: {
        minHeight: 0,
      }
    },
    PrivateTabIndicator: {
      root: {
        height: '2px',
        transition: basicSettings.transitions.create(['all'], {duration: '150ms'}),
      }
    },
    MuiTab: {
      root: {
        textTransform: 'none',
        minHeight: 0,
        padding: '3px 10px',
        [basicSettings.breakpoints.up('xs')]: {
          minWidth: 0,
        },
        [basicSettings.breakpoints.up('sm')]: {
          minWidth: 0,
        },
        [basicSettings.breakpoints.up('md')]: {
          minWidth: 0,
        },
        [basicSettings.breakpoints.up('lg')]: {
          minWidth: 0,
        },
      },
      textColorInherit: {
        textTransform: 'none',
        opacity: 1,
      }
    },
    MuiButton: {
      root: {
        textTransform: 'none',
        padding: '2px 10px',
        fontSize: 'inherit',
        '&.Mui-disabled': {
          opacity: 0.60,
        },
        '&.MuiButton-sizeSmall, &.MuiButton-outlinedSizeSmall, &.MuiButton-containedSizeSmall': {
          height: '28px',
          fontSize: '0.875rem',
          '& .MuiSvgIcon-root': {
            height: '1.2rem',
          }
        },
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        }
      },
      outlined: {
        padding: '2px 10px',
      },
      startIcon: {
        marginRight: basicSettings.spacing(0.5),
      },
    },
    MuiOutlinedInput: {
      multiline: {
        padding: '0px',
      },
      input: {
        padding: basicSettings.spacing(0.75, 1.5),
        borderRadius: 'inherit',
      },
      inputMultiline: {
        padding: basicSettings.spacing(0.75, 1.5),
        resize: 'vertical',
        height: '100%',
        boxSizing: 'border-box',
      },
      adornedEnd: {
        paddingRight: basicSettings.spacing(0.75),
      },
      marginDense: {
        height: '28px',
      }
    },
    MuiAccordion: {
      root: {
        boxShadow: 'none',
      }
    },
    MuiAccordionSummary: {
      root: {
        minHeight: 0,
        '&.Mui-expanded': {
          minHeight: 0,
        },
        padding: basicSettings.spacing(0, 1),
        fontWeight: basicSettings.typography.fontWeightBold,
      },
      content: {
        margin: basicSettings.spacing(0.5),
        '&.Mui-expanded': {
          margin: basicSettings.spacing(0.5),
        }
      },
      expandIcon: {
        order: -1,
      }
    },
    MuiAccordionDetails: {
      root: {
        padding: basicSettings.spacing(1),
      }
    },
    MuiFormControlLabel: {
      root: {
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      }
    },
    MuiFormHelperText: {
      root: {
        fontSize: '1em',
      },
      contained: {
        marginLeft: 0,
        marginRight: 0,
      }
    },
    MuiTypography: {
      body1: {
        fontSize: '1em',
      }
    },
    MuiDialog: {
      paper: {
        margin: 0,
      },
      scrollPaper: {
        alignItems: 'flex-start',
        margin: '5% auto',
      }
    },
    MuiTooltip: {
      popper: {
        top: 0,
        zIndex: 9999,
      },
    },
    MuiMenu: {
      list: {
        padding: '0',
      }
    },
    MuiMenuItem: {
      root: {
        fontSize: 14,
      }
    },
    MuiSelect: {
      selectMenu: {
        minHeight: 'unset',
      },
      select:{
        '&:focus':{
          backgroundColor: 'unset',
        }
      }
    }
  },
  transitions: {
    create: () => 'none',
  },
  zIndex: {
    modal: 3001,
  },
  props: {
    MuiTextField: {
      variant: 'outlined',
    },
    MuiButton: {
      disableTouchRipple: true,
    },
    MuiIconButton: {
      size: 'small',
      disableTouchRipple: true,
    },
    MuiAccordion: {
      defaultExpanded: true,
    },
    MuiTab: {
      textColor: 'inherit',
    },
    MuiCheckbox: {
      disableTouchRipple: true,
    },
    MuiDialogTitle: {
      disableTypography: true,
    },
    MuiCardHeader: {
      disableTypography: true,
    },
    MuiListItem: {
      disableGutters: true,
    },
    MuiTooltip: {
      arrow: true,
    }
  },
});

/* Get the final theme after merging base theme with selected theme */
function getFinalTheme(baseTheme) {
  let mixins = {
    panelBorder: {
      border: '1px solid '+baseTheme.otherVars.borderColor,
      all: {
        border: '1px solid '+baseTheme.otherVars.borderColor,
      },
      top: {
        borderTop: '1px solid '+baseTheme.otherVars.borderColor,
      },
      bottom: {
        borderBottom: '1px solid '+baseTheme.otherVars.borderColor,
      },
      right: {
        borderRight: '1px solid '+baseTheme.otherVars.borderColor,
      }
    },
    nodeIcon: {
      backgroundPosition: 'center',
      padding: baseTheme.spacing(0, 1.5),
    },
    tabPanel: {
      height: '100%',
      padding: baseTheme.spacing(1),
      overflow: 'auto',
      backgroundColor: baseTheme.palette.grey[400],
      position: 'relative',
    },
    fontSourceCode: {
      fontFamily: '"Source Code Pro", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    }
  };

  baseTheme = createTheme({
    mixins: mixins,
  }, baseTheme);

  return createTheme({
    overrides: {
      MuiCssBaseline: {
        '@global': {
          body: {
            fontFamily: baseTheme.typography.fontFamily,
          },
          ul: {
            margin: 0,
            padding: 0,
          },
          li: {
            listStyle: 'none',
            margin: 0,
            padding: 0,
          },
          textarea: {
            fontFamily: 'inherit',
          },
          iframe: {
            margin: 0,
            padding: 0,
          },
          svg: {
            verticalAlign: 'middle',
          },
          img: {
            verticalAlign: 'middle',
          },
          ...pickrOverride(baseTheme),
          ...uplotOverride(baseTheme),
          ...rcdockOverride(baseTheme),
        },
      },
      MuiOutlinedInput:  {
        root: {
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: baseTheme.otherVars.inputBorderColor,
          },
        },
        notchedOutline: {
          borderColor: baseTheme.otherVars.inputBorderColor,
        }
      },
      MuiFormControlLabel: {
        label: {
          '&.Mui-disabled': {
            color: baseTheme.palette.text.muted
          }
        }
      },
      MuiTabs: {
        root: {
          backgroundColor: baseTheme.otherVars.headerBg,
          ...mixins.panelBorder.bottom
        },
        indicator: {
          backgroundColor: baseTheme.otherVars.activeColor,
        }
      },
      MuiFormLabel: {
        root: {
          color: baseTheme.palette.text.primary,
          fontSize: baseTheme.typography.fontSize,
        },
        asterisk: {
          color: baseTheme.palette.error.main,
        }
      },
      MuiInputBase: {
        root: {
          backgroundColor: baseTheme.palette.background.default,
          textOverflow: 'ellipsis',
          '&.Mui-disabled': {
            backgroundColor: baseTheme.otherVars.inputDisabledBg,
          },
        },
        inputMultiline: {
          fontSize: baseTheme.typography.fontSize,
          height: 'unset',
          backgroundColor: baseTheme.palette.background.default,
          '&[readonly], &.Mui-disabled': {
            color: baseTheme.palette.text.muted,
            backgroundColor: baseTheme.otherVars.inputDisabledBg,
          },
        },
        input: {
          fontSize: baseTheme.typography.fontSize,
          height: 'unset',
          backgroundColor: baseTheme.palette.background.default,
          '&[readonly], &.Mui-disabled': {
            color: baseTheme.palette.text.muted,
            backgroundColor: baseTheme.otherVars.inputDisabledBg,
          },
          '&:focus': {
            outline: '0 !important',
          }
        },
      },
      MuiSelect: {
        icon: {
          color: baseTheme.palette.text.primary,
          '&.Mui-disabled': {
            color: baseTheme.palette.text.muted,
          }
        },
      },
      MuiIconButton: {
        root: {
          color: baseTheme.palette.text.primary,
          '&$disabled': {
            color: 'abc',
          }
        }
      },
      MuiAccordion: {
        root: {
          ...mixins.panelBorder,
          '&.Mui-expanded': {
            margin: '8px 0px',
          },
        }
      },
      MuiAccordionSummary: {
        root: {
          ...mixins.panelBorder.bottom,
          backgroundColor: baseTheme.otherVars.headerBg,
        },
        content: {
          margin: '4px',
        }
      },
      MuiToggleButtonGroup: {
        groupedHorizontal : {
          '&:not(:first-child)': {
            borderLeft: 'abc'
          }
        }
      },
      MuiSwitch: {
        root: {
          width: 54,
          height: 28,
          padding: '7px 12px',
        },
        colorPrimary: {
          '&$disabled': {
            color: 'abc',
            '& + .MuiSwitch-track': {
              backgroundColor: 'abc',
            }
          }
        },
        switchBase: {
          padding: baseTheme.spacing(0.5),
          '&$disabled': {
            color: 'abc',
            '& + .MuiSwitch-track': {
              opacity: baseTheme.palette.action.disabledOpacity,
            }
          },
          '&.Mui-checked': {
            color: baseTheme.palette.success.main,
            transform: 'translateX(24px)',
            '& .MuiSwitch-thumb': {
              border: 0
            }
          },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: baseTheme.palette.success.light,
          },
        },
        thumb: {
          border: '1px solid ' + baseTheme.otherVars.inputBorderColor
        },
        track: {
          backgroundColor: baseTheme.otherVars.toggleBtnBg
        }
      },
      MuiCheckbox: {
        root: {
          padding: '0px',
          color: baseTheme.otherVars.inputBorderColor,
        },

        colorPrimary: {
          '&.Mui-disabled': {
            color: baseTheme.palette.checkbox.disabled
          }
        }
      },
      MuiToggleButton: {
        root: {
          padding: 'abc',
          paddingRight: baseTheme.spacing(2.5),
          paddingLeft: baseTheme.spacing(0.5),
          color: 'abc',
          '&:hover':{
            backgroundColor: 'abc',
          },
          '&$selected': {
            color: 'abc',
            backgroundColor: 'abc',
            '&:hover':{
              backgroundColor: 'abc',
            }
          }
        },

        label: {
          textTransform: 'initial',
        }
      },
      MuiFormHelperText: {
        root: {
          color: baseTheme.palette.text.muted,
        },
      },
      MuiDialogContent: {
        root: {
          padding: 0,
          userSelect: 'text',
        }
      },
      MuiDialogTitle: {
        root: {
          fontWeight: 'bold',
          padding: '5px 10px',
          cursor: 'move',
          display: 'flex',
          alignItems: 'center',
          ...mixins.panelBorder.bottom,
        }
      },
      MuiCardHeader: {
        root: {
          padding: '4px 8px',
          backgroundColor: baseTheme.otherVars.cardHeaderBg,
          fontWeight: 'bold',
          ...mixins.panelBorder.bottom,
        }
      },
      MuiCardContent: {
        root: {
          padding: 0,
          '&:last-child': {
            paddingBottom: 0,
          }
        }
      },
      MuiListItem: {
        root: {
          color: baseTheme.palette.text.primary,
          backgroundColor: baseTheme.palette.background.default,
          flexDirection: 'column',
          alignItems: 'initial',
          padding: '0px 4px',
          paddingTop: '0px',
          paddingBottom: '0px',
          ...mixins.panelBorder.top,
          ...mixins.panelBorder.bottom,
          borderTopColor: 'transparent',
          cursor: 'pointer',
          '&$selected': {
            backgroundColor: baseTheme.palette.primary.light,
            borderColor: baseTheme.palette.primary.main,
            color: basicSettings.palette.getContrastText(baseTheme.palette.primary.light),
            '&:hover': {
              backgroundColor: baseTheme.palette.primary.light,
            }
          },
        }
      },
      MuiTooltip: {
        tooltip: {
          fontSize: '0.7rem',
          color: baseTheme.palette.background.default,
          backgroundColor: baseTheme.palette.text.primary,
        },
        arrow: {
          color: baseTheme.palette.text.primary,
        }
      },
      MuiTab: {
        root: {
          '&$selected': {
            color: baseTheme.otherVars.activeColor,
          },
        }
      },
      MuiBackdrop: {
        root: {
          backgroundColor: baseTheme.otherVars.loader.backgroundColor,
        }
      }
    }
  }, baseTheme);
}

/* Theme wrapper used by DOM containers to apply theme */
/* In future, this will be moved to App container */
export default function Theme(props) {
  const theme = useMemo(()=>{
    /* We'll remove this in future, we can get the value from preferences directly */
    let themeName = document.querySelector('link[data-theme]')?.getAttribute('data-theme');
    let baseTheme = getStandardTheme(basicSettings);
    switch(themeName) {
    case 'dark':
      baseTheme = getDarkTheme(baseTheme);
      break;
    case 'high_contrast':
      baseTheme = getHightContrastTheme(baseTheme);
      break;
    }
    return getFinalTheme(baseTheme);
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {props.children}
    </ThemeProvider>
  );
}

Theme.propTypes = {
  children: CustomPropTypes.children,
};

export const commonTableStyles = makeStyles((theme)=>({
  table: {
    borderSpacing: 0,
    width: '100%',
    overflow: 'auto',
    backgroundColor: theme.otherVars.tableBg,
    border: '1px solid '+theme.otherVars.borderColor,
    '& tbody td, & thead th': {
      margin: 0,
      padding: theme.spacing(0.5),
      border: '1px solid '+theme.otherVars.borderColor,
      borderBottom: 'none',
      position: 'relative',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      userSelect: 'text',
      maxWidth: '250px',
      '&:first-of-type':{
        borderLeft: 'none',
      },
    },
    '& thead tr:first-of-type th': {
      borderTop: 'none',
    },
    '& tbody tr:last-of-type': {
      '&:hover td': {
        borderBottomColor: theme.palette.primary.main,
      },
      '& td': {
        borderBottomColor: theme.otherVars.borderColor,
      }
    },
    '& th': {
      fontWeight: theme.typography.fontWeightBold,
      padding: theme.spacing(1, 0.5),
      textAlign: 'left',
    },
    '& tbody > tr': {
      '&:hover': {
        backgroundColor: theme.palette.primary.light,
        '& td': {
          borderBottom: '1px solid '+theme.palette.primary.main,
          borderTop: '1px solid '+theme.palette.primary.main,
        },
        '&:last-of-type td': {
          borderBottomColor: theme.palette.primary.main,
        },
      },
    },
  },
  noBorder: {
    border: 0,
  },
  borderBottom: {
    '& tbody tr:last-of-type td': {
      borderBottom: '1px solid '+theme.otherVars.borderColor,
    },
  },
  wrapTd: {
    '& tbody td': {
      whiteSpace: 'pre-wrap',
    }
  },
  noHover: {
    '& tbody > tr': {
      '&:hover': {
        backgroundColor: theme.otherVars.tableBg,
        '& td': {
          borderBottomColor: theme.otherVars.borderColor,
          borderTopColor: theme.otherVars.borderColor,
        },
        '&:last-of-type td': {
          borderBottomColor: theme.otherVars.borderColor,
        },
      },
    },
  }
}));
