/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import $ from 'jquery';
import _ from 'underscore';
import pgAdmin from 'sources/pgadmin';
import pgBrowser from 'top/browser/static/js/browser';
import * as csrfToken from 'sources/csrf';
import {initialize} from './erd_module';
var wcDocker = window.wcDocker;

let pgBrowserOut = initialize(gettext, url_for, $, _, pgAdmin, csrfToken, pgBrowser, wcDocker);

module.exports = {
  pgBrowser: pgBrowserOut,
};
