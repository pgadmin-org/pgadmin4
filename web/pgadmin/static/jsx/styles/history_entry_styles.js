//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import update from 'immutability-helper';

export const plainOuterDivStyle = {
  paddingLeft: '8px',
  paddingRight: '18px',
  paddingTop: '-2px',
  paddingBottom: '-2px',
  fontFamily: 'monospace',
  fontSize: '14px',
  backgroundColor: '#FFF',
  border: '2px solid transparent',
  marginLeft: '1px',
};

export const sqlStyle = {
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  userSelect: 'auto',
};

export const plainSecondLineStyle = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  fontSize: '13px',
  color: '#888888',
};

export const timestampStyle = {
  alignSelf: 'flex-start',
};

export const selectedFontStyle = {
  color: '#2c76b4',
  fontWeight: 'bold',
};

export const selectedOuterStyle = update(selectedFontStyle, {
  $merge: {
    border: '2px solid #2c76b4',
    backgroundColor: '#e7f2ff',
  },
});

export const errorStyle = {backgroundColor: '#F7D0D5'};

export const selectedErrorBgColor = {backgroundColor: '#DCC4D1'};