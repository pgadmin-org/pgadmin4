/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo, useRef } from 'react';
import {default as OrigCodeMirror} from 'bundled_codemirror';
import {useOnScreen} from 'sources/custom_hooks';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

/* React wrapper for CodeMirror */
export default function CodeMirror({currEditor, name, value, options, events, className}) {
  const taRef = useRef();
  const editor = useRef();
  const cmWrapper = useRef();
  const isVisibleTrack = useRef();

  useEffect(()=>{
    /* Create the object only once on mount */
    editor.current = new OrigCodeMirror.fromTextArea(
      taRef.current, options);

    editor.current.setValue(value);
    currEditor && currEditor(editor.current);
    if(editor.current) {
      try {
        cmWrapper.current = editor.current.getWrapperElement();
      } catch(e) {
        cmWrapper.current = null;
      }
    }

    Object.keys(events||{}).forEach((eventName)=>{
      editor.current.on(eventName, events[eventName]);
    });
  }, []);

  useMemo(() => {
    if(editor.current) {
      editor.current.setValue(value);
    }
  }, [value]);

  const onScreenVisible = useOnScreen(cmWrapper);
  if(!isVisibleTrack.current && onScreenVisible) {
    isVisibleTrack.current = true;
    editor.current?.refresh();
  } else if(!onScreenVisible) {
    isVisibleTrack.current = false;
  }

  return (
    <div className={className}><textarea ref={taRef} name={name} /></div>
  );
}

CodeMirror.propTypes = {
  currEditor: PropTypes.func,
  name: PropTypes.string,
  value: PropTypes.string,
  options: PropTypes.object,
  change: PropTypes.func,
  events: PropTypes.object,
  className: CustomPropTypes.className,
};
