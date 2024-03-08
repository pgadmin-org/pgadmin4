***********
Version 8.4
***********

Release date: 2024-03-07

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.3.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, and 16

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.1


New features
************

  | `Issue #6058 <https://github.com/pgadmin-org/pgadmin4/issues/6058>`_ -  Allow preferences customization using a configuration file.
  | `Issue #7138 <https://github.com/pgadmin-org/pgadmin4/issues/7138>`_ -  Add support for JSON log format.
  | `Issue #7204 <https://github.com/pgadmin-org/pgadmin4/issues/7204>`_ -  Add --yes option for skipping the confirmation prompt while deleting the user via CLI for scripting purpose.

Housekeeping
************

  | `Issue #7097 <https://github.com/pgadmin-org/pgadmin4/issues/7097>`_ -  Upgrade CodeMirror from version 5 to 6.
  | `Issue #7148 <https://github.com/pgadmin-org/pgadmin4/issues/7148>`_ -  Added documentation for Dashboard's System Statistics tab.
  | `Issue #7187 <https://github.com/pgadmin-org/pgadmin4/issues/7187>`_ -  Separate the application name, branding & version information from the configuration file.
  | `Issue #7234 <https://github.com/pgadmin-org/pgadmin4/issues/7234>`_ -  Upgrade python packages cryptography to 42.0.x and Flask-Security-Too to 5.3.x.

Bug fixes
*********

  | `Issue #6792 <https://github.com/pgadmin-org/pgadmin4/issues/6792>`_ -  Fix multiple issues where PasswordExecCommand was not working in server mode and PasswordExecCommand was not loaded when importing servers.
  | `Issue #6808 <https://github.com/pgadmin-org/pgadmin4/issues/6808>`_ -  Fix the tabbed panel backward/forward shortcut for tabs.
  | `Issue #7027 <https://github.com/pgadmin-org/pgadmin4/issues/7027>`_ -  Fixed an issue where dependencies and dependents were not showing if a composite type is used as an attribute in another composite type.
  | `Issue #7164 <https://github.com/pgadmin-org/pgadmin4/issues/7164>`_ -  Fix an issue where constraint check control is enabled in the edit table dialog.
  | `Issue #7165 <https://github.com/pgadmin-org/pgadmin4/issues/7165>`_ -  Fix an issue where the scripts created by generate script of Schema diff for Table with sequence was not working earlier.
  | `Issue #7193 <https://github.com/pgadmin-org/pgadmin4/issues/7193>`_ -  Ensure that the OAuth2 session is logged out when users log out from pgAdmin.
  | `Issue #7217 <https://github.com/pgadmin-org/pgadmin4/issues/7217>`_ -  Remove role related checks on the UI dashboard when terminating session/query and let PostgreSQL take care of it.
  | `Issue #7225 <https://github.com/pgadmin-org/pgadmin4/issues/7225>`_ -  Fix an issue where type column in dependents/dependencies tab is not showing correct label.
  | `Issue #7258 <https://github.com/pgadmin-org/pgadmin4/issues/7258>`_ -  Unsafe Deserialization and Remote Code Execution by an Authenticated user in pgAdmin 4 (CVE-2024-2044).