/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import EventBus from '../../../static/js/helpers/EventBus';
import pgAdmin from 'sources/pgadmin';

const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};
pgBrowser.Events = new EventBus();

export default pgBrowser;
