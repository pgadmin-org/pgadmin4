/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The standard theme */
import { createMuiTheme } from '@material-ui/core/styles';
import { fade, darken } from '@material-ui/core/styles/colorManipulator';

export default function(basicSettings) {
  return createMuiTheme(basicSettings, {
    palette: {
      default: {
        main: '#fff',
        contrastText: '#222',
        borderColor: '#bac1cd',
        disabledBorderColor: '#bac1cd',
        disabledContrastText: '#222',
        hoverMain: '#ebeef3',
        hoverContrastText: '#222',
        hoverBorderColor: '#bac1cd',
      },
      primary: {
        main: '#326690',
        light: '#d6effc',
        contrastText: '#fff',
        hoverMain: darken('#326690', 0.25),
        hoverBorderColor: darken('#326690', 0.25),
        disabledMain: '#326690',
      },
      success:  {
        main: '#26852B',
        light: '#D9ECDA',
        contrastText: '#000',
      },
      error: {
        main: '#CC0000',
        light: '#FAECEC',
        contrastText: '#fff',
      },
      warning: {
        main: '#eea236',
        light: '#fce5c5',
        contrastText: '#000',
      },
      info: {
        main: '#fde74c',
      },
      grey: {
        '200': '#f3f5f9',
        '400': '#ebeef3',
        '600': '#bac1cd',
        '800': '#848ea0',
      },
      text: {
        primary: '#222',
        muted: '#646B82',
      },
      checkbox: {
        disabled: '#ebeef3'
      },
      background: {
        paper: '#fff',
        default: '#fff',
      },
    },
    custom: {
      icon: {
        main: '#fff',
        contrastText: '#222',
        borderColor: '#bac1cd',
        disabledMain: '#fff',
        disabledContrastText: '#222',
        disabledBorderColor: '#bac1cd',
        hoverMain: '#ebeef3',
        hoverContrastText: '#222',
      }
    },
    otherVars: {
      reactSelect: {
        padding: '5px 8px',
      },
      borderColor: '#dde0e6',
      loader: {
        backgroundColor: fade('#000', 0.65),
        color: '#fff',
      },
      inputBorderColor: '#dde0e6',
      inputDisabledBg: '#f3f5f9',
      headerBg: '#fff',
      activeColor: '#326690',
      tableBg: '#fff',
      activeStepBg: '#326690',
      activeStepFg: '#FFFFFF',
      stepBg: '#ddd',
      stepFg: '#000',
      toggleBtnBg: '#000'
    }
  });
}
