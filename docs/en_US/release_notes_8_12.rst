************
Version 8.12
************

Release date: 2024-09-19

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.11.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, 16 and 17

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.4


New features
************

  | `Issue #1900 <https://github.com/pgadmin-org/pgadmin4/issues/1900>`_ -  Added feature to restore preferences to their default values.
  | `Issue #7293 <https://github.com/pgadmin-org/pgadmin4/issues/7293>`_ -  Allow running non-continuous selected SQL code blocks in the query tool.

Housekeeping
************

  | `Issue #7884 <https://github.com/pgadmin-org/pgadmin4/issues/7884>`_ -  Improved the extendability of the SchemaView and DataGridView.

Bug fixes
*********

  | `Issue #6502 <https://github.com/pgadmin-org/pgadmin4/issues/6502>`_ -  Fix the query tool restore connection issue on the server disconnection from the left side object explorer. 
  | `Issue #7076 <https://github.com/pgadmin-org/pgadmin4/issues/7076>`_ -  Revamp the current password saving implementation to a keyring and reduce repeated OS user password prompts.
  | `Issue #7571 <https://github.com/pgadmin-org/pgadmin4/issues/7571>`_ -  Fixed an issue where users could not use pgAdmin if they did not have access to the management database.
  | `Issue #7878 <https://github.com/pgadmin-org/pgadmin4/issues/7878>`_ -  Fixed an issue where cursor moves to end of line when editing input fields.
  | `Issue #7895 <https://github.com/pgadmin-org/pgadmin4/issues/7895>`_ -  Fixed an issue where different client backend shows all SQL are same.