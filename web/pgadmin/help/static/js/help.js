//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

export function getHelpUrl(base_path, file, version, server_type) {
  var major = Math.floor(version / 10000),
    minor = Math.floor(version / 100) - (major * 100),
    subminor = version - ((major * 10000) + (minor * 100)),
    url = '',
    replace_string = major + '.' + minor;

  // Handle the version number format change in EPAS 9.6 and below
  if (server_type == 'ppas' && major < 10) {
    replace_string = major + '.' + minor + '.' + subminor;
  } else if (server_type == 'pg' && major >= 10) {
    // Handle the version number format change in PG 10+
    replace_string = major;
  }

  url = base_path.replace('$VERSION$', replace_string);

  if (url.substr(-1) != '/') {
    url = url + '/';
  }

  return url + file;
}
