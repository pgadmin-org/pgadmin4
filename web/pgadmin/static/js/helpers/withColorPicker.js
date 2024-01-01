/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* React HOC on color pickr */
import Pickr from '@simonwep/pickr';
import React, { useEffect, useRef } from 'react';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import { fullHexColor } from '../utils';

export function withColorPicker(Component) {
  // eslint-disable-next-line react/display-name
  const HOCComponent = ({value, currObj, onChange, onSave, options, ...props})=>{
    const pickrOptions = {
      showPalette: true,
      allowEmpty: true,
      allowSave: false,
      colorFormat: 'HEX',
      defaultColor: null,
      position: 'right-middle',
      clearText: gettext('Clear'),
      ...options,
    };
    const eleRef = useRef();
    const pickrObj = useRef();
    const onChangeRef = useRef();
    const onSaveRef = useRef();

    onChangeRef.current = onChange;
    onSaveRef.current = onSave;

    const setColor = (newVal, silent) => {
      pickrObj.current?.setColor((_.isUndefined(newVal) || newVal == '') ? pickrOptions.defaultColor : newVal, silent);
    };

    const destroyPickr = () => {
      if (pickrObj.current) {
        pickrObj.current.destroy();
        pickrObj.current = null;
      }
    };

    const initPickr = () => {
      /* pickr does not have way to update options, need to
      destroy and recreate pickr to reflect options */
      destroyPickr();

      pickrObj.current = new Pickr({
        el: eleRef.current,
        useAsButton: true,
        theme: 'monolith',
        swatches: [
          '#000', '#666', '#ccc', '#fff', '#f90', '#ff0', '#0f0',
          '#f0f', '#f4cccc', '#fce5cd', '#d0e0e3', '#cfe2f3', '#ead1dc', '#ea9999',
          '#b6d7a8', '#a2c4c9', '#d5a6bd', '#e06666', '#93c47d', '#76a5af', '#c27ba0',
          '#f1c232', '#6aa84f', '#45818e', '#a64d79', '#bf9000', '#0c343d', '#4c1130',
        ],
        position: pickrOptions.position,
        strings: {
          clear: pickrOptions.clearText,
        },
        components: {
          palette: pickrOptions.showPalette,
          preview: true,
          hue: pickrOptions.showPalette,
          interaction: {
            clear: pickrOptions.allowEmpty,
            defaultRepresentation: pickrOptions.colorFormat,
            disabled: pickrOptions.disabled,
            save: pickrOptions.allowSave,
          },
        },
      }).on('init', instance => {
        setColor(value);
        pickrOptions.disabled && instance.disable();

        const { lastColor } = instance.getRoot().preview;
        const { clear } = instance.getRoot().interaction;

        /* Cycle the keyboard navigation within the color picker */
        clear.addEventListener('keydown', (e) => {
          if (e.keyCode === 9) {
            e.preventDefault();
            e.stopPropagation();
            lastColor.focus();
          }
        });

        lastColor.addEventListener('keydown', (e) => {
          if (e.keyCode === 9 && e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            clear.focus();
          }
        });
      }).on('clear', () => {
        onChangeRef.current?.('');
      }).on('change', (color) => {
        onChangeRef.current?.(color.toHEXA().toString());
      }).on('show', (color, instance) => {
        const { palette } = instance.getRoot().palette;
        palette.focus();
      }).on('hide', (instance) => {
        const button = instance.getRoot().button;
        button.focus();
      }).on('save', (color, instance) => {
        if(color) {
          color.toHEXA().toString() != fullHexColor(value) && onSaveRef.current?.(color.toHEXA().toString());
          instance?.hide();
        } else {
          onSaveRef.current?.('');
        }
      });

      if (currObj) {
        currObj(pickrObj.current);
      }
    };

    useEffect(() => {
      initPickr();
      return () => {
        destroyPickr();
      };
    }, [...Object.values(pickrOptions)]);

    useEffect(() => {
      if (pickrObj.current) {
        setColor(value, true);
      }
    }, [value]);

    return <Component ref={eleRef} {...props}/>;
  };

  HOCComponent.propTypes = {
    value: PropTypes.string,
    currObj: PropTypes.func,
    onChange: PropTypes.func,
    onSave: PropTypes.func,
    options: PropTypes.object,
  };

  return HOCComponent;
}
