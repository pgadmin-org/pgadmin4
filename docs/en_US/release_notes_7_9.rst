***********
Version 7.9
***********

Release date: 2023-11-23

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v7.8.

Supported Database Servers
**************************
**PostgreSQL**: 11, 12, 13, 14, 15, and 16

**EDB Advanced Server**: 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.0


New features
************

  | `Issue #2821 <https://github.com/pgadmin-org/pgadmin4/issues/2821>`_ -  Have close buttons on individual panel tabs instead of common.
  | `Issue #4733 <https://github.com/pgadmin-org/pgadmin4/issues/4733>`_ -  Allow closing all the tabs, including SQL and Properties.
  | `Issue #5394 <https://github.com/pgadmin-org/pgadmin4/issues/5394>`_ -  Changes in the context menu on panel tabs - Add close, close all and close others menu items.

Housekeeping
************

  | `Issue #6441 <https://github.com/pgadmin-org/pgadmin4/issues/6441>`_ -  Update app bundle built to use notarytool instead of altool.
  | `Issue #6479 <https://github.com/pgadmin-org/pgadmin4/issues/6479>`_ -  Replace the current layout library wcDocker with ReactJS based rc-dock.

Bug fixes
*********

  | `Issue #2986 <https://github.com/pgadmin-org/pgadmin4/issues/2986>`_ -  Fix an issue where the scroll position of panels was not remembered on Firefox.
  | `Issue #5807 <https://github.com/pgadmin-org/pgadmin4/issues/5807>`_ -  Fixed an issue where psql was not taking the role used to connect in server properties.
  | `Issue #6459 <https://github.com/pgadmin-org/pgadmin4/issues/6459>`_ -  Fix the sorting of size on the statistics panel.
  | `Issue #6487 <https://github.com/pgadmin-org/pgadmin4/issues/6487>`_ -  Fixed restoration of query tool database connection after dropping and re-creating the database with the same name.
  | `Issue #6602 <https://github.com/pgadmin-org/pgadmin4/issues/6602>`_ -  Fix an issue where the default server-group is being deleted if the load-server json file contains no servers.
  | `Issue #6720 <https://github.com/pgadmin-org/pgadmin4/issues/6720>`_ -  Fix an issue of the incorrect format (no indent) of SQL stored functions/procedures.
  | `Issue #6769 <https://github.com/pgadmin-org/pgadmin4/issues/6769>`_ -  Server config information in the about dialog should be only visible to admin users.
  | `Issue #6784 <https://github.com/pgadmin-org/pgadmin4/issues/6784>`_ -  Fixed an issue where Schema Diff does not work when the user language is set to any language other than English in Preferences.
  | `Issue #6817 <https://github.com/pgadmin-org/pgadmin4/issues/6817>`_ -  Fixed the query generated when creating subscription where copy_data parameter was missing.
  | `Issue #6820 <https://github.com/pgadmin-org/pgadmin4/issues/6820>`_ -  Ensure backup/restore/maintenance works with invalid pgpass file parameter.
  | `Issue #6874 <https://github.com/pgadmin-org/pgadmin4/issues/6874>`_ -  Fix an issue where the browser window stuck on spinning with an Oauth user without email.
  | `Issue #6875 <https://github.com/pgadmin-org/pgadmin4/issues/6875>`_ -  Fix an issue where import/export data is not working for shared servers.
  | `Issue #6877 <https://github.com/pgadmin-org/pgadmin4/issues/6877>`_ -  Remove the max length of 255 from password exec command in server configuration dialog.
