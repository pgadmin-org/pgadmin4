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

import React, { useEffect, useMemo, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import CustomPropTypes from '../custom_prop_types';
import getLightTheme from './light';
import getDarkTheme from './dark';
import getHightContrastTheme from './high_contrast';
import { CssBaseline } from '@mui/material';
import pickrOverride from './overrides/pickr.override';
import uplotOverride from './overrides/uplot.override';
import rcdockOverride from './overrides/rcdock.override';
import cmOverride from './overrides/codemirror.override';
import jsonEditorOverride from './overrides/jsoneditor.override';
import pgadminOverride from './overrides/pgadmin.classes.override';
import reactAspenOverride from './overrides/reactaspen.override';
import usePreferences from '../../../preferences/static/js/store';
import szhMenuOverride from './overrides/szhmenu.override';

/* Common settings across all themes */
let basicSettings = createTheme();
basicSettings = createTheme(basicSettings, {
  typography: {
    fontSize: 14,
    htmlFontSize: 14,
    fontFamilyIcon: '"Font Awesome 5 Free"',
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
  transitions: {
    create: () => 'none',
  },
  zIndex: {
    modal: 3001,
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      }
    },
    MuiButton: {
      defaultProps: {
        disableTouchRipple: true,
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '2px 10px',
          fontSize: 'inherit',
          '&.Mui-disabled': {
            opacity: 0.60,
          },
          '&.MuiButton-sizeSmall, &.MuiButton-outlined.MuiButton-sizeSmall, &.MuiButton-contained.MuiButton-sizeSmall': {
            height: '28px',
            fontSize: '0.875rem',
            '& .MuiSvgIcon-root': {
              height: '1.2rem',
            },
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          }
        },
        outlined: {
          padding: '3px 9px',
        },
        startIcon: {
          marginRight: basicSettings.spacing(0.5),
        },
      }
    },
    MuiIconButton: {
      defaultProps: {
        size: 'small',
        disableTouchRipple: true,
      }
    },
    MuiAccordion: {
      defaultProps: {
        defaultExpanded: true,
      },
      styleOverrides: {
        root: {
          boxShadow: 'none',
        }
      }
    },
    MuiTab: {
      defaultProps: {
        textColor: 'inherit',
      },
      styleOverrides: {
        root: {
          lineHeight: '1.75',
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
      }
    },
    MuiCheckbox: {
      defaultProps: {
        disableTouchRipple: true,
      }
    },
    MuiDialogTitle: {
      defaultProps: {
      }
    },
    MuiCardHeader: {
      defaultProps: {
        disableTypography: true,
      }
    },
    MuiListItem: {
      defaultProps: {
        disableGutters: true,
      }
    },
    MuiListItemButton: {
      defaultProps: {
        disableGutters: true,
        disableTouchRipple: true,
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: '30px',
        }
      }
    },
    PrivateTabIndicator: {
      styleOverrides: {
        root: {
          height: '2px',
          transition: basicSettings.transitions.create(['all'], {duration: '150ms'}),
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
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
      }
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 0,
          '&.Mui-expanded': {
            minHeight: 0,
          },
          padding: basicSettings.spacing(0, 1),
          fontWeight: basicSettings.typography.fontWeightBold
        },
        content: {
          margin: basicSettings.spacing(0.5),
          '&.Mui-expanded': {
            margin: basicSettings.spacing(0.5),
          }
        },
        expandIconWrapper: {
          order: -1,
        }
      }
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: basicSettings.spacing(1),
        }
      }
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          marginBottom: 0,
          marginLeft: 0,
          marginRight: 0,
          gap: '4px'
        }
      }
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '1em',
        },
        contained: {
          marginLeft: 0,
          marginRight: 0,
        }
      }
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          lineHeight: '1.43em',
          letterSpacing: '0.01071em',
        },
        body1: {
          fontSize: '1em',
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: 0,
        },
        scrollPaper: {
          alignItems: 'flex-start',
          margin: '5% auto',
        }
      }
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        popper: {
          top: 0,
          zIndex: 9999,
        },
      }
    },
    MuiMenu: {
      styleOverrides: {
        list: {
          padding: '0',
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14,
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        selectMenu: {
          minHeight: 'unset',
        },
        select:{
          '&:focus':{
            backgroundColor: 'unset',
          }
        }
      }
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
      },
      left: {
        borderLeft: '1px solid '+baseTheme.otherVars.borderColor,
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
      flexGrow: 1,
    },
    fontSourceCode: {
      fontFamily: '"Source Code Pro", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    }
  };

  baseTheme = createTheme({
    mixins: mixins,
  }, baseTheme);

  return createTheme({
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: baseTheme.typography.fontFamily,
            fontSize: '0.875rem',
            lineHeight: '1.43em',
            letterSpacing: '0.01071em',
            height: '100vh',
          },
          '::-webkit-scrollbar,::-webkit-scrollbar-corner': {
            width: '1rem !important',
            height: '1rem !important',
            background: baseTheme.otherVars.scroll.barBackgroundColor
          },
          '::-webkit-scrollbar-thumb': {
            border: '0.25rem solid transparent',
            borderRadius: '0.5rem',
            background: baseTheme.otherVars.scroll.thumbBackground + ' !important',
            backgroundClip: 'content-box !important',
          },
          '::-webkit-scrollbar-thumb:hover': {
            border: '0.25rem solid transparent',
            background: baseTheme.otherVars.scroll.baseColor + ' !important',
            backgroundClip: 'content-box !important'
          },
          'input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,textarea:-webkit-autofill,textarea:-webkit-autofill:hover,textarea:-webkit-autofill:focus,select:-webkit-autofill,select:-webkit-autofill:hover,select:-webkit-autofill:focus': {
            webkitTextFillColor : baseTheme.palette.text.primary,
            webkitBoxShadow: '0 0 0px 1000px '+ baseTheme.palette.primary.light +' inset',
            transition: 'backgroundColor 5000s ease-in-out 0s',
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
            color: baseTheme.palette.text.primary,
            backgroundColor: baseTheme.palette.background.default
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
          ...cmOverride(baseTheme),
          ...jsonEditorOverride(baseTheme),
          ...pgadminOverride(baseTheme),
          ...reactAspenOverride(baseTheme),
          ...szhMenuOverride(baseTheme)
        },
      },
      MuiOutlinedInput:  {
        styleOverrides: {
          root: {
            lineHeight: '1.1876em',
            '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
              borderColor: baseTheme.otherVars.inputBorderColor,
            },
            '.MuiButtonGroup-root &': {
              borderRadius: 0,

              '& .MuiOutlinedInput-notchedOutline': {
                borderRadius: 0,
              }
            },
          },
          notchedOutline: {
            borderColor: baseTheme.otherVars.inputBorderColor,
          }
        }
      },
      MuiFormControlLabel: {
        styleOverrides: {
          label: {
            '&.Mui-disabled': {
              color: baseTheme.palette.text.muted
            }
          }
        }
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            backgroundColor: baseTheme.otherVars.headerBg,
            ...mixins.panelBorder.bottom
          },
          indicator: {
            backgroundColor: baseTheme.otherVars.activeColor,
          }
        }
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: baseTheme.palette.text.primary,
            fontSize: baseTheme.typography.fontSize,
            whiteSpace: 'normal !important'
          },
          asterisk: {
            color: baseTheme.palette.error.main,
          }
        }
      },
      MuiInputBase: {
        styleOverrides: {
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
              WebkitTextFillColor: baseTheme.palette.text.muted
            },
            '&:focus': {
              outline: '0 !important',
            }
          },
          sizeSmall: {
            height: '28px',
          },
          inputSizeSmall: {
            height: '16px', // + 12px of padding = 28px;
          }
        }
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: baseTheme.palette.text.primary,
            '&.Mui-disabled': {
              color: baseTheme.palette.text.muted,
            }
          },
        }
      },
      MuiNativeSelect:{
        styleOverrides: {
          icon: {
            color: baseTheme.palette.text.primary,
            '&.Mui-disabled': {
              color: baseTheme.palette.text.muted,
            }
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: baseTheme.palette.text.primary,
            '&.Mui-disabled': {
              color: 'abc',
            }
          }
        }
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            ...mixins.panelBorder,
            '&.Mui-expanded': {
              margin: '8px 0px',
            },
          }
        }
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            ...mixins.panelBorder.bottom,
            backgroundColor: baseTheme.otherVars.headerBg,
          },
          content: {
            margin: '4px',
          },
          expandIconWrapper: {
            color: baseTheme.palette.text.primary,
          }
        }
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          groupedHorizontal : {
            '&:not(:first-of-type)': {
              borderLeft: 'abc'
            }
          },
          middleButton: {
            borderLeftColor: baseTheme.otherVars.borderColor,
          },
          lastButton: {
            borderLeftColor: baseTheme.otherVars.borderColor,
          }
        }
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 54,
            height: 28,
            padding: '7px 12px',
          },
          colorPrimary: {
            '&.Mui-disabled': {
              color: 'abc',
              '& + .MuiSwitch-track': {
                backgroundColor: 'abc',
              }
            }
          },
          switchBase: {
            padding: baseTheme.spacing(0.5),
            '&.Mui-disabled': {
              color: 'abc',
              '& + .MuiSwitch-track': {
                opacity: baseTheme.palette.action.disabledOpacity,
              }
            },
            '&.Mui-checked': {
              transform: 'translateX(24px)',
              '& .MuiSwitch-thumb': {
                border: 0
              }
            }
          },
          thumb: {
            border: '1px solid ' + baseTheme.otherVars.inputBorderColor
          },
          track: {
            backgroundColor: baseTheme.otherVars.toggleBtnBg
          }
        }
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            padding: '0px',
            color: baseTheme.otherVars.inputBorderColor,
          },

          colorPrimary: {
            '&.Mui-disabled': {
              color: baseTheme.palette.checkbox.disabled
            }
          }
        }
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            padding: '0px',
            color: baseTheme.otherVars.inputBorderColor,
          },

          colorPrimary: {
            '&.Mui-disabled': {
              color: baseTheme.palette.checkbox.disabled
            }
          }
        }
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            padding: '3px 16px 3px 4px',
            color: 'abc',
            textTransform: 'initial',
            '&:hover':{
              backgroundColor: 'abc',
            },
            '&.Mui-selected': {
              color: baseTheme.palette.primary.contrastTextLight ?? baseTheme.palette.primary.main,
              backgroundColor: baseTheme.palette.primary.light,
              borderColor: baseTheme.palette.primary.main,
              zIndex: 1,
              '&:hover':{
                backgroundColor: baseTheme.palette.primary.hoverLight,
              }
            },
            backgroundClip: 'padding-box',
          },
        }
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            color: baseTheme.palette.text.muted,
          },
        }
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: 0,
            userSelect: 'text',
          }
        }
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            fontWeight: 'bold',
            padding: '5px 10px',
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            ...mixins.panelBorder.bottom,
          }
        }
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: '4px 8px',
            backgroundColor: baseTheme.otherVars.cardHeaderBg,
            fontWeight: 'bold',
            ...mixins.panelBorder.bottom,
          }
        }
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 0,
            '&:last-child': {
              paddingBottom: 0,
            }
          }
        }
      },
      MuiListItemButton: {
        styleOverrides: {
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
            '&.Mui-selected': {
              backgroundColor: baseTheme.palette.primary.light,
              borderColor: baseTheme.palette.primary.main,
              color: basicSettings.palette.getContrastText(baseTheme.palette.primary.light),
              '&:hover': {
                backgroundColor: baseTheme.palette.primary.light,
              }
            },
          }
        }
      },
      MuiListItem: {
        styleOverrides: {
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
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.7rem',
            color: baseTheme.palette.background.default,
            backgroundColor: baseTheme.palette.text.primary,
          },
          arrow: {
            color: baseTheme.palette.text.primary,
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            '&.MuiTab-textColorPrimary':{
              color: baseTheme.palette.text.primary,
            },
            '&.Mui-selected': {
              color: baseTheme.otherVars.activeColor,
            },
          }
        }
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: baseTheme.otherVars.loader.backgroundColor,
          }
        }
      }
    }
  }, baseTheme);
}

