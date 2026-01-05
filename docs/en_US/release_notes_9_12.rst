************
Version 9.12
************

Release date: 2026-02-05

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.11.

.. warning:: Starting with this release, pgAdmin Windows installers are signed
    with a new code signing certificate. When installing or running pgAdmin on
    Windows, you should verify that the digital signature shows the certificate
    name as **"Open Source Developer, David John Page"**. This certificate will
    be used for this and future releases.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.0


New features
************

  | `Issue #8890 <https://github.com/pgadmin-org/pgadmin4/issues/8890>`_ - Add a new button in the query tool data output toolbar to get entire range of data.


Housekeeping
************

Bug fixes
*********

  | `Issue #9196 <https://github.com/pgadmin-org/pgadmin4/issues/9196>`_ - Fixed an issue where double click to open a file in the file manager is not working.
  | `Issue #9235 <https://github.com/pgadmin-org/pgadmin4/issues/9235>`_ - Fixed an issue where "View/Edit Data" shortcut opened "First 100 rows" instead of "All Rows".
  | `Issue #9260 <https://github.com/pgadmin-org/pgadmin4/issues/9260>`_ - Fixed an issue where data filter dialog removes newline character when sending SQL to the query tool.
  | `Issue #9380 <https://github.com/pgadmin-org/pgadmin4/issues/9380>`_ - Fixed an issue where the Query History panel would auto-scroll to the top and did not preserve the scroll bar position for the selected entry.


