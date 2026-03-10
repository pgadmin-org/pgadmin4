************
Version 9.14
************

Release date: 2026-04-02

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.13.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.0


New features
************

  | `Issue #4011 <https://github.com/pgadmin-org/pgadmin4/issues/4011>`_ -  Added support to download binary data from result grid.

Housekeeping
************

Bug fixes
*********

  | `Issue #9279 <https://github.com/pgadmin-org/pgadmin4/issues/9279>`_ -  Fixed an issue where OAuth2 authentication fails with 'object has no attribute' if OAUTH2_AUTO_CREATE_USER is False.
  | `Issue #9392 <https://github.com/pgadmin-org/pgadmin4/issues/9392>`_ -  Ensure that the Geometry Viewer refreshes when re-running queries or switching geometry columns, preventing stale data from being displayed.
  | `Issue #9721 <https://github.com/pgadmin-org/pgadmin4/issues/9721>`_ -  Fixed an issue where permissions page is not completely accessible on full scroll.
