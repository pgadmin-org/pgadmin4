/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import pgBrowser from 'top/browser/static/js/browser';
import Debugger from './DebuggerModule';

if (!pgAdmin.Tools) {
  pgAdmin.Tools = {};
}

pgAdmin.Tools.Debugger = Debugger.getInstance(pgAdmin, pgBrowser);

module.exports = {
  Debugger: Debugger,
};