/* Theme wrapper used by DOM containers to apply theme */
/* In future, this will be moved to App container */
export default function Theme({children}) {
  const prefStore = usePreferences();
  const [theme, setTheme] = useState();

  const themeObj = useMemo(()=>{
    let baseTheme = getLightTheme(basicSettings);
    switch(theme) {
    case 'dark':
      baseTheme = getDarkTheme(baseTheme);
      break;
    case 'high_contrast':
      baseTheme = getHightContrastTheme(baseTheme);
      break;
    }
    return getFinalTheme(baseTheme);
  }, [theme]);

  useEffect(() => {
    const selectedTheme = prefStore.getPreferencesForModule('misc').theme;
    if(theme && theme === selectedTheme) {
      return;
    }else{
      if (selectedTheme !== 'system') {
        setTheme(selectedTheme);
        return;
      }
      const isSystemInDarkMode = matchMedia('(prefers-color-scheme: dark)');
      setTheme(isSystemInDarkMode.matches ? 'dark' : 'light');
      const listener = (event) => {
        setTheme(event.matches ? 'dark' : 'light');
      };
      isSystemInDarkMode.addEventListener('change',listener);
      return () => {
        isSystemInDarkMode.removeEventListener('change',listener);
      };
    }
  },[prefStore]);

  return (
    <ThemeProvider theme={themeObj}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} >
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}

Theme.propTypes = {
  children: CustomPropTypes.children,
};
