************
Version 6.14
************

Release date: 2022-09-22

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.13.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13 and 14

**EDB Advanced Server**: 10, 11, 12, 13 and 14

New features
************


Housekeeping
************

  | `Issue #6133 <https://redmine.postgresql.org/issues/6133>`_ -  Port schema diff to React.
  | `Issue #6134 <https://redmine.postgresql.org/issues/6134>`_ -  Remove Backgrid and Backform.
  | `Issue #7343 <https://redmine.postgresql.org/issues/7343>`_ -  Port the remaining components of the ERD Tool to React.
  | `Issue #7619 <https://redmine.postgresql.org/issues/7619>`_ -  Remove Alertify from pgAdmin completely.
  | `Issue #7622 <https://redmine.postgresql.org/issues/7622>`_ -  Port search object dialog to React.

Bug fixes
*********

  | `Issue #7580 <https://redmine.postgresql.org/issues/7580>`_ -  Fixed an issue where backup does not work due to parameter 'preexec_fn' no longer being supported.
  | `Issue #7644 <https://redmine.postgresql.org/issues/7644>`_ -  Ensure that the dump servers functionality works from setup.py.
  | `Issue #7646 <https://redmine.postgresql.org/issues/7646>`_ -  Ensure that the Import/Export server menu option is visible.
  | `Issue #7648 <https://redmine.postgresql.org/issues/7648>`_ -  Fixed API test case for change password in the server mode.
  | `Issue #7649 <https://redmine.postgresql.org/issues/7649>`_ -  Fixed an issue with the non-visibility of columns added prior to import/export data.
  | `Issue #7656 <https://redmine.postgresql.org/issues/7656>`_ -  Fixed an issue where textarea of the JSON Editor does not resize with dialog.
  | `Issue #7663 <https://redmine.postgresql.org/issues/7663>`_ -  Fixed ModuleNotFoundError when running setup.py to load/dump servers.
  | `Issue #7693 <https://redmine.postgresql.org/issues/7693>`_ -  Replace the language selection 'Brazilian' with 'Portuguese (Brazilian).
