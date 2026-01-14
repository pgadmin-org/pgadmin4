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

  | `Issue #8987 <https://github.com/pgadmin-org/pgadmin4/issues/8987>`_ - Fix Query Tool state restoration for new connections and queries.
  | `Issue #9074 <https://github.com/pgadmin-org/pgadmin4/issues/9074>`_ - Fix pg_restore logs to distinguish UI sync issues from actual failures.
  | `Issue #9110 <https://github.com/pgadmin-org/pgadmin4/issues/9110>`_ - Optimize checkbox selection logic in backup dialog objects tree.
  | `Issue #9196 <https://github.com/pgadmin-org/pgadmin4/issues/9196>`_ - Fixed an issue where double click to open a file in the file manager is not working.
  | `Issue #9223 <https://github.com/pgadmin-org/pgadmin4/issues/9223>`_ - Upgrade ID column in the database table to BigInteger to support large OID values.
  | `Issue #9235 <https://github.com/pgadmin-org/pgadmin4/issues/9235>`_ - Fixed an issue where "View/Edit Data" shortcut opened "First 100 rows" instead of "All Rows".
  | `Issue #9258 <https://github.com/pgadmin-org/pgadmin4/issues/9258>`_ - Ensure saved shared server passwords are re-encrypted on password change.
  | `Issue #9260 <https://github.com/pgadmin-org/pgadmin4/issues/9260>`_ - Fixed an issue where data filter dialog removes newline character when sending SQL to the query tool.
  | `Issue #9285 <https://github.com/pgadmin-org/pgadmin4/issues/9285>`_ - Fixed an issue where the dashboard freezes on initial render when there is a high number of locks.
  | `Issue #9293 <https://github.com/pgadmin-org/pgadmin4/issues/9293>`_ - Fixed the SSL certificate issue while checking for the upgrade.
  | `Issue #9332 <https://github.com/pgadmin-org/pgadmin4/issues/9332>`_ - Fixed a sorting issue in the system stats memory usage table.
  | `Issue #9350 <https://github.com/pgadmin-org/pgadmin4/issues/9350>`_ - Disable Parameters and Membership fields when object is not new for Login and group roles.
  | `Issue #9380 <https://github.com/pgadmin-org/pgadmin4/issues/9380>`_ - Fixed an issue where the Query History panel would auto-scroll to the top and did not preserve the scroll bar position for the selected entry.
  | `Issue #9500 <https://github.com/pgadmin-org/pgadmin4/issues/9500>`_ - Fixed an issue where connection parameters were using localized values instead of literal values, causing connection failures.
  | `Issue #9518 <https://github.com/pgadmin-org/pgadmin4/issues/9518>`_ - Mask the secret key for restrict option in the process watcher when restoring plain SQL file.
