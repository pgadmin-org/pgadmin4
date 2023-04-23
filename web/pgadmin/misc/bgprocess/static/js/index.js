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
import BgProcessManager from './BgProcessManager';

if (!pgAdmin.Browser) {
  pgAdmin.Browser = {};
}

pgAdmin.Browser.BgProcessManager = BgProcessManager.getInstance(pgBrowser);

module.exports = {
  BgProcessManager: BgProcessManager,
};

