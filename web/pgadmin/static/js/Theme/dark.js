/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The dark theme */
import { createMuiTheme } from '@material-ui/core/styles';
import { darken } from '@material-ui/core/styles/colorManipulator';

export default function(basicSettings) {
  return createMuiTheme(basicSettings, {
    palette: {
      default: {
        main: '#6b6b6b',
        contrastText: '#fff',
        borderColor: '#2e2e2e',
        disabledBorderColor: '#2e2e2e',
        disabledContrastText: '#fff',
        hoverMain: '#303030',
        hoverContrastText: '#fff',
        hoverBorderColor: '#2e2e2e',
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
        borderColor: '#2e2e2e',
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
      headerBg: '#424242',
      activeColor: '#d4d4d4',
      tableBg: '#424242',
      activeStepBg: '#234d6e',
      activeStepFg: '#FFFFFF',
      stepBg: '#FFFFFF',
      stepFg: '#000',
      toggleBtnBg: '#000'
    }
  });
}
