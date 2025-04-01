************
Version 6.18
************

Release date: 2022-12-19

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.17.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

New features
************

  | `Issue #4088 <https://github.com/pgadmin-org/pgadmin4/issues/4088>`_ -  Enhancements to the ERD when selecting a relationship.
  | `Issue #5503 <https://github.com/pgadmin-org/pgadmin4/issues/5503>`_ -  Added native menu support in desktop mode.

Housekeeping
************


Bug fixes
*********

  | `Issue #5453 <https://github.com/pgadmin-org/pgadmin4/issues/5453>`_ -  Fixed an issue where Transaction IDs were not found in session in the Query Tool.
  | `Issue #5470 <https://github.com/pgadmin-org/pgadmin4/issues/5470>`_ -  Fixed an issue where tablespace was missing on partition tables in SQL.
  | `Issue #5536 <https://github.com/pgadmin-org/pgadmin4/issues/5536>`_ -  Fixed an issue where properties tab was refreshing on tab change even if the selected node is same.
  | `Issue #5551 <https://github.com/pgadmin-org/pgadmin4/issues/5551>`_ -  Fixed an issue with auto-complete not working as expected with double quotes.
  | `Issue #5564 <https://github.com/pgadmin-org/pgadmin4/issues/5564>`_ -  Ensure that table statistics are sorted by size.
  | `Issue #5598 <https://github.com/pgadmin-org/pgadmin4/issues/5598>`_ -  Fixed an issue while updating server node info removes the clear saved password menu.
  | `Issue #5603 <https://github.com/pgadmin-org/pgadmin4/issues/5603>`_ -  Fixed an issue where master password was not set correctly with external config database.
  | `Issue #5606 <https://github.com/pgadmin-org/pgadmin4/issues/5606>`_ -  Fixed an error in the collation create script for PG-15.
  | `Issue #5629 <https://github.com/pgadmin-org/pgadmin4/issues/5629>`_ -  Fixed BigAnimal authentication aborted issue.
  | `Issue #5637 <https://github.com/pgadmin-org/pgadmin4/issues/5637>`_ -  Ensure that the BigAnimal displays PG version 11-14 for Oracle compatible databases type.
  | `Issue #5645 <https://github.com/pgadmin-org/pgadmin4/issues/5645>`_ -  Fixed a typo.
