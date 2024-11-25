/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The dark theme */
import {  darken, createTheme} from '@mui/material/styles';

export default function(basicSettings) {
  return createTheme(basicSettings, {
    name: 'dark',
    palette: {
      default: {
        main: '#6b6b6b',
        contrastText: '#fff',
        borderColor: '#282828',
        disabledBorderColor: '#282828',
        disabledContrastText: '#fff',
        hoverMain: '#333333',
        hoverContrastText: '#fff',
        hoverBorderColor: '#151515',
      },
      primary: {
        main: '#234d6e',
        light: '#323E43',
        contrastText: '#fff',
        contrastTextLight: '#fff',
        hoverMain: darken('#234d6e', 0.25),
        hoverBorderColor: darken('#234d6e', 0.25),
        hoverLight: darken('#323E43', 0.25),
        disabledMain: '#234d6e',
      },
      success:  {
        main: '#26852B',
        light: '#2B472C',
        contrastText: '#000',
      },
      error: {
        main: '#da6758',
        light: '#1e1e1e',
        contrastText: '#fff',
        lighter: '#1e1e1e',
      },
      warning: {
        main: '#eea236',
        light: '#74572e',
        contrastText: '#fff',
      },
      info: {
        main: '#fde74c',
      },
      grey: {
        '200': '#424242',
        '400': '#333333',
        '600': '#282828',
        '800': '#1e1e1e',
      },
      text: {
        primary: '#d4d4d4',
        muted: '#8A8A8A',
      },
      checkbox: {
        disabled: '#6b6b6b'
      },
      background: {
        paper: '#1e1e1e',
        default: '#1e1e1e',
      }
    },
    custom: {
      icon: {
        main: '#6b6b6b',
        contrastText: '#fff',
        borderColor: darken('#282828', 0.6),
        disabledMain: '#6b6b6b',
        disabledContrastText: '#fff',
        disabledBorderColor: '#282828',
        hoverMain: '#333333',
        hoverContrastText: '#fff',
      }
    },
    otherVars: {
      colorBrand: '#1b71b5',
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
      editorToolbarBg: '#333333',
      qtDatagridBg: '#282828',
      qtDatagridSelectFg: '#d4d4d4',
      cardHeaderBg: '#424242',
      colorFg: '#FFFFFF',
      emptySpaceBg: '#1e1e1e',
      textMuted: '#8A8A8A',
      erdCanvasBg: '#333333',
      erdGridColor: '#444952',
      noteBg: '#4a4a4a',
      scroll: {
        baseColor: '#616161',
        barBackgroundColor: '#61616133',
        thumbBackground:'#616161b3'
      },
      schemaDiff: {
        diffRowColor: '#807a48',
        sourceRowColor: '#402025',
        targetRowColor: '#6b5438',
        diffColorFg: '#d4d4d4',
        diffSelectFG: '#d4d4d4',
        diffSelCheckbox: '#323E43'
      },
      editor: {
        fg: '#fff',
        bg: '#1e1e1e',
        selectionBg: '#536270',
        keyword: '#db7c74',
        number: '#7fcc5c',
        string: '#e4e487',
        variable: '#7dc9f1',
        type: '#7dc9f1',
        comment: '#7fcc5c',
        punctuation: '#d6aaaa',
        operator: '#d6aaaa',
        name: '#7dc9f1',
        ////
        foldmarker: '#0000FF',
        activeline: '#323e43',
        activelineLight: '#323e43',
        currentQueryBorderColor: '#A5CBE2',
        guttersBg: '#333333',
        guttersFg: '#8A8A8A',
      },
      tree: {
        textFg: '#d4d4d4',
        inputBg: '#1e1e1e',
        fgHover: '#d4d4d4',
        bgHover: '#333333',
        textHoverFg: '#d4d4d4',
        bgSelected: '#323E43',
      }
    }
  });
}
