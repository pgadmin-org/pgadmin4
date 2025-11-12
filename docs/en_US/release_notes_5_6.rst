************
Version 5.6
************

Release date: 2021-08-12

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.5.

New features
************

| `Issue #4904 <https://redmine.postgresql.org/issues/4904>`_ -  Added support to copy SQL from main window to query tool.
| `Issue #5198 <https://redmine.postgresql.org/issues/5198>`_ -  Added support for formatted JSON viewer/editor when interacting with data in a JSON column.

Housekeeping
************

| `Issue #6622 <https://redmine.postgresql.org/issues/6622>`_ -  Rename the "Resize by data?" to "Columns sized by" and disabled the 'Maximum column width' button if 'Columns sized by' is set to 'Column data'.

Bug fixes
*********

| `Issue #6337 <https://redmine.postgresql.org/issues/6337>`_ -  Ensure that the login account should be locked after N number of attempts. N is configurable using the 'MAX_LOGIN_ATTEMPTS' parameter.
| `Issue #6369 <https://redmine.postgresql.org/issues/6369>`_ -  Fixed CSRF errors for stale sessions by increasing the session expiration time for desktop mode.
| `Issue #6448 <https://redmine.postgresql.org/issues/6448>`_ -  Fixed an issue in the search object when searching in 'all types' or 'subscription' if the user doesn't have access to the subscription.
| `Issue #6574 <https://redmine.postgresql.org/issues/6574>`_ -  Fixed an issue where paste is not working through Right-Click option on PSQL.
| `Issue #6580 <https://redmine.postgresql.org/issues/6580>`_ -  Fixed TypeError 'NoneType' object is not sub scriptable.
| `Issue #6586 <https://redmine.postgresql.org/issues/6586>`_ -  Fixed incorrect tablespace options in the drop-down for move objects dialog.
| `Issue #6618 <https://redmine.postgresql.org/issues/6618>`_ -  Fixed an issue where the titles in query tabs are different.
| `Issue #6619 <https://redmine.postgresql.org/issues/6619>`_ -  Fixed incorrect binary path issue when the user deletes the binary path from the preferences.
| `Issue #6643 <https://redmine.postgresql.org/issues/6643>`_ -  Ensure that all the required options should be loaded when the Range data type is selected while creating a custom data type.
| `Issue #6650 <https://redmine.postgresql.org/issues/6650>`_ -  Fixed dashboard server activity issue when active_since parameter is None.
| `Issue #6664 <https://redmine.postgresql.org/issues/6664>`_ -  Fixed an issue where even if the user is locked, he can reset the password and can login into pgAdmin.
