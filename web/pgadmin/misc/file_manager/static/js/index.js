/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import pgAdmin from 'sources/pgadmin';
import FileManagerModule from './FileManagerModule';

/* eslint-disable */
/* This is used to change publicPath of webpack at runtime for loading chunks */
/* Do not add let, var, const to this variable */
__webpack_public_path__ = window.resourceBasePath;
/* eslint-enable */
if(!pgAdmin.Tools) {
  pgAdmin.Tools = {};
}
pgAdmin.Tools.FileManager = FileManagerModule.getInstance(pgAdmin);

module.exports = {
  FileManager: pgAdmin.Tools.FileManager,
};
