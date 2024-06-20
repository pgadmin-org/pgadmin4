/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export default function jsonEditorOverride(theme) {
  return {

    '.jsoneditor-menu a.jsoneditor-poweredBy': {
      display: 'none',
    },

    '.jsoneditor': {
      borderColor: theme.otherVars.borderColor,

      /* Validation Bar */
      '& .jsoneditor-validation-errors': {
        backgroundColor: theme.palette.error.light + ' !important',
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.error.main}`,
      },

      '& .jsoneditor-text-errors': {
        width: '100%',
        borderCollapse: 'collapse',
        borderColor: theme.palette.default.borderColor,
      },


      '& .jsoneditor-text-errors tr, & .jsoneditor-text-errors td, & .jsoneditor-text-errors td pre, & .jsoneditor-text-errors tr.parse-error': {
        backgroundColor: theme.palette.error.light + ' !important',
        color: theme.palette.text.primary,
      }

    },

    /* Navigation Bar */
    '.jsoneditor-navigation-bar': {
      fontFamily: theme.typography.fontFamily + ' !important' ,
      backgroundColor: theme.palette.default.main,
      color: theme.palette.text.primary + ' !important',
      borderBottom: `1px solid ${theme.otherVars.borderColor}`,
    },

    /* Menu Bar*/
    '.jsoneditor-menu': {
      backgroundColor: theme.palette.grey[400],
      border: `1px solid ${theme.otherVars.borderColor}`
    },


    /* Menu Bar buttons*/
    '.jsoneditor-menu>button': {
      fontFamily: '"Font Awesome 5 Free" !important',
      fontSize: '.925rem !important',
      lineHeight: '1.5rem',
      backgroundImage: 'none !important',
      borderRadius: '0.25em',
      borderColor: theme.palette.default.borderColor + ' !important',
      opacity: 1,
      backgroundColor: theme.palette.default.main + ' !important',
      color: theme.palette.text.primary + ' !important',
      fontWeight: 'normal !important',
      cursor:'pointer',

      /* Over rides icons */
      '&.jsoneditor-format::before': {
        content: '"\\f03c"',
        fontWeight: '600 !important',
      },

      '&.jsoneditor-expand-all::before': {
        content: '"\\f424"',
        fontWeight: '600 !important',
      },

      '&.jsoneditor-collapse-all::before': {
        content: '"\\f422"',
        fontWeight: '600 !important',
      },

      '&.jsoneditor-redo::before': {
        content: '"\\f01e"',
        fontWeight: '600 !important',
      },

      '&.jsoneditor-undo::before': {
        content: '"\\f0e2"',
        fontWeight: '600 !important',
      },

      '&.jsoneditor-compact::before': {
        content: '"\\f066"',
        fontWeight: '600 !important',
      },

      '&.jsoneditor-sort::before': {
        content: '"\\f160"',
        fontWeight: '600 !important',
      },

      '&.jsoneditor-repair::before': {
        content: '"\\f0ad"',
        fontWeight: '600 !important',
      },

      '&.jsoneditor-transform::before': {
        content: '"\\f0b0"',
        fontWeight: '600 !important',
      },
    },

    /* Undo redo buttons */
    '.jsoneditor-menu>.jsoneditor-modes>button:disabled, .jsoneditor-menu>button:disabled': {
      color: theme.palette.text.primary + ' !important',
      opacity: 0.65,
      borderColor:theme.palette.grey[400],
      borderRadius: '0.25em',
      backgroundColor: theme.palette.default.main + ' !important',
    },

    /* Mode drop-down */
    '.jsoneditor-menu>.jsoneditor-modes>button:active, .jsoneditor-menu>.jsoneditor-modes>button:focus, .jsoneditor-menu>.jsoneditor-modes>button': {
      fontFamily: theme.typography.fontFamily + ' !important',
      fontSize: '.925rem !important',
      lineHeight: '1.5rem',
      backgroundImage: 'none !important',
      borderRadius: '0.25em',
      borderColor: theme.palette.default.borderColor + ' !important',
      opacity: 1,
      backgroundColor: theme.palette.default.main + ' !important',
      color: theme.palette.text.primary + ' !important',
      fontWeight: 'normal !important',
      cursor:'pointer',
    },

    '.jsoneditor-contextmenu': {

      '& .jsoneditor-icon': {
        backgroundImage: 'none',
      },

      '& .jsoneditor-text': {
        padding: '4px 4px 4px 5px'
      },
      '& .jsoneditor-menu': {
        border:`1px solid ${theme.palette.primary.light}`,
        backgroundColor: theme.palette.default.main + ' !important',
        color: theme.palette.text.primary + ' !important',
      },
      '& .jsoneditor-menu button.jsoneditor-expand': {
        height: '0px',
        backgroundColor: theme.palette.background.default + ' !important'
      },
      '&.jsoneditor-menu li ul': {
        padding: 0,
        border: `1px solid ${theme.palette.primary.light}`,
      },
      '& .jsoneditor-separator': {
        height: 0,
        borderTop: `1px solid ${theme.palette.primary.light}`,
        paddingTop: '5px',
        marginTop: '5px'
      },

      /* Mode drop-down options */
      '& .jsoneditor-menu button, & .jsoneditor-separator':{
        fontFamily: theme.typography.fontFamily + ' !important',
        backgroundColor: theme.palette.default.main + ' !important',
        color: theme.palette.text.primary  + ' !important',
        border: 'none'
      },
      /* Drop-down hovered*/
      '& .jsoneditor-menu li button':{
        /* Drop-down hovered*/
        '&:hover':{
          backgroundColor: theme.palette.primary.main + ' !important',
          borderColor: theme.palette.primary.main + ' !important',
          color: theme.palette.primary.contrastText  + ' !important',
        },
        /* Drop-down selected*/
        '&.jsoneditor-selected, &.jsoneditor-selected:focus, &.jsoneditor-selected:hover': {
          backgroundColor: theme.palette.primary.main + ' !important',
          borderColor: theme.palette.primary.main + ' !important',
          color: theme.palette.primary.contrastText  + ' !important',

        }
      }
    },

    /* Search Box*/
    '.jsoneditor-frame, .jsoneditor-search input': {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.default.main,
    },

    /* Set expand icon to none*/
    'div.jsoneditor-tree button.jsoneditor-button:focus': {
      backgroundColor: theme.palette.background.default + ' !important',
      outline: 'none',
    },

    /* Search Box results */
    '.jsoneditor-results': {
      color: theme.palette.text.primary  + ' !important',
    },


    /* Ace editor Setting */
    /* Ace editor numbers */
    '.ace-jsoneditor':{
      ...theme.mixins.fontSourceCode,
      lineHeight: '1.5 !important',
      fontSize: '0.875em',
      color: theme.palette.text.primary + ' !important',

      '& .ace_gutter':{
        backgroundColor : theme.palette.grey[400],
        color: theme.palette.text.primary
      },
      /* Ace editor code background */
      '& .ace_scroller':{
        backgroundColor: theme.palette.background.default,
      },
      /* Ace editor hide indent guide */
      '& .ace_indent-guide': {
        background: 'none'
      },
      '& .ace_variable': {
        color: theme.palette.text.primary  + ' !important',
      },
      /* Ace editorfonts */
      '&.ace_editor': {
        backgroundColor: theme.palette.background.default + ' !important',
        color: theme.palette.text.primary  + ' !important',
      },
      '& .ace_text-layer':{
        color: theme.palette.text.primary  + ' !important',
      },
      /* Hi-light line in code */
      '& .ace_marker-layer .ace_active-line':{
        backgroundColor: theme.otherVars.editor.selectionBg,
        border: 0,
        borderRadius: '0.25em',
      },
      '& .ace_gutter-active-line': {
        backgroundColor: theme.palette.grey[200],
      },
      '& .ace_marker-layer .ace_selected-word, & .ace_marker-layer .ace_selection': {
        border: `1px solid ${theme.palette.primary.light}`,
        backgroundColor: theme.otherVars.editor.selectionBg,
      },


    },

    'div.jsoneditor td.jsoneditor-tree': {
      verticalAlign: 'middle'
    },

    'pre.jsoneditor-preview': {
      backgroundColor: theme.palette.grey[200] + ' !important',
      opacity: 0.8,
      color: theme.palette.text.primary  + ' !important',
    },

    /* Hilight selected values in tree/form modes  */
    'div':{
      '&.jsoneditor-field.jsoneditor-highlight, &.jsoneditor-field[contenteditable=true]:focus, &.jsoneditor-field[contenteditable=true]:hover, &.jsoneditor-value.jsoneditor-highlight, &.jsoneditor-value[contenteditable=true]:focus, &.jsoneditor-value[contenteditable=true]:hover': {
        backgroundColor: theme.otherVars.editor.selectionBg,
        border: `1px solid ${theme.otherVars.editor.selectionBg}`,
        borderRadius: 0.25
      },

    },


    /* /* font setting all other mode */
    /* form, tree, code, preview, schema-error  */
    'div.jsoneditor-default, div.jsoneditor-field, div.jsoneditor-value, div.jsoneditor textarea, div.jsoneditor td, div.jsoneditor-readonly, .jsoneditor-popover, div.jsoneditor-tree': {
      fontFamily: theme.typography.fontFamily + ' !important',
      fontSize: '.875rem !important',
      lineHeight: '1.5rem',
      backgroundColor: theme.palette.background.default + ' !important',
      color: theme.palette.text.primary + ' !important'
    },

    /* Status Bar */
    '.jsoneditor-statusbar': {
      backgroundColor: theme.palette.grey[400] + ' !important',
      color: theme.palette.text.primary + ' !important',
      borderTop: `1px solid ${theme.otherVars.borderColor}`
    },

    /* Transform & sort */
    /* Header */
    '.jsoneditor-modal .pico-modal-header': {
      fontFamily: theme.typography.fontFamily + ' !important',
      fontSize: '.875rem !important',
      fontWeight: 'bold',
      backgroundColor: theme.palette.background.default + ' !important',
      color: theme.palette.text.primary + ' !important',
      borderBottom: `1px solid ${theme.otherVars.borderColor}`,
    },

    /* Body */
    '.pico-content': {
      backgroundColor: theme.palette.background.default + ' !important',
      '& .pico-close':{
        color: theme.palette.text.primary + ' !important',
      }
    },

    /* Disable links */
    '.jsoneditor-modal a': {
      color: theme.palette.text.primary + ' !important'
    },

    /* Replace help text */
    '.pico-modal-contents p': {
      visibility: 'hidden',
      display: 'flex',
      marginBottom: '-1rem',
      '&::after':{
        visibility: 'visible',
        position: 'absolute',
        content: '"Enter a JMESPath query to filter, sort, or transform the JSON data."'

      }
    },


    /* Fields */
    '.jsoneditor-modal':{
      '& #query, & input, & input[type=text], & input[type=text]:focus, & option, & select, & table td, & table th, & textarea, & label':{
        color: theme.palette.text.primary + ' !important',
        backgroundColor: theme.palette.background.default + ' !important',
        fontFamily: theme.typography.fontFamily + ' !important',
        fontSize: '.875rem !important',
        padding: '4px',

      },
      '& input[type=button]':{
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.default.main,
      },
      /* OK Button */
      '& input[type=submit]':{
        color: theme.palette.primary.contrastText  + ' !important',
        backgroundColor: theme.palette.primary.main + ' !important',
        borderColor: theme.palette.primary.main + ' !important',
        textTransform: 'uppercase',
      },
      '& .jsoneditor-jmespath-label':{
        color: theme.palette.text.primary + ' !important',
        fontWeight: 'bold'
      },
      '& option':{
        backgroundColor: theme.palette.primary.light + ' !important',
        border: `1px solid ${theme.palette.primary.light}` + ' !important',
        borderRadius: '0.25',
        color: theme.palette.text.primary  + ' !important',
      },
      '& .jsoneditor-button-group.jsoneditor-button-group-value-asc input.jsoneditor-button-asc, & .jsoneditor-button-group.jsoneditor-button-group-value-desc input.jsoneditor-button-desc':{
        backgroundColor: theme.palette.primary.main + ' !important',
        borderColor: theme.palette.primary.main + ' !important',
        color: theme.palette.primary.contrastText  + ' !important',
      },
      '& .selectr-selected':{
        color: theme.palette.text.primary  + ' !important',
        backgroundColor: theme.palette.background.default
      },
      '& .selectr-selected .selectr-tag':{
        backgroundColor: theme.palette.primary.main + ' !important',
        borderColor: theme.palette.primary.main,
        border: `1px solid ${theme.palette.primary.main}`,
        color: theme.palette.primary.contrastText  + ' !important',
      },
      '& .selectr-selected .selectr-tag-remove::before':{
        color: theme.palette.primary.main + ' !important',
      }


    },

    '.selectr-option, .selectr-options-container': {
      color: theme.palette.text.primary  + ' !important',
      backgroundColor: theme.palette.default.main
    },

    '.selectr-option.active, .selectr-option.selected': {
      backgroundColor: theme.palette.primary.main + ' !important',
      borderColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText  + ' !important',
    },


    /* Update String. Key colors code mode */
    '.ace_variable': {
      color: theme.otherVars.editor.variable + ' !important',
    },

    '.ace_string': {
      color: theme.otherVars.editor.string + ' !important',
    },

    '.ace_constant.ace_numeric': {
      color: theme.otherVars.editor.number + ' !important',
    },

    /* Update String. Key colors tree/form mode*/
    'div.jsoneditor-value':{
      '&.jsoneditor-string':{
        color: theme.otherVars.editor.string + ' !important',
      },
      ' &.jsoneditor-number':{
        color: theme.otherVars.editor.number + ' !important',

      }
    },

    // /* read only mode */
    '#pg-json-editor[readonly]': {
      '& div.jsoneditor-tree, & div.jsoneditor td, & div.jsoneditor-readonly, & div.jsoneditor-value, & div.jsoneditor-field, & div.jsoneditor-tree button.jsoneditor-button:focus': {
        backgroundColor: theme.palette.grey[400] + ' !important',
        opacity: 0.85
      }
    },

    /* Ace editor code background readonly*/
    '#pg-json-editor[readonly] .ace-jsoneditor .ace_scroller':{
      backgroundColor: theme.palette.grey[400] + ' !important',
      opacity: 0.85
    }








  };
}
