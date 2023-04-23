/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

let getWindowOpener = (opener) => {
  return opener.opener && opener.opener.pgAdmin ? getWindowOpener(opener.opener) : opener;
};

let pgWindow = function() {
  let localPgWindow = null;
  try {
    if(window.opener && window.opener.pgAdmin) {
      /* Windows can be opened at multiple levels */
      localPgWindow = getWindowOpener(window.opener);
    } else if(window.parent && window.parent.pgAdmin){
      localPgWindow = window.parent;
    } else if(window.top && window.top.pgAdmin){
      localPgWindow = window.top;
    } else {
      localPgWindow = window;
    }
  } catch (error) {
    localPgWindow = window;
  }
  return localPgWindow;
}();

export default pgWindow;
