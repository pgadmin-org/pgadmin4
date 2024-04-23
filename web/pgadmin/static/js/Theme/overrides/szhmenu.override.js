/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export default function szhMenuOverride(theme) {
  return {
    '& .szh-menu': {
      padding: '4px 0px',
      zIndex: 1005,
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary,
      border: `1px solid ${theme.otherVars.borderColor}`
    },
    '& .szh-menu__divider': {
      margin: 0,
      background: theme.otherVars.borderColor,
    },
    '& .szh-menu__item': {
      display: 'flex',
      padding: '3px 12px',
      '&:after': {
        right: '0.75rem',
      },
      '&.szh-menu__item--active, &.szh-menu__item--hover': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
      },
      '&.szh-menu__item--disabled':{
        color: theme.palette.text.muted,
      }
    }
  };
}
