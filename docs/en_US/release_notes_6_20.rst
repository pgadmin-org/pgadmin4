************
Version 6.20
************

Release date: 2023-02-09

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.19.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.1


New features
************

  | `Issue #4728 <https://github.com/pgadmin-org/pgadmin4/issues/4728>`_ -  Added support for setting PostgreSQL connection parameters.

Housekeeping
************

  | `Issue #4320 <https://github.com/pgadmin-org/pgadmin4/issues/4320>`_ -  Added bundled PG utilities in the release note.
  | `Issue #5525 <https://github.com/pgadmin-org/pgadmin4/issues/5525>`_ -  Upgrade Flask-Migrate to 4.x.
  | `Issue #5723 <https://github.com/pgadmin-org/pgadmin4/issues/5723>`_ -  Improve performance by removing signal-based zoom-in, zoom-out, etc functionality from the runtime environment.
  | `Issue #5794 <https://github.com/pgadmin-org/pgadmin4/issues/5794>`_ -  Use uplot for Dashboard graphs to reduce CPU usage.

Bug fixes
*********

  | `Issue #5532 <https://github.com/pgadmin-org/pgadmin4/issues/5532>`_ -  Fixed an issue where the client cert location was not stored on the shared servers.
  | `Issue #5567 <https://github.com/pgadmin-org/pgadmin4/issues/5567>`_ -  Fix orphan database connections resulting in an inability to connect to databases.
  | `Issue #5702 <https://github.com/pgadmin-org/pgadmin4/issues/5702>`_ -  Fix an issue where role is used as username for newly added servers when opening query tool.
  | `Issue #5705 <https://github.com/pgadmin-org/pgadmin4/issues/5705>`_ -  Ensure that all parts of the application recommend and enforce the same length of passwords.
  | `Issue #5732 <https://github.com/pgadmin-org/pgadmin4/issues/5732>`_ -  Fixed an issue where Kerberos authentication to the server is not imported/exported.
  | `Issue #5733 <https://github.com/pgadmin-org/pgadmin4/issues/5733>`_ -  Ensure that the system columns should not visible in the import/export data.
  | `Issue #5746 <https://github.com/pgadmin-org/pgadmin4/issues/5746>`_ -  Increase the length of the value column of the setting table.
  | `Issue #5748 <https://github.com/pgadmin-org/pgadmin4/issues/5748>`_ -  Fixed console error while attaching the partition.
  | `Issue #5751 <https://github.com/pgadmin-org/pgadmin4/issues/5751>`_ -  Fix failing import servers CLI due to vulnerability fix.
  | `Issue #5761 <https://github.com/pgadmin-org/pgadmin4/issues/5761>`_ -  Fix an issue where drag and drop object names is not working.
  | `Issue #5763 <https://github.com/pgadmin-org/pgadmin4/issues/5763>`_ -  Ensure that keyboard hotkey to open query tool and search object should work properly.
  | `Issue #5781 <https://github.com/pgadmin-org/pgadmin4/issues/5781>`_ -  Fixed an issue where Query history is not getting loaded with external database.
  | `Issue #5796 <https://github.com/pgadmin-org/pgadmin4/issues/5796>`_ -  Ensure nested menu items are shown in quick search result.
