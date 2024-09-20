************
Version 8.12
************

Release date: 2024-09-23

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
  | `Issue #6222 <https://github.com/pgadmin-org/pgadmin4/issues/6222>`_ -  Add a new config variable - ALLOW_SPECIAL_EMAIL_DOMAINS to allow special domains for pgAdmin user emails.
  | `Issue #7293 <https://github.com/pgadmin-org/pgadmin4/issues/7293>`_ -  Allow running non-continuous selected SQL code blocks in the query tool.

Housekeeping
************

  | `Issue #7884 <https://github.com/pgadmin-org/pgadmin4/issues/7884>`_ -  Improved the extendability of the SchemaView and DataGridView.

Bug fixes
*********

  | `Issue #6502 <https://github.com/pgadmin-org/pgadmin4/issues/6502>`_ -  Fix the query tool restore connection issue on the server disconnection from the left side object explorer.
  | `Issue #7076 <https://github.com/pgadmin-org/pgadmin4/issues/7076>`_ -  Revamp the current password saving implementation to a keyring and reduce repeated OS user password prompts.
  | `Issue #7571 <https://github.com/pgadmin-org/pgadmin4/issues/7571>`_ -  Fixed an issue where users could not use pgAdmin if they did not have access to the management database.
  | `Issue #7811 <https://github.com/pgadmin-org/pgadmin4/issues/7811>`_ -  Fixed an issue where servers listed in the servers.json file were being reimported upon container restart.
  | `Issue #7839 <https://github.com/pgadmin-org/pgadmin4/issues/7839>`_ -  Added support for OIDC based OAuth2 authentication.
  | `Issue #7878 <https://github.com/pgadmin-org/pgadmin4/issues/7878>`_ -  Fixed an issue where cursor moves to end of line when editing input fields.
  | `Issue #7890 <https://github.com/pgadmin-org/pgadmin4/issues/7890>`_ -  Fixed an issue where "Quit App" confirmation modal in desktop app is not respecting "Confirm on close or refresh?".
  | `Issue #7895 <https://github.com/pgadmin-org/pgadmin4/issues/7895>`_ -  Fixed an issue where different client backend shows all SQL are same.
  | `Issue #7945 <https://github.com/pgadmin-org/pgadmin4/issues/7945>`_ -  Fixed a security issue where the OAuth2 client ID and secret exposed through the web browser (CVE-2024-9014).