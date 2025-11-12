/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export default function jsonEditorOverride(theme) {
  return {

    '.jse-main': {
      borderColor: theme.otherVars.borderColor,
      '--jse-font-family': theme.typography.fontFamily,
      '--jse-background-color': theme.otherVars.editor.bg,

      /* Validation Bar */
      '& .jse-message.jse-error': {
        backgroundColor: theme.palette.error.light + ' !important',
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.error.main}`,
      },

      '& .jse-message.jse-success': {
        backgroundColor: theme.palette.success.light + ' !important',
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.success.main}`,        
      },
    },

    /* Navigation Bar */
    '.jse-navigation-bar': {
      fontFamily: theme.typography.fontFamily + ' !important' ,
      '--jse-panel-background': theme.palette.default.main,
      '--jse-navigation-bar-background-highlight': theme.palette.default.main,
      '--jse-panel-button-color': theme.palette.text.primary ,
      borderBottom: `1px solid ${theme.otherVars.borderColor}`,
    },
    '.jse-navigation-bar .jse-navigation-bar-edit:hover': {
      '--jse-panel-button-background-highlight': 'none',
      '--panel-button-color-highlight': 'none',
    },

    '.jse-navigation-bar .jse-navigation-bar-button:hover': {
      '--jse-panel-button-background-highlight': 'none',
      '--panel-button-color-highlight': 'none',
      textDecoration: 'underline'
    },

    '.jse-navigation-bar-dropdown': {
      border:`1px solid ${theme.palette.primary.light}`,
      '--jse-background-color': theme.otherVars.editor.bg,
      '--jse-navigation-bar-dropdown-color': theme.palette.text.primary,
      '& .jse-selected': {
        '--jse-navigation-bar-dropdown-color': theme.palette.primary.main,
        '--jse-background-color': theme.palette.primary.contrastText
      }
    },

    '.jse-navigation-bar-dropdown .jse-navigation-bar-dropdown-item:hover': {
      '--jse-navigation-bar-background-highlight': theme.palette.primary.main,
      borderColor: `${theme.palette.primary.main} !important`,
      color: `${theme.palette.primary.contrastText} !important`,
    },

    '.jse-navigation-bar-path-editor input.jse-navigation-bar-text':{
      '--jse-text-color': 'currentColor',
    },

    /* Menu Bar*/
    '.jse-menu': {
      backgroundColor: `${theme.palette.grey[400]} !important`,
      border: `1px solid ${theme.otherVars.borderColor} `
    },


    /* Menu Bar buttons*/
    '.jse-menu>button': {
      fontFamily: '"Font Awesome 5 Free"',
      fontSize: '.925rem !important',
      lineHeight: '1.5rem',
      backgroundImage: 'none !important',
      borderRadius: '0.25em !important',
      borderColor: theme.palette.default.borderColor + ' !important',
      opacity: 1,
      backgroundColor: theme.palette.default.main + ' !important',
      color: theme.palette.text.primary + ' !important',
      fontWeight: 'normal !important',
      cursor:'pointer',
      padding: '2px 4px !important',
      margin: '1px !important',
    },

    '.jse-button.jse-group-button.jse-selected': {
      color: theme.palette.primary.contrastTextLight ?? theme.palette.primary.main + ' !important',
      backgroundColor: theme.palette.primary.light + ' !important',
      borderColor: theme.palette.primary.main + ' !important',
      borderRight: '1px solid ' + theme.palette.primary.main + ' !important',
      '&:hover':{
        backgroundColor: theme.palette.primary.hoverLight + ' !important',
      }
    },
    
    '.jse-button.jse-group-button.jse-first': {
      borderTopLeftRadius: '0.25em !important',
      borderBottomLeftRadius: '0.25em !important',
      borderTopRightRadius: '0 !important',
      borderBottomRightRadius: '0 !important',
    },

    '.jse-button.jse-group-button.jse-last': {
      borderTopLeftRadius: '0 !important',
      borderBottomLeftRadius: '0 !important',
      borderTopRightRadius: '0.25em !important',
      borderBottomRightRadius: '0.25em !important',
    },

    '.jse-button.jse-group-button': {
      margin: '0 !important',
      height: '32px !important',
      borderRadius: '0 !important',
    },

    /* Status Bar */
    '.jse-status-bar': {
      '--jse-panel-background': theme.otherVars.editor.guttersBg,
      '--jse-panel-color-readonly': theme.otherVars.editor.guttersFg,
      '--jse-font-family-mono': theme.typography.fontFamily
    },

    /* Transform & sort */
    /* Header */
    '.jse-modal .jse-header': {
      '--jse-theme-color': theme.palette.background.default,
      '--jse-menu-color': theme.palette.text.primary
    },

    'dialog.jse-modal .jse-modal-inner': {
      '--jse-font-family': theme.typography.fontFamily,
      '--jse-modal-background': theme.palette.background.default,
      '--jse-text-color': theme.palette.text.primary,
      '& .jse-header': {
        borderBottom: `1px solid ${theme.otherVars.borderColor}`,
        '& .jse-title': {
          color: theme.palette.text.primary,
          fontSize: '0.875rem',
          fontWeight: 'bold',
          padding: '9px'
        }
      },
      '& .jse-actions .jse-primary': {
        '--jse-button-primary-background': theme.palette.primary.main,
        '--jse-button-primary-color': theme.palette.primary.contrastText,
        padding: '6px !important',
        '&:hover': { 
          '--jse-button-primary-background-highlight': theme.palette.primary.hoverMain,
        }

      }
    },

    'dialog.jse-modal .svelte-select': {
      '--jse-item-is-active-bg': theme.palette.primary.main,
      '--jse-svelte-select-background': theme.palette.background.default,
      '--list-background': theme.palette.background.default,
      '--item-is-active-color': theme.palette.primary.contrastText,
      '--jse-hover-background-color': theme.palette.primary.hoverMain,
    },
    '.svelte-select .svelte-select-list .list-item:hover': {
      '--item-hover-bg': theme.palette.primary.main,
      '--item-hover-color': theme.palette.primary.contrastText,
    },
    /* Body */
    '.jse-modal-contents': {
      '--jse-modal-background': theme.palette.background.default,
    },

    '.jse-transform-modal-inner textarea': {
      '--jse-input-background': theme.palette.background.default,
    },

    '.jse-filter-value': {
      '--jse-input-background': theme.palette.background.default,
    },

    '.jse-contextmenu': {
      '--jse-font-family': theme.typography.fontFamily,
    },

    /* Replace help text */
    '.jse-main-contents p': {
      visibility: 'hidden',
      display: 'flex',
      marginBottom: '-1rem',
      '&::after':{
        visibility: 'visible',
        position: 'absolute',
        content: '"Enter a JMESPath query to filter, sort, or transform the JSON data."'
      }
    },

    '.jse-text-mode, .jse-tree-mode, .jse-table-mode': {
      ' --jse-font-family': 'inherit',
      '--jse-key-color': theme.palette.text.primary,
      '--jse-value-color-number': theme.otherVars.editor.number,
      '--jse-value-color-boolean': 'darkorange',
      '--jse-value-color-string': theme.otherVars.editor.string,
      '--jse-value-color-null': theme.otherVars.editor.keyword,
      '--jse-delimiter-color': theme.palette.text.primary,
      '--jse-font-family-mono': theme.typography.fontFamilySourceCode
    },
    '.jse-text-mode .jse-contents .cm-editor .cm-selectionBackground': {
      '--jse-selection-background-color': theme.otherVars.editor.selectionBg,
    },

    '.jse-main:not(.jse-focus)': {
      '--jse-selection-background-inactive-color': theme.otherVars.editor.selectionBg,
    },

    '.jse-table-mode .jse-contents table.jse-table-main .jse-table-row .jse-table-cell.jse-table-cell-header, .jse-table-mode.jse-contents table.jse-table-main .jse-table-row .jse-table-cell.jse-table-cell-gutter': {
      '--jse-table-header-background': theme.otherVars.editor.guttersBg,
      '--jse-text-readonly': theme.otherVars.editor.guttersFg,
    },

    '.jse-table-mode .jse-contents table.jse-table-main .jse-table-row .jse-table-cell.jse-table-cell-gutter': {
      '--jse-table-header-background': theme.otherVars.editor.guttersBg,
      '--jse-text-readonly': theme.otherVars.editor.guttersFg,
    },

    '.jse-column-header:hover': {
      '--jse-table-header-background-highlight': theme.palette.primary.hoverMain,
    },

    '.jse-json-node.jse-selected-value .jse-value-outer, .jse-json-node.jse-selected-value .jse-meta, .jse-json-node.jse-selected-value .jse-items .jse-header, .jse-json-node.jse-selected-value .jse-items .jse-contents, .jse-json-node.jse-selected-value .jse-props .jse-header, .jse-json-node.jse-selected-value .jse-props .jse-contents, .jse-json-node.jse-selected-value .jse-footer': {
      '--jse-selection-background-color': theme.otherVars.editor.selectionBg,
    },
    
    '.jse-json-node.jse-selected .jse-header, .jse-json-node.jse-selected .jse-contents, .jse-json-node.jse-selected .jse-footer': {
      '--jse-selection-background-color': theme.otherVars.editor.selectionBg,
    }
  };
}
