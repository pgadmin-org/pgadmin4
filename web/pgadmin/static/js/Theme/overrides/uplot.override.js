/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export default function uplotOverride(theme) {
  return {
    '.uplot': {
      '& .u-legend': {
        display: 'none',
      }
    },
    '.uplot-tooltip': {
      position: 'absolute',
      fontSize: '0.9em',
      padding: '4px 8px',
      borderRadius: theme.shape.borderRadius,
      color: theme.palette.background.default,
      backgroundColor: theme.palette.text.primary,
      zIndex: 9999,
      display: 'block',

      '& .uplot-tooltip-label': {
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
      }
    }
  };
}
