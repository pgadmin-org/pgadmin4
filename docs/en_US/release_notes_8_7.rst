***********
Version 8.7
***********

Release date: 2024-05-30

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.6.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, and 16

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.2


New features
************

  | `Issue #7192 <https://github.com/pgadmin-org/pgadmin4/issues/7192>`_ -  Changes in Query Tool, Debugger, and ERD Tool shortcuts to remove the use of Accesskey which will allow them to be customized.
  | `Issue #7411 <https://github.com/pgadmin-org/pgadmin4/issues/7411>`_ -  Enhance the Delete dialog by highlighting the names of the objects to be deleted in bold.

Housekeeping
************

  | `Issue #7419 <https://github.com/pgadmin-org/pgadmin4/issues/7419>`_ -  Upgrade react-table from v7 to v8.
  | `Issue #7472 <https://github.com/pgadmin-org/pgadmin4/issues/7472>`_ -  Replace the current FontAwesome based PSQL tool icon with MUI Terminal icon.

Bug fixes
*********

  | `Issue #5849 <https://github.com/pgadmin-org/pgadmin4/issues/5849>`_ -  Disable ERD for system catalogs.
  | `Issue #6060 <https://github.com/pgadmin-org/pgadmin4/issues/6060>`_ -  Disable Debugger for system catalogs.
  | `Issue #6086 <https://github.com/pgadmin-org/pgadmin4/issues/6086>`_ -  Fixed an issue where drag and drop publication and subscription name in SQL editors was not working.
  | `Issue #6464 <https://github.com/pgadmin-org/pgadmin4/issues/6464>`_ -  Fixed an issue of the pgAdmin window size increasing each time it was reopened.
  | `Issue #7349 <https://github.com/pgadmin-org/pgadmin4/issues/7349>`_ -  Update the documentation for preferences dialog and keyboard shortcuts.
  | `Issue #7458 <https://github.com/pgadmin-org/pgadmin4/issues/7458>`_ -  Remove query info notifier timeout field from Query Tool Preferences Dialog.
  | `Issue #7485 <https://github.com/pgadmin-org/pgadmin4/issues/7485>`_ -  Fixed incorrect highlighting for C-Style escape strings in SQL editor.
