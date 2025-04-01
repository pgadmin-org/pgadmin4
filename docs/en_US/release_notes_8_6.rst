***********
Version 8.6
***********

Release date: 2024-05-02

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.5.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, and 16

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.1


New features
************

  | `Issue #6728 <https://github.com/pgadmin-org/pgadmin4/issues/6728>`_ -  Added the new columns "last_seq_scan" and "last_idx_scan" from the pg_stat_all_tables and pg_stat_all_indexes tables respectively to the Statistics tab.
  | `Issue #7163 <https://github.com/pgadmin-org/pgadmin4/issues/7163>`_ -  Added support for excluding multiple tables while taking Backup.

Housekeeping
************

  | `Issue #7213 <https://github.com/pgadmin-org/pgadmin4/issues/7213>`_ -  Update UI library MUI from v4 to v5, more details `here <https://github.com/pgadmin-org/pgadmin4/commit/102e0a983956be57fdb63abb356b5b8fcb8b74ba>`_
  | `Issue #7362 <https://github.com/pgadmin-org/pgadmin4/issues/7362>`_ -  Upgraded Flask, Flask-Security-Too, Werkzeug, and other dependencies, ensuring compatibility with Python 3.7.

Bug fixes
*********

  | `Issue #2410 <https://github.com/pgadmin-org/pgadmin4/issues/2410>`_ -  Fixed all input boxes in pgAdmin to show browser auto-fill only where it is relevant.
  | `Issue #7173 <https://github.com/pgadmin-org/pgadmin4/issues/7173>`_ -  Install dbus-python, an in-direct dependency of the Keyring package as a system package for Debian platforms.
  | `Issue #7275 <https://github.com/pgadmin-org/pgadmin4/issues/7275>`_ -  Fixed an issue where debugger was not scrolling automatically on stepping.
  | `Issue #7282 <https://github.com/pgadmin-org/pgadmin4/issues/7282>`_ -  Fixed an XSS vulnerability in the /settings/store endpoint (CVE-2024-4216).
  | `Issue #7294 <https://github.com/pgadmin-org/pgadmin4/issues/7294>`_ -  Fixed an issue where double dollar quoted code is treated as string in syntax highlighter.
  | `Issue #7317 <https://github.com/pgadmin-org/pgadmin4/issues/7317>`_ -  Fixed an issue where pressing backspace should remove the spaces and not the entire tab width, on enabling 'Use spaces?' in the preferences.
  | `Issue #7334 <https://github.com/pgadmin-org/pgadmin4/issues/7334>`_ -  Fixed an issue where incorrect select/exec scripts were generated for functions/procedures.
  | `Issue #7372 <https://github.com/pgadmin-org/pgadmin4/issues/7372>`_ -  Fixed an issue where connection to the database is not automatically re-established after connectivity drop.
  | `Issue #7384 <https://github.com/pgadmin-org/pgadmin4/issues/7384>`_ -  Fixed an issue when closing the view data second tab; it raises the error that the 'ViewCommand' object has no attribute 'auto_commit'.
  | `Issue #7390 <https://github.com/pgadmin-org/pgadmin4/issues/7390>`_ -  Fixed violates check constraint issue when creating a pgAgent schedule.
  | `Issue #7425 <https://github.com/pgadmin-org/pgadmin4/issues/7425>`_ -  Fixed Multi-Factor Authentication bypass vulnerability (CVE-2024-4215).