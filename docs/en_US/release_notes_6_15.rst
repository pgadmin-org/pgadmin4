************
Version 6.15
************

Release date: 2022-10-20

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.14.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13 and 14

**EDB Advanced Server**: 10, 11, 12, 13 and 14

New features
************

  | `Issue #5304 <https://github.com/pgadmin-org/pgadmin4/issues/5304>`_ -  Added high availability options to AWS deployment.

Housekeeping
************

  | `Issue #5293 <https://github.com/pgadmin-org/pgadmin4/issues/5293>`_ -  Ensure that the tooltips are consistent throughout the entire application.
  | `Issue #5357 <https://github.com/pgadmin-org/pgadmin4/issues/5357>`_ -  Remove Python's 'Six' package completely.

Bug fixes
*********

  | `Issue #5145 <https://github.com/pgadmin-org/pgadmin4/issues/5145>`_ -  Fixed intermittent error shown while OAuth2 login.
  | `Issue #5188 <https://github.com/pgadmin-org/pgadmin4/issues/5188>`_ -  Ensure that the continue/start button should be disabled if the user stops the Debugger for the procedures.
  | `Issue #5210 <https://github.com/pgadmin-org/pgadmin4/issues/5210>`_ -  Ensure that the query tool creates a new tab with the appropriate user when pressing Alt+Shift+Q.
  | `Issue #5212 <https://github.com/pgadmin-org/pgadmin4/issues/5212>`_ -  Added the close button for all the notifications of the notistack.
  | `Issue #5249 <https://github.com/pgadmin-org/pgadmin4/issues/5249>`_ -  Added the ability to display the selected text from the query tool in the find/replace box.
  | `Issue #5261 <https://github.com/pgadmin-org/pgadmin4/issues/5261>`_ -  Ensure that the search filter should be cleared when a new row is added to the user management.
  | `Issue #5262 <https://github.com/pgadmin-org/pgadmin4/issues/5262>`_ -  Ensure that the user management dialog should not allow the same email addresses with different letter casings when creating users.
  | `Issue #5308 <https://github.com/pgadmin-org/pgadmin4/issues/5308>`_ -  Ensure that the default value for a column should be used if it is made empty.
  | `Issue #5368 <https://github.com/pgadmin-org/pgadmin4/issues/5368>`_ -  Fixed the issue while downloading the file from the file manager.
