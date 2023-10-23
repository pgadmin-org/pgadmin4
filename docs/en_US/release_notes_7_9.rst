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

Housekeeping
************

Bug fixes
*********

  | `Issue #2821 <https://github.com/pgadmin-org/pgadmin4/issues/2821>`_ -  Have close buttons on individual panel tabs instead of common.
  | `Issue #2986 <https://github.com/pgadmin-org/pgadmin4/issues/2986>`_ -  Fix an issue where the scroll position of panels was not remembered on Firefox.
  | `Issue #4733 <https://github.com/pgadmin-org/pgadmin4/issues/4733>`_ -  Allow closing all the tabs, including SQL and Properties.
  | `Issue #5394 <https://github.com/pgadmin-org/pgadmin4/issues/5394>`_ -  Changes in the context menu on panel tabs - Add close, close all and close others menu items.
  | `Issue #6479 <https://github.com/pgadmin-org/pgadmin4/issues/6479>`_ -  Replace the current layout library wcDocker with ReactJS based rc-dock.
  | `Issue #6602 <https://github.com/pgadmin-org/pgadmin4/issues/6602>`_ -  Fix an issue where the default server-group is being deleted if the load-server json file contains no servers.
  | `Issue #6720 <https://github.com/pgadmin-org/pgadmin4/issues/6720>`_ -  Fix an issue of the incorrect format (no indent) of SQL stored functions/procedures.
  | `Issue #6874 <https://github.com/pgadmin-org/pgadmin4/issues/6874>`_ -  Fix an issue where the browser window stuck on spinning with an Oauth user without email.
