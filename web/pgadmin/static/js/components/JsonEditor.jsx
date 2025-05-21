/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo, useRef } from 'react';
import { createJSONEditor } from 'vanilla-jsoneditor';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

/* React wrapper for JsonEditor */
export default function JsonEditor({setJsonEditorSize, value, options, className}) {
  const eleRef = useRef();
  const editor = useRef();
  const defaultOptions = {
    mode: 'text',
  };
  const currentMode = useRef(defaultOptions.mode);


  useEffect(()=>{
    /* Create the object only once on mount */
    editor.current = createJSONEditor({
      target: eleRef.current,
      props:{
        ...defaultOptions,
        ...options,
        onChange: (updatedContent) => {
          options.onChange(currentMode.current == 'text' ? updatedContent.text : JSON.stringify(updatedContent.json));
          options.onValidationError(editor.current.validate());
        },
        onChangeMode: (mode) => {
          currentMode.current = mode;
          setJsonEditorSize?.(eleRef.current);
        }
      }
    });
    editor.current.set({text: value}); 
    setJsonEditorSize?.(eleRef.current);
    editor.current.focus();
    return () => {
      // destroy editor
      if (editor.current) {
        editor.current.destroy();
        editor.current = null;
      }
    };
  }, []);

  useMemo(() => {
    if(editor.current) {
      if(value != editor.current.get()[currentMode.current]) {
        editor.current.update({text: value});
      }
    }
  }, [value]);

  return (
    <div ref={eleRef} className={className}></div>
  );
}

JsonEditor.propTypes = {
  setJsonEditorSize: PropTypes.func,
  value: PropTypes.string,
  options: PropTypes.object,
  className: CustomPropTypes.className,
};
