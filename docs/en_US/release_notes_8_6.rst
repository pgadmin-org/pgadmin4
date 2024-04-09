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

Housekeeping
************
  | `Issue #7213 <https://github.com/pgadmin-org/pgadmin4/issues/7213>`_ -  Update UI library MUI from v4 to v5, more details `here <https://github.com/pgadmin-org/pgadmin4/commit/f7045b58d4d1b98b6a2f035267d2dd01c7235aa6>`_


Bug fixes
*********
  | `Issue #7294 <https://github.com/pgadmin-org/pgadmin4/issues/7294>`_ -  Fixed an issue where double dollar quoted code is treated as string in syntax highlighter.

