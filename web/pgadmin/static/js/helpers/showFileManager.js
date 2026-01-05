/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import 'pgadmin.tools.file_manager';

export function showFileManager(...args) {
  pgAdmin.Tools.FileManager.show(...args);
}
