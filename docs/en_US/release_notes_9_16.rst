************
Version 9.16
************

Release date: TBD

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.15.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.4


New features
************

Housekeeping
************

Bug fixes
*********

  | `Issue #9829 <https://github.com/pgadmin-org/pgadmin4/issues/9829>`_ -  Fixed installation on Python 3.9 (e.g. RHEL/Rocky/AlmaLinux 8 and 9) failing with "No module named 'pkg_resources'" by pinning setuptools below the version that dropped pkg_resources for Python 3.9.
