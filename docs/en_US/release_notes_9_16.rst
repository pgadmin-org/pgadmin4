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

  | `Issue #7346 <https://github.com/pgadmin-org/pgadmin4/issues/7346>`_ -  Fixed an issue where preferences set via the CLI (setup.py set-prefs) were not validated, so invalid values were stored silently; CLI preference values are now validated against the preference type and rejected (and reported) if invalid.
