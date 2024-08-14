/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The standard theme */
import { alpha, darken, createTheme} from '@mui/material/styles';

export default function(basicSettings) {
  return createTheme(basicSettings, {
    name: 'light',
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
        hoverLight: darken('#d6effc', 0.05),
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
      colorBrand: '#326690',
      iconLoaderUrl: 'url("data:image/svg+xml,%3C%3Fxml version=\'1.0\' encoding=\'utf-8\'%3F%3E%3C!-- Generator: Adobe Illustrator 23.1.1, SVG Export Plug-In . SVG Version: 6.00 Build 0) --%3E%3Csvg version=\'1.1\' id=\'Layer_1\' xmlns=\'http://www.w3.org/2000/svg\' xmlns:xlink=\'http://www.w3.org/1999/xlink\' x=\'0px\' y=\'0px\' viewBox=\'0 0 38 38\' style=\'enable-background:new 0 0 38 38;\' xml:space=\'preserve\'%3E%3Cstyle type=\'text/css\'%3E .st0%7Bfill:none;stroke:%23EBEEF3;stroke-width:5;%7D .st1%7Bfill:none;stroke:%23326690;stroke-width:5;%7D%0A%3C/style%3E%3Cg%3E%3Cg transform=\'translate(1 1)\'%3E%3Ccircle class=\'st0\' cx=\'18\' cy=\'18\' r=\'16\'/%3E%3Cpath class=\'st1\' d=\'M34,18c0-8.8-7.2-16-16-16 \'%3E%3CanimateTransform accumulate=\'none\' additive=\'replace\' attributeName=\'transform\' calcMode=\'linear\' dur=\'0.7s\' fill=\'remove\' from=\'0 18 18\' repeatCount=\'indefinite\' restart=\'always\' to=\'360 18 18\' type=\'rotate\'%3E%3C/animateTransform%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E%0A");',
      iconLoaderSmall: 'url("data:image/svg+xml,%3C%3Fxml version=\'1.0\' encoding=\'utf-8\'%3F%3E%3C!-- Generator: Adobe Illustrator 23.1.1, SVG Export Plug-In . SVG Version: 6.00 Build 0) --%3E%3Csvg version=\'1.1\' id=\'Layer_1\' xmlns=\'http://www.w3.org/2000/svg\' xmlns:xlink=\'http://www.w3.org/1999/xlink\' x=\'0px\' y=\'0px\' viewBox=\'0 0 38 38\' style=\'enable-background:new 0 0 38 38;\' xml:space=\'preserve\'%3E%3Cstyle type=\'text/css\'%3E .st0%7Bfill:none;stroke:%23EBEEF3;stroke-width:5;%7D .st1%7Bfill:none;stroke:%23326690;stroke-width:5;%7D%0A%3C/style%3E%3Cg%3E%3Cg transform=\'translate(1 1)\'%3E%3Ccircle class=\'st0\' cx=\'18\' cy=\'18\' r=\'16\'/%3E%3Cpath class=\'st1\' d=\'M34,18c0-8.8-7.2-16-16-16 \'%3E%3CanimateTransform accumulate=\'none\' additive=\'replace\' attributeName=\'transform\' calcMode=\'linear\' dur=\'0.7s\' fill=\'remove\' from=\'0 18 18\' repeatCount=\'indefinite\' restart=\'always\' to=\'360 18 18\' type=\'rotate\'%3E%3C/animateTransform%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E%0A")',
      dashboardPgDoc: 'url("data:image/svg+xml,%3C%3Fxml version=\'1.0\' encoding=\'utf-8\'%3F%3E%3C!-- Generator: Adobe Illustrator 22.1.0, SVG Export Plug-In . SVG Version: 6.00 Build 0) --%3E%3Csvg version=\'1.1\' id=\'Layer_1\' xmlns=\'http://www.w3.org/2000/svg\' xmlns:xlink=\'http://www.w3.org/1999/xlink\' x=\'0px\' y=\'0px\' viewBox=\'0 0 42 42\' style=\'enable-background:new 0 0 42 42;\' xml:space=\'preserve\'%3E%3Cstyle type=\'text/css\'%3E .st0%7Bstroke:%23000000;stroke-width:3.3022;%7D .st1%7Bfill:%23336791;%7D .st2%7Bfill:none;stroke:%23FFFFFF;stroke-width:1.1007;stroke-linecap:round;stroke-linejoin:round;%7D .st3%7Bfill:none;stroke:%23FFFFFF;stroke-width:1.1007;stroke-linecap:round;stroke-linejoin:bevel;%7D .st4%7Bfill:%23FFFFFF;stroke:%23FFFFFF;stroke-width:0.3669;%7D .st5%7Bfill:%23FFFFFF;stroke:%23FFFFFF;stroke-width:0.1835;%7D .st6%7Bfill:none;stroke:%23FFFFFF;stroke-width:0.2649;stroke-linecap:round;stroke-linejoin:round;%7D%0A%3C/style%3E%3Cg id=\'orginal\'%3E%3C/g%3E%3Cg id=\'Layer_x0020_3\'%3E%3Cpath class=\'st0\' d=\'M31.3,30c0.3-2.1,0.2-2.4,1.7-2.1l0.4,0c1.2,0.1,2.8-0.2,3.7-0.6c2-0.9,3.1-2.4,1.2-2 c-4.4,0.9-4.7-0.6-4.7-0.6c4.7-7,6.7-15.8,5-18c-4.6-5.9-12.6-3.1-12.7-3l0,0c-0.9-0.2-1.9-0.3-3-0.3c-2,0-3.5,0.5-4.7,1.4 c0,0-14.3-5.9-13.6,7.4c0.1,2.8,4,21.3,8.7,15.7c1.7-2,3.3-3.8,3.3-3.8c0.8,0.5,1.8,0.8,2.8,0.7l0.1-0.1c0,0.3,0,0.5,0,0.8 c-1.2,1.3-0.8,1.6-3.2,2.1c-2.4,0.5-1,1.4-0.1,1.6c1.1,0.3,3.7,0.7,5.5-1.8l-0.1,0.3c0.5,0.4,0.4,2.7,0.5,4.4 c0.1,1.7,0.2,3.2,0.5,4.1c0.3,0.9,0.7,3.3,3.9,2.6C29.1,38.3,31.1,37.5,31.3,30\'/%3E%3Cpath class=\'st1\' d=\'M38.3,25.3c-4.4,0.9-4.7-0.6-4.7-0.6c4.7-7,6.7-15.8,5-18c-4.6-5.9-12.6-3.1-12.7-3l0,0 c-0.9-0.2-1.9-0.3-3-0.3c-2,0-3.5,0.5-4.7,1.4c0,0-14.3-5.9-13.6,7.4c0.1,2.8,4,21.3,8.7,15.7c1.7-2,3.3-3.8,3.3-3.8 c0.8,0.5,1.8,0.8,2.8,0.7l0.1-0.1c0,0.3,0,0.5,0,0.8c-1.2,1.3-0.8,1.6-3.2,2.1c-2.4,0.5-1,1.4-0.1,1.6c1.1,0.3,3.7,0.7,5.5-1.8 l-0.1,0.3c0.5,0.4,0.8,2.4,0.7,4.3c-0.1,1.9-0.1,3.2,0.3,4.2c0.4,1,0.7,3.3,3.9,2.6c2.6-0.6,4-2,4.2-4.5c0.1-1.7,0.4-1.5,0.5-3 l0.2-0.7c0.3-2.3,0-3.1,1.7-2.8l0.4,0c1.2,0.1,2.8-0.2,3.7-0.6C39,26.4,40.2,24.9,38.3,25.3L38.3,25.3z\'/%3E%3Cpath class=\'st2\' d=\'M21.8,26.6c-0.1,4.4,0,8.8,0.5,9.8c0.4,1.1,1.3,3.2,4.5,2.5c2.6-0.6,3.6-1.7,4-4.1c0.3-1.8,0.9-6.7,1-7.7\'/%3E%3Cpath class=\'st2\' d=\'M18,4.7c0,0-14.3-5.8-13.6,7.4c0.1,2.8,4,21.3,8.7,15.7c1.7-2,3.2-3.7,3.2-3.7\'/%3E%3Cpath class=\'st2\' d=\'M25.7,3.6c-0.5,0.2,7.9-3.1,12.7,3c1.7,2.2-0.3,11-5,18\'/%3E%3Cpath class=\'st3\' d=\'M33.5,24.6c0,0,0.3,1.5,4.7,0.6c1.9-0.4,0.8,1.1-1.2,2c-1.6,0.8-5.3,0.9-5.3-0.1 C31.6,24.5,33.6,25.3,33.5,24.6c-0.1-0.6-1.1-1.2-1.7-2.7c-0.5-1.3-7.3-11.2,1.9-9.7c0.3-0.1-2.4-8.7-11-8.9 c-8.6-0.1-8.3,10.6-8.3,10.6\'/%3E%3Cpath class=\'st2\' d=\'M19.4,25.6c-1.2,1.3-0.8,1.6-3.2,2.1c-2.4,0.5-1,1.4-0.1,1.6c1.1,0.3,3.7,0.7,5.5-1.8c0.5-0.8,0-2-0.7-2.3 C20.5,25.1,20,24.9,19.4,25.6L19.4,25.6z\'/%3E%3Cpath class=\'st2\' d=\'M19.3,25.5c-0.1-0.8,0.3-1.7,0.7-2.8c0.6-1.6,2-3.3,0.9-8.5c-0.8-3.9-6.5-0.8-6.5-0.3c0,0.5,0.3,2.7-0.1,5.2 c-0.5,3.3,2.1,6,5,5.7\'/%3E%3Cpath class=\'st4\' d=\'M18,13.8c0,0.2,0.3,0.7,0.8,0.7c0.5,0.1,0.9-0.3,0.9-0.5c0-0.2-0.3-0.4-0.8-0.4C18.4,13.6,18,13.7,18,13.8 L18,13.8z\'/%3E%3Cpath class=\'st5\' d=\'M32,13.5c0,0.2-0.3,0.7-0.8,0.7c-0.5,0.1-0.9-0.3-0.9-0.5c0-0.2,0.3-0.4,0.8-0.4C31.6,13.2,32,13.3,32,13.5 L32,13.5z\'/%3E%3Cpath class=\'st2\' d=\'M33.7,12.2c0.1,1.4-0.3,2.4-0.4,3.9c-0.1,2.2,1,4.7-0.6,7.2\'/%3E%3Cpath class=\'st6\' d=\'M2.7,6.6\'/%3E%3C/g%3E%3C/svg%3E%0A")',
      reactSelect: {
        padding: '5px 8px',
      },
      borderColor: '#dde0e6',
      loader: {
        backgroundColor: alpha('#090d11', 0.6),
        color: '#fff',
      },
      errorColor: '#E53935',
      inputBorderColor: '#dde0e6',
      inputDisabledBg: '#f3f5f9',
      headerBg: '#fff',
      activeBorder: '#326690',
      activeColor: '#326690',
      tableBg: '#fff',
      activeStepBg: '#326690',
      activeStepFg: '#FFFFFF',
      stepBg: '#ddd',
      stepFg: '#000',
      toggleBtnBg: '#000',
      editorToolbarBg: '#ebeef3',
      qtDatagridBg: '#fff',
      qtDatagridSelectFg: '#222',
      cardHeaderBg: '#fff',
      emptySpaceBg: '#ebeef3',
      textMuted: '#646B82',
      erdCanvasBg: '#fff',
      erdGridColor: '#bac1cd',
      explain: {
        sev2: {
          color: '#222222',
          bg: '#FFEE88',
        },
        sev3: {
          color: '#FFFFFF',
          bg: '#EE8800'
        },
        sev4: {
          color: '#FFFFFF',
          bg: '#880000'
        },
      },
      scroll: {
        baseColor: '#bac1cd',
        barBackgroundColor: '#bac1cd33',
        thumbBackground: '#bac1cdb3'
      },
      schemaDiff: {
        diffRowColor: '#fff9c4',
        sourceRowColor: '#ffebee',
        targetRowColor: '#fbe3bf',
        diffColorFg: '#222',
        diffSelectFG: '#222',
        diffSelCheckbox: '#d6effc'
      },
      editor: {
        fg: '#222',
        bg: '#fff',
        selectionBg: '#d6effc',
        keyword: '#908',
        number: '#964',
        string: '#a11',
        variable: '#222',
        type: '#05a',
        comment: '#a50',
        punctuation: '#737373',
        operator: '#222',
        name: '#05a',
        ////
        foldmarker: '#0000FF',
        activeline: '#EDF9FF',
        activelineLight: '#EDF9FF',
        currentQueryBorderColor: '#A5CBE2',
        guttersBg: '#f3f5f9',
        guttersFg: '#848ea0',
      },
      tree: {
        textFg: '#222222',
        inputBg: '#ffffff',
        fgHover: '#222222',
        bgHover: '#ebeef3',
        textHoverFg: '#222222',
        bgSelected: '#d6effc'
      }
    }
  });
}
