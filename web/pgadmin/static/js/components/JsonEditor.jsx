/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo, useRef } from 'react';
import {default as OrigJsonEditor} from 'jsoneditor.min';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

/* React wrapper for JsonEditor */
export default function JsonEditor({getEditor, value, options, className}) {
  const eleRef = useRef();
  const editor = useRef();
  const defaultOptions = {
    modes: ['code', 'form', 'tree','preview'],
  };

  useEffect(()=>{
    const editorResizeObserver = new ResizeObserver(()=>{
      editor.current.resize();
    });
    editorResizeObserver.observe(eleRef.current);
  }, []);

  useEffect(()=>{
    /* Create the object only once on mount */
    editor.current = new OrigJsonEditor(eleRef.current, {
      ...defaultOptions,
      ...options,
      onChange: ()=>{
        let currVal = editor.current.getText();
        if(currVal == '') {
          currVal = null;
        }
        options.onChange(currVal);
      }
    });
    editor.current.setText(value);
    getEditor?.(editor.current);
    editor.current.focus();
    /* Required by json editor */
    eleRef.current.style.height = eleRef.current.offsetHeight + 'px';
  }, []);

  useMemo(() => {
    if(editor.current) {
      if(value != editor.current.getText()) {
        editor.current.setText(value ?? '');
      }
    }
  }, [value]);

  return (
    <div ref={eleRef} className={className}></div>
  );
}

JsonEditor.propTypes = {
  getEditor: PropTypes.func,
  value: PropTypes.string,
  options: PropTypes.object,
  className: CustomPropTypes.className,
};
