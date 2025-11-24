************
Version 9.11
************

Release date: 2025-12-11

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.10.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.0


New features
************

  | `Issue #6388 <https://github.com/pgadmin-org/pgadmin4/issues/6388>`_ -  Add support of DEPENDS/NO DEPENDS ON EXTENSION for INDEX.
  | `Issue #6390 <https://github.com/pgadmin-org/pgadmin4/issues/6390>`_ -  Add support of DEPENDS/NO DEPENDS ON EXTENSION for MATERIALIZED VIEW.
  | `Issue #8968 <https://github.com/pgadmin-org/pgadmin4/issues/8968>`_ -  Add support for showing the column data type beside column name in the object explorer.
  | `Issue #9263 <https://github.com/pgadmin-org/pgadmin4/issues/9263>`_ -  Added Ubuntu 25.10 and Fedora 43

Housekeeping
************

Bug fixes
*********

  | `Issue #9155 <https://github.com/pgadmin-org/pgadmin4/issues/9155>`_ -  Fix pkg_resources deprecation warning by migrating Docker base image to python:3-alpine from alpine:latest.
  | `Issue #9297 <https://github.com/pgadmin-org/pgadmin4/issues/9297>`_ -  Fixed an issue where EXPLAIN should run on query under cursor if no text is selected.
