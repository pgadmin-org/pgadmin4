/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([],
  function () {
    var sizePrettify = function (rawSize) {
      var size = Math.abs(rawSize),
        limit = 10 * 1024,
        limit2 = limit - 1,
        cnt = 0,
        sizeUnits = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];

      if (size < limit)
        return size + ' ' + sizeUnits[cnt]; // return in bytes format
      else
      {
        do {
          size = size / 1024;
          cnt += 1;
        } while (size > limit2);

        return Math.round(size) + ' ' + sizeUnits[cnt];
      }
    };

    return sizePrettify;
  });
