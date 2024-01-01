//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

export function getHelpUrl(base_path, file, version) {
  let major = Math.floor(version / 10000),
    minor = Math.floor(version / 100) - (major * 100),
    url = '',
    replace_string = major + '.' + minor;

  if (major >= 10) {
    // Handle the version number format change in PG 10+
    replace_string = major;
  }

  url = base_path.replace('$VERSION$', replace_string);

  if (url.substr(-1) != '/') {
    url = url + '/';
  }

  return url + file;
}

export function getEPASHelpUrl(version) {
  let major = Math.floor(version / 10000),
    minor = Math.floor(version / 100) - (major * 100),
    epasHelp11Plus = 'https://www.enterprisedb.com/docs/epas/$VERSION$/epas_compat_sql/',
    epasHelp = 'https://www.enterprisedb.com/docs/epas/$VERSION$/',
    url = '';

  url = epasHelp11Plus.replace('$VERSION$', major);

  if (major == 10) {
    url = epasHelp.replace('$VERSION$', major);
  } else if (major < 10) {
    url = epasHelp.replace('$VERSION$', major + '.' + minor);
  }

  return url;
}
