************
Version 6.19
************

Release date: 2023-01-12

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.18.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

New features
************


Housekeeping
************

  | `Issue #5563 <https://github.com/pgadmin-org/pgadmin4/issues/5563>`_ -  Allow YouTube video demo links to be added to appropriate pgAdmin documentation.
  | `Issue #5615 <https://github.com/pgadmin-org/pgadmin4/issues/5615>`_ -  Rewrite pgAdmin main menu bar to use React.

Bug fixes
*********

  | `Issue #5487 <https://github.com/pgadmin-org/pgadmin4/issues/5487>`_ -  Fixed an issue where incorrect password used with shared server.
  | `Issue #5541 <https://github.com/pgadmin-org/pgadmin4/issues/5541>`_ -  Ensure the browser tree does not freeze while rendering 10k+ nodes/objects.
  | `Issue #5542 <https://github.com/pgadmin-org/pgadmin4/issues/5542>`_ -  Fixed an issue updating the schema node de-select the node in the tree if only one schema is present in the collection node.
  | `Issue #5559 <https://github.com/pgadmin-org/pgadmin4/issues/5559>`_ -  Fixed tree flickering issue on scroll.
  | `Issue #5586 <https://github.com/pgadmin-org/pgadmin4/issues/5586>`_ -  Fix the webserver and internal authentication setup issue.
  | `Issue #5613 <https://github.com/pgadmin-org/pgadmin4/issues/5613>`_ -  Ensure the appbundle has correct permissions so that pgAdmin can be accessed by users other than owner.
