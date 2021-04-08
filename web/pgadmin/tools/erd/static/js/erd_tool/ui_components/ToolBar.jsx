/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { forwardRef } from 'react';
import Tippy from '@tippyjs/react';
import {isMac} from 'sources/keyboard_shortcuts';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import CustomPropTypes from 'sources/custom_prop_types';

/* The base icon button.
React does not pass ref prop to child component hierarchy.
Use forwardRef for the same
*/
const BaseIconButton = forwardRef((props, ref)=>{
  const {icon, text, className, ...otherProps} = props;

  return(
    <button ref={ref} className={className} {...otherProps}>
      {icon && <span className={`${icon} sql-icon-lg`} aria-hidden="true" role="img"></span>}
      {text && <span className="text-icon">{text}</span>}
    </button>
  );
});
BaseIconButton.displayName = 'BaseIconButton';

BaseIconButton.propTypes = {
  icon: PropTypes.string,
  text: PropTypes.string,
  className: PropTypes.string,
  ref: CustomPropTypes.ref,
};


/* The tooltip content to show shortcut details */
export function Shortcut({shortcut}) {
  let keys = [];
  shortcut.alt && keys.push((isMac() ? 'Option' : 'Alt'));
  shortcut.control && keys.push('Ctrl');
  shortcut.shift && keys.push('Shift');
  keys.push(shortcut.key.char.toUpperCase());
  return (
    <div style={{justifyContent: 'center', marginTop: '0.125rem'}} className="d-flex">
      {keys.map((key, i)=>{
        return <div key={i} className="shortcut-key">{key}</div>;
      })}
    </div>
  );
}

const shortcutPropType = PropTypes.shape({
  alt: PropTypes.bool,
  control: PropTypes.bool,
  shift: PropTypes.bool,
  key: PropTypes.shape({
    char: PropTypes.string,
  }),
});

Shortcut.propTypes = {
  shortcut: shortcutPropType,
};

/* The icon button component which can have a tooltip based on props.
React does not pass ref prop to child component hierarchy.
Use forwardRef for the same
*/
export const IconButton = forwardRef((props, ref) => {
  const {title, shortcut, className, ...otherProps} = props;

  if (title) {
    return (
      <Tippy content={
        <>
          {<div style={{textAlign: 'center'}}>{title}</div>}
          {shortcut && <Shortcut shortcut={shortcut} />}
        </>
      }>
        <BaseIconButton ref={ref} className={'btn btn-sm btn-primary-icon ' + (className || '')} {...otherProps}/>
      </Tippy>
    );
  } else {
    return <BaseIconButton ref={ref} className='btn btn-sm btn-primary-icon' {...otherProps}/>;
  }
});
IconButton.displayName = 'IconButton';

IconButton.propTypes = {
  title: PropTypes.string,
  shortcut: shortcutPropType,
  className: PropTypes.string,
};

/* Toggle button, icon changes based on value */
export function DetailsToggleButton({showDetails, ...props}) {
  return (
    <IconButton
      icon={showDetails ? 'far fa-eye' : 'fas fa-low-vision'}
      title={showDetails ? gettext('Show fewer details') : gettext('Show more details') }
      {...props} />
  );
}

DetailsToggleButton.propTypes = {
  showDetails: PropTypes.bool,
};

/* Button group container */
export function ButtonGroup({className, children}) {
  return (
    <div className={'btn-group mr-1 ' + (className ? className : '')} role="group" aria-label="save group">
      {children}
    </div>
  );
}

ButtonGroup.propTypes = {
  className: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]),
};

/* Toolbar container */
export default function ToolBar({id, children}) {
  return (
    <div id={id} className="editor-toolbar d-flex" role="toolbar" aria-label="">
      {children}
    </div>
  );
}

ToolBar.propTypes = {
  id: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]),
};
