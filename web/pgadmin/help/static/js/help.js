//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

export function getHelpUrl(base_path, file, version) {
  var major = Math.floor(version / 10000),
    minor = Math.floor(version / 100) - (major * 100),
    url = '';

  // Handle the version number format change in PG 10+
  if (major >= 10) {
    url = base_path.replace('$VERSION$', major);
  } else {
    url = base_path.replace('$VERSION$', major + '.' + minor);
  }

  if (url.substr(-1) != '/') {
    url = url + '/';
  }

  return url + file;
}
