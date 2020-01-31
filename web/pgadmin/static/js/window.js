/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

let getWindowOpener = (opener) => {
  return opener.opener && opener.opener.pgAdmin ? getWindowOpener(opener.opener) : opener;
};

let pgWindow = function() {
  let pgWindow = null;
  try {
    if(window.opener && window.opener.pgAdmin) {
      /* Windows can be opened at multiple levels */
      pgWindow = getWindowOpener(window.opener);
    } else if(window.parent && window.parent.pgAdmin){
      pgWindow = window.parent;
    } else if(window.top && window.top.pgAdmin){
      pgWindow = window.top;
    } else {
      pgWindow = window;
    }
  } catch (error) {
    pgWindow = window;
  }
  return pgWindow;
}();

export default pgWindow;
