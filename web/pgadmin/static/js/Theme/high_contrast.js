/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The dark theme */
import { createTheme } from '@mui/material/styles';

export default function(basicSettings) {
  return createTheme(basicSettings, {
    name: 'high_contrast',
    palette: {
      default: {
        main: '#00000000',
        contrastText: '#84d6ff',
        borderColor: '#84d6ff',
        disabledBorderColor: '#8B9CAD',
        disabledContrastText: '#8B9CAD',
        hoverMain: '#00000000',
        hoverContrastText: '#fff',
        hoverBorderColor: '#fff',
      },
      primary: {
        main: '#84D6FF',
        light: '#84D6FF',
        contrastText: '#010B15',
        contrastTextLight: '#010B15',
        hoverMain: '#fff',
        hoverBorderColor: '#fff',
        disabledMain: '#8B9CAD',
      },
      success:  {
        main: '#45D48A',
        light: '#010B15',
        contrastText: '#000',
      },
      error: {
        main: '#EE7A55',
        light: '#010B15',
        contrastText: '#010B15',
        hoverMain: '#fff',
        hoverBorderColor: '#fff',
      },
      warning: {
        main: '#F4D35E',
        light: '#010B15',
        contrastText: '#010B15',
      },
      info: {
        main: '#fde74c',
      },
      grey: {
        '200': '#8B9CAD',
        '400': '#2D3A48',
        '600': '#1F2932',
        '800': '#010B15',
      },
      text: {
        primary: '#fff',
        muted: '#8b9cac',
      },
      checkbox: {
        disabled: '#6b6b6b'
      },
      background: {
        paper: '#010B15',
        default: '#010B15',
      },
    },
    custom: {
      icon: {
        main: '#010B15',
        contrastText: '#fff',
        borderColor: '#fff',
        disabledMain: '#1F2932',
        disabledContrastText: '#8B9CAD',
        disabledBorderColor: '#8B9CAD',
        hoverMain: '#fff',
        hoverContrastText: '#010B15',
      }
    },
    otherVars: {
      colorBrand: '#84D6FF',
      borderColor: '#A6B7C8',
      inputBorderColor: '#8B9CAD',
      inputDisabledBg: '#1F2932',
      errorColor: '#DA6758',
      headerBg: '#010B15',
      activeBorder: '#fff',
      activeColor: '#fff',
      tableBg: '#010B15',
      activeStepBg: '#84D6FF',
      activeStepFg: '#010b15',
      stepBg: '#FFFFFF',
      stepFg: '#000',
      toggleBtnBg: '#6B6B6B',
      editorToolbarBg: '#010B15',
      qtDatagridBg: '#010B15',
      qtDatagridSelectFg: '#010B15',
      cardHeaderBg: '#062F57',
      colorFg: '#FFFFFF',
      emptySpaceBg: '#010B15',
      textMuted: '#8b9cad',
      erdCanvasBg: '#010B15',
      erdGridColor: '#1F2932',
      noteBg: '#010B15',
      scroll: {
        baseColor: '#C9D0D7',
        barBackgroundColor: '#C9D0D733',
        thumbBackground: '#C9D0D7B3'
      },
      schemaDiff: {
        diffRowColor: '#CFC56E',
        sourceRowColor: '#EE97A5',
        targetRowColor: '#FFAD65',
        diffColorFg: '#FFFFFF',
        diffSelectFG: '#010B15',
        diffSelCheckbox: '#010b15',
      },
      editor: {
        fg: '#fff',
        bg: '#010B15',
        selectionBg: '#1F2932',
        keyword: '#F8845F',
        number: '#45D48A',
        string: '#EAEA43',
        variable: '#7DC9F1',
        type: '#7DC9F1',
        comment: '#FFAD65',
        punctuation: '#d6aaaa',
        operator: '#d6aaaa',
        name: '#7DC9F1',
        ////
        foldmarker: '#FFFFFF',
        activeline: '#063057',
        activelineLight: '#063057',
        currentQueryBorderColor: '#A5CBE2',
        guttersBg: '#2d3a48',
        guttersFg: '#8b9cac',
      },
      tree: {
        textFg: '#ffffff',
        inputBg: '#010B15',
        fgHover: '#ffffff',
        bgHover: '#ffffff',
        textHoverFg: '#010B15',
        bgSelected: '#84D6FF',
      }
    }
  });
}
