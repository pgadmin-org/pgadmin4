************
Version 6.8
************

Release date: 2022-04-07

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.7.

New features
************



Housekeeping
************

  | `Issue #7149 <https://redmine.postgresql.org/issues/7149>`_ -  Port preferences dialog to React.

Bug fixes
*********

  | `Issue #7059 <https://redmine.postgresql.org/issues/7059>`_ -  Fixed an issue where the error is shown on logout when the authentication source is oauth2.
  | `Issue #7216 <https://redmine.postgresql.org/issues/7216>`_ -  Ensure that the values of certain fields are prettified in the statistics tab for collection nodes.
  | `Issue #7221 <https://redmine.postgresql.org/issues/7221>`_ -  Ensure objects depending on extensions are not displayed in Schema Diff.
  | `Issue #7238 <https://redmine.postgresql.org/issues/7238>`_ -  Fixed an issue where foreign key is not removed even if the referred table is removed in ERD.
  | `Issue #7257 <https://redmine.postgresql.org/issues/7257>`_ -  Support running the container under OpenShift with alternate UIDs.
  | `Issue #7261 <https://redmine.postgresql.org/issues/7261>`_ -  Correct typo in the documentation.
  | `Issue #7267 <https://redmine.postgresql.org/issues/7267>`_ -  Fixed an issue where unexpected error messages are displayed when users change the language via preferences.
