//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
// This file contains common utilities functions used in sqleditor modules

module.exports = {
  calcFontSize: function(fontSize) {
    if(fontSize) {
      fontSize = parseFloat((Math.round(parseFloat(fontSize + 'e+2')) + 'e-2'));
      let rounded = Number(fontSize);
      if(rounded > 0) {
        return rounded + 'em';
      }
    }
    return '1em';
  },
};
