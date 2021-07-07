/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useRef } from 'react';
import {default as OrigCodeMirror} from 'bundled_codemirror';
import {useOnScreen} from 'sources/custom_hooks';
import PropTypes from 'prop-types';

/* React wrapper for CodeMirror */
export default function CodeMirror({name, value, options, events, ...props}) {
  const taRef = useRef();
  const cmObj = useRef();
  const cmWrapper = useRef();
  const isVisibleTrack = useRef();

  useEffect(()=>{
    /* Create the object only once on mount */
    cmObj.current = new OrigCodeMirror.fromTextArea(
      taRef.current, options);

    if(cmObj.current) {
      try {
        cmWrapper.current = cmObj.current.getWrapperElement();
      } catch(e) {
        cmWrapper.current = null;
      }
    }

    Object.keys(events||{}).forEach((eventName)=>{
      cmObj.current.on(eventName, events[eventName]);
    });
  }, []);

  useEffect(()=>{
    /* Refresh when value changes async */
    if(props.isAsync) {
      if(cmObj.current) {
        cmObj.current.setValue(value);
        cmObj.current.refresh();
      }
    }
  }, [value]);

  const onScreenVisible = useOnScreen(cmWrapper);
  if(!isVisibleTrack.current && onScreenVisible) {
    isVisibleTrack.current = true;

    /* Refresh when value changes */
    if(cmObj.current) {
      cmObj.current.setValue(value);
      cmObj.current.refresh();
    }
    cmObj.current.refresh();
  } else if(!onScreenVisible) {
    isVisibleTrack.current = false;
  }

  return <textarea ref={taRef} name={name} />;
}

CodeMirror.propTypes = {
  name: PropTypes.string,
  value: PropTypes.string,
  options: PropTypes.object,
  change: PropTypes.func,
  events: PropTypes.object,
  isAsync: PropTypes.bool
};
