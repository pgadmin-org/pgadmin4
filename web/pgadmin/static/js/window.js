/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

let pgWindow = function() {
  let pgWindow = null;
  try {
    if(window.opener && window.opener.pgAdmin) {
      pgWindow = window.opener;
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
