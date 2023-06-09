/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The dark theme */
import { createTheme } from '@material-ui/core/styles';
import { darken } from '@material-ui/core/styles/colorManipulator';

export default function(basicSettings) {
  return createTheme(basicSettings, {
    palette: {
      default: {
        main: '#6b6b6b',
        contrastText: '#fff',
        borderColor: '#2e2e2e',
        disabledBorderColor: '#2e2e2e',
        disabledContrastText: '#fff',
        hoverMain: '#303030',
        hoverContrastText: '#fff',
        hoverBorderColor: '#151515',
      },
      primary: {
        main: '#234d6e',
        light: '#323E43',
        contrastText: '#fff',
        hoverMain: darken('#234d6e', 0.25),
        hoverBorderColor: darken('#234d6e', 0.25),
        disabledMain: '#234d6e',
      },
      success:  {
        main: '#26852B',
        light: '#2B472C',
        contrastText: '#000',
      },
      error: {
        main: '#da6758',
        light: '#212121',
        contrastText: '#fff',
        lighter: '#212121',
      },
      warning: {
        main: '#eea236',
        light: '#b18d5a',
        contrastText: '#fff',
      },
      info: {
        main: '#fde74c',
      },
      grey: {
        '200': '#424242',
        '400': '#303030',
        '600': '#2e2e2e',
        '800': '#212121',
      },
      text: {
        primary: '#d4d4d4',
        muted: '#8A8A8A',
      },
      checkbox: {
        disabled: '#6b6b6b'
      },
      background: {
        paper: '#212121',
        default: '#212121',
      }
    },
    custom: {
      icon: {
        main: '#6b6b6b',
        contrastText: '#fff',
        borderColor: darken('#2e2e2e', 0.6),
        disabledMain: '#6b6b6b',
        disabledContrastText: '#fff',
        disabledBorderColor: '#2e2e2e',
        hoverMain: '#303030',
        hoverContrastText: '#fff',
      }
    },
    otherVars: {
      borderColor: '#4a4a4a',
      inputBorderColor: '#6b6b6b',
      inputDisabledBg: 'inherit',
      errorColor: '#DA6758',
      headerBg: '#424242',
      activeBorder: '#d4d4d4',
      activeColor: '#d4d4d4',
      tableBg: '#424242',
      activeStepBg: '#234d6e',
      activeStepFg: '#FFFFFF',
      stepBg: '#FFFFFF',
      stepFg: '#000',
      toggleBtnBg: '#000',
      editorToolbarBg: '#303030',
      qtDatagridBg: '#2e2e2e',
      qtDatagridSelectFg: '#d4d4d4',
      cardHeaderBg: '#424242',
      colorFg: '#FFFFFF',
      emptySpaceBg: '#212121',
      textMuted: '#8A8A8A',
      erdCanvasBg: '#303030',
      erdGridColor: '#444952',
      schemaDiff: {
        diffRowColor: '#807a48',
        sourceRowColor: '#402025',
        targetRowColor: '#6b5438',
        diffColorFg: '#d4d4d4',
        diffSelectFG: '#d4d4d4',
        diffSelCheckbox: '#323E43'
      }
    }
  });
}
