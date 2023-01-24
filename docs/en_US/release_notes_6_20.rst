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

  | `Issue #4728 <https://github.com/pgadmin-org/pgadmin4/issues/4728>`_ -  Added support for setting PostgreSQL connection parameters.

Housekeeping
************

  | `Issue #5525 <https://github.com/pgadmin-org/pgadmin4/issues/5525>`_ -  Upgrade Flask-Migrate to 4.x.
  | `Issue #5723 <https://github.com/pgadmin-org/pgadmin4/issues/5723>`_ -  Improve performance by removing signal-based zoom-in, zoom-out, etc functionality from the runtime environment.

Bug fixes
*********

  | `Issue #5532 <https://github.com/pgadmin-org/pgadmin4/issues/5532>`_ -  Fixed an issue where the client cert location was not stored on the shared servers.
  | `Issue #5567 <https://github.com/pgadmin-org/pgadmin4/issues/5567>`_ -  Fix orphan database connections resulting in an inability to connect to databases.
  | `Issue #5705 <https://github.com/pgadmin-org/pgadmin4/issues/5705>`_ -  Ensure that all parts of the application recommend and enforce the same length of passwords.
  | `Issue #5732 <https://github.com/pgadmin-org/pgadmin4/issues/5732>`_ -  Fixed an issue where Kerberos authentication to the server is not imported/exported.
  | `Issue #5751 <https://github.com/pgadmin-org/pgadmin4/issues/5751>`_ -  Fix failing import servers CLI due to vulnerability fix.
  | `Issue #5746 <https://github.com/pgadmin-org/pgadmin4/issues/5746>`_ -  Increase the length of the value column of the setting table.
