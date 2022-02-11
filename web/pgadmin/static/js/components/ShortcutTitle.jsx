import React from 'react';
import { makeStyles } from '@material-ui/styles';
import PropTypes from 'prop-types';
import { isMac } from '../keyboard_shortcuts';
import _ from 'lodash';
import CustomPropTypes from '../custom_prop_types';

const useStyles = makeStyles((theme)=>({
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

export function shortcutToString(shortcut, accesskey=null, asArray=false) {
  let keys = [];
  if(accesskey) {
    keys.push('Accesskey');
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
export default function ShortcutTitle({title, shortcut, accessKey}) {
  const classes = useStyles();
  let keys = shortcutToString(shortcut, accessKey, true);
  return (
    <>
      <div>{title}</div>
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
  accessKey: PropTypes.string,
};
