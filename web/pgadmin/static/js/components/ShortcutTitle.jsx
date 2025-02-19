/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import { isMac } from '../keyboard_shortcuts';
import _ from 'lodash';
import CustomPropTypes from '../custom_prop_types';
import gettext from 'sources/gettext';

const Root = styled('div')(({theme}) => ({
  '& .ShortcutTitle-title': {
    width: '100%',
    textAlign: 'center',
  },
  '& .ShortcutTitle-shortcut': {
    justifyContent: 'center',
    marginTop: '0.125rem',
    display: 'flex',
    '& .ShortcutTitle-key': {
      padding: '0 0.25rem',
      border: `1px solid ${theme.otherVars.borderColor}`,
      marginRight: '0.125rem',
      borderRadius: theme.shape.borderRadius,
    }
  },
}));

export function getBrowserAccesskey() {
  /* Ref: https://www.w3schools.com/tags/att_accesskey.asp */
  let ua = window.navigator.userAgent;
  // macOS
  if ((/macintosh/i).exec(ua)) {
    return ['Ctrl', 'Option'];
  }

  // Windows / Linux
  if ((/windows/i).exec(ua) || (/linux/i).exec(ua)) {
    if((/firefox/i).exec(ua)) {
      return ['Alt', 'Shift'];
    }
    return ['Alt'];
  }

  // Fallback
  return [gettext('Accesskey')];
}

export function shortcutToString(shortcut, accesskey=null, asArray=false) {
  let keys = [];
  if(accesskey) {
    keys = getBrowserAccesskey();
    keys.push(_.capitalize(accesskey?.toUpperCase()));
  } else if(shortcut) {
    shortcut.alt && keys.push((isMac() ? 'Option' : 'Alt'));
    if(isMac() && shortcut.ctrl_is_meta) {
      shortcut.control && keys.push('Cmd');
    } else {
      shortcut.control && keys.push('Ctrl');
    }
    shortcut.shift && keys.push('Shift');
    keys.push(_.capitalize(shortcut.key.char));
  } else {
    return '';
  }

  return asArray ? keys : keys.join(' + ');
}

/* The tooltip content to show shortcut details */
export default function ShortcutTitle({title, shortcut, accesskey}) {

  let keys = shortcutToString(shortcut, accesskey, true);
  return (
    (<Root>
      <div className='ShortcutTitle-title'>{title}</div>
      <div className='ShortcutTitle-shortcut'>
        {keys.map((key)=>{
          return <div key={key} className='ShortcutTitle-key'>{key}</div>;
        })}
      </div>
    </Root>)
  );
}

ShortcutTitle.propTypes = {
  title: PropTypes.string,
  shortcut: CustomPropTypes.shortcut,
  accesskey: PropTypes.string,
};
