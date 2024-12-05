/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


export default function reactAspenOverride(theme) {
  return {
    '.drag-tree-node': {
      position: 'absolute',
      top: '-100px',
      left: 0,
      zIndex: 99999,
      color: theme.otherVars.tree.textFg,
      background: theme.otherVars.tree.inputBg,
      padding: '0.25rem 0.75rem',
      maxWidth: '30%',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    },

    '.file-tree': {
      color: theme.otherVars.tree.textFg + ' !important',
      backgroundColor: theme.otherVars.tree.inputBg + ' !important',
      fontFamily: theme.typography.fontFamily + ' !important',
      fontSize: '0.815rem' + ' !important',
      display: 'inline-block',
      position: 'relative',
      width: '100%',
      '&, & *': {
        boxSizing: 'border-box',
      },
    },

    '.browser-tree': {
      height: '100%',
    },

    '.file-tree>': {
      div: {
        position: 'absolute' + ' !important',
        height: '100%' + ' !important',
        top: '0px' + ' !important',

        '>div': {
          scrollbarGutter: 'auto',
          overflow: 'overlay' + ' !important',
        },
      },
    },

    '.file-entry': {
      font: 'inherit',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      padding: '2px 0',
      paddingLeft: '2px',
      cursor: 'default',

      '&:before': {
        content: '""',
        background: theme.palette.grey[400],
        position: 'absolute',
        width: '1px',
        height: '100%',
        // set box-shadow to show tree indent guide.
        boxShadow: `'-16px 0 0 0' + theme.palette.grey[400],
          '-32px 0 0 0' + theme.palette.grey[400],
          '-48px 0 0 0' + theme.palette.grey[400],
          '-64px 0 0 0' + theme.palette.grey[400],
          '-80px 0 0 0' + theme.palette.grey[400],
          '-96px 0 0 0' + theme.palette.grey[400],
          '-112px 0 0 0' + theme.palette.grey[400],
          '-128px 0 0 0' + theme.palette.grey[400],
          '-144px 0 0 0' + theme.palette.grey[400],
          '-160px 0 0 0' + theme.palette.grey[400],
          '-176px 0 0 0' + theme.palette.grey[400],
          '-192px 0 0 0' + theme.palette.grey[400],
          '-208px 0 0 0' + theme.palette.grey[400],
          '-224px 0 0 0' + theme.palette.grey[400],
          '-240px 0 0 0' + theme.palette.grey[400],
          '-256px 0 0 0' + theme.palette.grey[400],
          '-272px 0 0 0' + theme.palette.grey[400],
          '-288px 0 0 0' + theme.palette.grey[400],
          '-304px 0 0 0' + theme.palette.grey[400],
          '-320px 0 0 0' + theme.palette.grey[400],
          '-336px 0 0 0' + theme.palette.grey[400],
          '-352px 0 0 0' + theme.palette.grey[400],
          '-368px 0 0 0' + theme.palette.grey[400],
          '-384px 0 0 0' + theme.palette.grey[400],
          '-400px 0 0 0' + theme.palette.grey[400],
          '-416px 0 0 0' + theme.palette.grey[400],
          '-432px 0 0 0' + theme.palette.grey[400],
          '-448px 0 0 0' + theme.palette.grey[400],
          '-464px 0 0 0' + theme.palette.grey[400],
          '-480px 0 0 0' + theme.palette.grey[400],
          '-496px 0 0 0' + theme.palette.grey[400],
          '-512px 0 0 0' + theme.palette.grey[400],
          '-528px 0 0 0' + theme.palette.grey[400],
          '-544px 0 0 0' + theme.palette.grey[400],
          '-544px 0 0 0' + theme.palette.grey[400],
          '-560px 0 0 0' + theme.palette.grey[400]`,
      },

      '&.big': {
        fontFamily: 'monospace',
      },

      '&:hover, &.pseudo-active': {
        color: theme.otherVars.tree.textHoverFg + ' !important',
        backgroundColor: theme.otherVars.tree.bgHover + ' !important',
        'span.file-label': {
          'span.file-name': {
            color: theme.otherVars.tree.textHoverFg,
          },
        },
      },

      '&.active, &.prompt': {
        color: theme.otherVars.tree.textHoverFg + ' !important',
        backgroundColor: theme.otherVars.tree.bgSelected + ' !important',
        borderColor: theme.otherVars.tree.bgSelected,
        borderRight: '3px solid ' + theme.palette.primary.main + ' !important',
        'span.file-label': {
          'span.file-name': {
            color: theme.otherVars.textHoverFg,
          },
        },
      },

      'span.file-label': {
        display: 'flex',
        gap: '2px',
        alignItems: 'center',
        padding: '0 2px 0 2px',
        border: '1px solid transparent',
        height: 'auto',
        whiteSpace: 'normal',
        cursor: 'pointer !important',
        marginLeft: '2px',
        '&:hover, &.pseudo-active': {
          color: theme.otherVars.tree.fgHover,
        },
      },

      'span.file-name': {
        font: 'inherit',
        flexGrow: 1,
        userSelect: 'none',
        color: theme.otherVars.tree.textFg,
        cursor: 'pointer !important',
        whiteSpace: 'nowrap',
        '&:hover, &.pseudo-active': {
          color: theme.otherVars.tree.fgHover,
        },
      },
      'div.file-tag': {
        color: 'var(--tag-color)',
        border: '1px solid color-mix(in srgb, var(--tag-color) 90%, #fff)',
        padding: '0px 4px',
        borderRadius: theme.shape.borderRadius,
        backgroundColor: 'color-mix(in srgb, color-mix(in srgb, var(--tag-color) 10%, #fff) 50%, transparent);',
        lineHeight: 1.2
      },

      i: {
        display: 'inline-block',
        font: 'normal normal normal 18px/1 "Font Awesome 5 Free"',
        fontSize: '18px',
        textAlign: 'center',
        height: '21px !important',
        width: '20px !important',
        flexShrink: 0,

        '&:before': {
          height: 'inherit',
          width: 'inherit',
          display: 'inline-block',
        },

        '&.directory-toggle': {
          '&:before': {
            backgroundPosition: '6px center !important',
            fontFamily: '"Font Awesome 5 Free"',
            content: '"\\f054"',
            borderStyle: 'none',
            marginLeft: '5px',
            fontWeight: 900,
            right: '15px',
            top: '3px',
            fontSize: '0.6rem',
            lineHeight: 2,
          },

          '&.open:before': {
            backgroundPosition: '-14px center !important',
            fontFamily: theme.typography.fontFamilyIcon,
            content: '"\\f078"',
            borderStyle: 'none',
            marginLeft: '5px',
            fontWeight: 900,
            transform: 'none !important',
          },

          '&.loading:before': {
            content: '""',
            fontFamily: theme.typography.fontFamilyIcon,
            borderStyle: 'none',
            background: theme.otherVars.iconLoaderSmall + ' 0 0 no-repeat',
            backgroundPosition: 'center !important',
          },
        },
      },

      '&.prompt.new .file-label, &.file .file-label': {
        marginLeft: '18px',
      },

      // Set the tree depth CSS from depth
      ...Object.fromEntries(
        new Array(50).fill(0).map((v, i) => {
          return ['&.depth-' + i, { paddingLeft: 16 * (i - 1) + 'px' }];
        })
      ),
    },
  };
}
