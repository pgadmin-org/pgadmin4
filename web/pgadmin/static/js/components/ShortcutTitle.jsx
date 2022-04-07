import React from 'react';
import { makeStyles } from '@material-ui/styles';
import PropTypes from 'prop-types';
import { isMac } from '../keyboard_shortcuts';
import _ from 'lodash';
import CustomPropTypes from '../custom_prop_types';
import gettext from 'sources/gettext';

const useStyles = makeStyles((theme)=>({
  shortcutTitle: {
    width: '100%',
    textAlign: 'center',
  },
  shortcut: {
    justifyContent: 'center',
    marginTop: '0.125rem',
    display: 'flex',
  },
  key: {
    padding: '0 0.25rem',
    border: `1px solid ${theme.otherVars.borderColor}`,
    marginRight: '0.125rem',
    borderRadius: theme.shape.borderRadius,
  },
}));

export function getBrowserAccesskey() {
  /* Ref: https://github.com/tillsanders/access-key-label-polyfill/ */
  let ua = window.navigator.userAgent;
  // macOS
  if (ua.match(/macintosh/i)) {
    // Firefox
    if (ua.match(/firefox/i)) {
      const firefoxVersion = ua.match(/firefox[\s/](\d+)/i);
      // Firefox < v14
      if (firefoxVersion[1] && parseInt(firefoxVersion[1], 10) < 14) {
        return ['Ctrl'];
      }
    }
    return ['Option', 'Ctrl'];
  }

  // Internet Explorer / Edge
  if (ua.match(/msie|trident/i) || ua.match(/\sedg/i)) {
    return ['Alt'];
  }

  // iOS / iPadOS
  if (ua.match(/(ipod|iphone|ipad)/i)) {
    // accesskeyLabel is supported > v14, but we're not checking for versions here, since we use
    // feature support detection
    return ['Option', 'Ctrl'];
  }

  // Fallback
  // Note: Apparently, Chrome for Android is not even supporting accesskey, so be prepared.
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
  const classes = useStyles();
  let keys = shortcutToString(shortcut, accesskey, true);
  return (
    <>
      <div className={classes.shortcutTitle}>{title}</div>
      <div className={classes.shortcut}>
        {keys.map((key, i)=>{
          return <div key={i} className={classes.key}>{key}</div>;
        })}
      </div>
    </>
  );
}

ShortcutTitle.propTypes = {
  title: PropTypes.string,
  shortcut: CustomPropTypes.shortcut,
  accesskey: PropTypes.string,
};
