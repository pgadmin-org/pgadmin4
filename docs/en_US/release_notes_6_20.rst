************
Version 6.20
************

Release date: 2023-02-09

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.19.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

New features
************


Housekeeping
************

  | `Issue #5723 <https://github.com/pgadmin-org/pgadmin4/issues/5723>`_ -  Improve performance by removing signal-based zoom-in, zoom-out, etc functionality from the runtime environment.

Bug fixes
*********

  | `Issue #5567 <https://github.com/pgadmin-org/pgadmin4/issues/5567>`_ -  Fix orphan database connections resulting in an inability to connect to databases.
  | `Issue #5705 <https://github.com/pgadmin-org/pgadmin4/issues/5705>`_ -  Ensure that all parts of the application recommend and enforce the same length of passwords.
  | `Issue #5751 <https://github.com/pgadmin-org/pgadmin4/issues/5751>`_ -  Fix failing import servers CLI due to vulnerability fix.
