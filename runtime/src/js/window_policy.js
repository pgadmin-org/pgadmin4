/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Decides where URLs opened or navigated to from pgAdmin's windows may be
// loaded. Only pages served by the local pgAdmin server may be loaded in a
// window that has pgadmin_preload.js attached, because that preload exposes
// privileged APIs (file dialogs, downloads that write and open files, etc.)
// to the page. Everything else is either handed to the default browser, or,
// where it genuinely has to stay in the app, loaded without the preload.

// Hosts whose documentation may be shown in an in-app window when the user
// has turned off 'Open Documentation in Default Browser'.
const DOCS_HOSTS = ['www.enterprisedb.com', 'www.postgresql.org', 'www.pgadmin.org'];

// Path under which the pgAdmin server serves its own documentation.
const APP_DOCS_PATH = '/help/help/';

// Window names used by flows that must complete in the app's own session,
// even though they start on a third party site. The Google OAuth flow
// redirects back to the local server, which needs pgAdmin's session cookie
// to accept the callback.
const IN_APP_EXTERNAL_FRAME_NAMES = ['google_authentication'];

// Schemes that may be handed to the operating system's default handler.
const EXTERNAL_SCHEMES = ['http:', 'https:', 'mailto:'];

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

// Returns true if the URL is served by the local pgAdmin server.
export function isAppUrl(url, appBaseUrl) {
  const parsed = parseUrl(url);
  const base = parseUrl(appBaseUrl);
  return Boolean(parsed && base && parsed.origin !== 'null' &&
    parsed.origin === base.origin);
}

// Returns true if the URL may be handed to the default browser or mail client.
export function isExternalUrl(url) {
  const parsed = parseUrl(url);
  return Boolean(parsed && EXTERNAL_SCHEMES.includes(parsed.protocol));
}

// Classifies a window.open() request from a pgAdmin window. Returns one of:
//   'app'      - open in-app, with the pgAdmin preload attached
//   'isolated' - open in-app, without the pgAdmin preload
//   'external' - open in the default browser
//   'deny'     - do not open at all
export function classifyWindowOpen({url, frameName}, appBaseUrl, openDocsInBrowser) {
  // window.open('') gives an about:blank window that the opening pgAdmin page
  // then fills in and submits to the server (see ToolView.jsx).
  if (url === 'about:blank') {
    return 'app';
  }

  const parsed = parseUrl(url);
  if (!parsed) {
    return 'deny';
  }

  if (isAppUrl(url, appBaseUrl)) {
    if (openDocsInBrowser && parsed.pathname.startsWith(APP_DOCS_PATH)) {
      return 'external';
    }
    return 'app';
  }

  if (!isExternalUrl(url)) {
    return 'deny';
  }

  if (parsed.protocol === 'https:' && IN_APP_EXTERNAL_FRAME_NAMES.includes(frameName)) {
    return 'isolated';
  }

  if (!openDocsInBrowser && parsed.protocol !== 'mailto:' &&
      DOCS_HOSTS.includes(parsed.hostname)) {
    return 'isolated';
  }

  return 'external';
}
