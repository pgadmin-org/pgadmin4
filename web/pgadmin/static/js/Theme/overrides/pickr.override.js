/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export default function pickrOverride(theme) {
  return {
    '.pickr, .pcr-app': {
      fontFamily: theme.typography.fontFamily,
      '& *:focus': {
        outline: 'none !important',
      },
      '& .pcr-save': {
        backgroundColor: theme.palette.primary.main + '!important',
        borderRadius: theme.shape.borderRadius + 'px !important',
        color: theme.palette.primary.contrastText + '!important',
        border: '1px solid '+theme.palette.primary.main,
      },
      '& .pcr-clear': {
        backgroundColor: theme.palette.default.main + '!important',
        borderRadius: theme.shape.borderRadius + 'px !important',
        color: theme.palette.default.contrastText + '!important',
        border: '1px solid '+theme.palette.default.borderColor,
      },
    }
  };
}
