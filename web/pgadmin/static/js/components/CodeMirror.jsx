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
import PropTypes from 'prop-types';

/* React wrapper for CodeMirror */
export default function CodeMirror({name, value, options}) {
  const taRef = useRef();
  const cmObj = useRef();

  useEffect(()=>{
    /* Create the object only once on mount */
    cmObj.current = new OrigCodeMirror.fromTextArea(
      taRef.current, options);
  }, []);

  useEffect(()=>{
    /* Refresh when value changes */
    if(cmObj.current) {
      cmObj.current.setValue(value);
      cmObj.current.refresh();
    }
  }, [value]);

  return <textarea ref={taRef} name={name} />;
}

CodeMirror.propTypes = {
  name: PropTypes.string,
  value: PropTypes.string,
  options: PropTypes.object
};
