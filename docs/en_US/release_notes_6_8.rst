************
Version 6.8
************

Release date: 2022-04-07

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.7.

New features
************

  | `Issue #7215 <https://redmine.postgresql.org/issues/7215>`_ -  Added transaction start time to Server activity sessions view.
  | `Issue #7249 <https://redmine.postgresql.org/issues/7249>`_ -  Added support for unique keys in ERD.
  | `Issue #7257 <https://redmine.postgresql.org/issues/7257>`_ -  Support running the container under OpenShift with alternate UIDs.

Housekeeping
************

  | `Issue #7132 <https://redmine.postgresql.org/issues/7132>`_ -  Port Properties panel for collection node, Dashboard, and SQL panel in React.
  | `Issue #7149 <https://redmine.postgresql.org/issues/7149>`_ -  Port preferences dialog to React.

Bug fixes
*********

  | `Issue #4256 <https://redmine.postgresql.org/issues/4256>`_ -  Fixed an issue where SQL for revoke statements are not shown for databases.
  | `Issue #5836 <https://redmine.postgresql.org/issues/5836>`_ -  Adds a new LDAP authentication configuration parameter that indicates the case sensitivity of the LDAP schema/server.
  | `Issue #6960 <https://redmine.postgresql.org/issues/6960>`_ -  Ensure that the master password dialog is popped up if the crypt key is missing.
  | `Issue #7059 <https://redmine.postgresql.org/issues/7059>`_ -  Fixed an issue where the error is shown on logout when the authentication source is oauth2.
  | `Issue #7176 <https://redmine.postgresql.org/issues/7176>`_ -  Fixed an issue where the browser tree state was not preserved correctly.
  | `Issue #7197 <https://redmine.postgresql.org/issues/7197>`_ -  Fixed an issue where foreign key relationships do not update when the primary key is modified.
  | `Issue #7216 <https://redmine.postgresql.org/issues/7216>`_ -  Ensure that the values of certain fields are prettified in the statistics tab for collection nodes.
  | `Issue #7221 <https://redmine.postgresql.org/issues/7221>`_ -  Ensure objects depending on extensions are not displayed in Schema Diff.
  | `Issue #7238 <https://redmine.postgresql.org/issues/7238>`_ -  Fixed an issue where foreign key is not removed even if the referred table is removed in ERD.
  | `Issue #7239 <https://redmine.postgresql.org/issues/7239>`_ -  Fixed an issue where the newly added table is not visible under the Tables node on refresh.
  | `Issue #7261 <https://redmine.postgresql.org/issues/7261>`_ -  Correct typo in the documentation.
  | `Issue #7263 <https://redmine.postgresql.org/issues/7263>`_ -  Fixed schema diff issue where function's difference DDL was showing incorrectly when arguments had default values with commas.
  | `Issue #7264 <https://redmine.postgresql.org/issues/7264>`_ -  Ensure that the correct user should be selected in the new connection dialog.
  | `Issue #7265 <https://redmine.postgresql.org/issues/7265>`_ -  Fixed schema diff issue in which the option 'null' doesn't appear in the DDL statement for the foreign table.
  | `Issue #7267 <https://redmine.postgresql.org/issues/7267>`_ -  Fixed an issue where unexpected error messages are displayed when users change the language via preferences.
  | `Issue #7269 <https://redmine.postgresql.org/issues/7269>`_ -  Ensure that pgAdmin4 should work with latest jinja2 version.
  | `Issue #7275 <https://redmine.postgresql.org/issues/7275>`_ -  Fixed 'Cannot read properties of undefined' error while creating the table via the ERD tool.
