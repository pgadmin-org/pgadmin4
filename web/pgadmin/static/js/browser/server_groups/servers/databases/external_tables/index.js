/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgBrowser from 'top/browser/static/js/browser';
import gettext from 'sources/gettext';
import {initialize} from './external_tables';

let pgBrowserOut = initialize(pgBrowser, gettext);

module.exports = {
  pgBrowser: pgBrowserOut,
};
