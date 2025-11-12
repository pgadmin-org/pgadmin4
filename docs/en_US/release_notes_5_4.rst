************
Version 5.4
************

Release date: 2021-06-17

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.3.

New features
************

| `Issue #1561 <https://redmine.postgresql.org/issues/1561>`_ -  Added browse button to select the binary path in the Preferences.
| `Issue #1591 <https://redmine.postgresql.org/issues/1591>`_ -  Added Grant Wizard option under Package node.
| `Issue #2341 <https://redmine.postgresql.org/issues/2341>`_ -  Added support to launch PSQL for the connected database server.
| `Issue #4064 <https://redmine.postgresql.org/issues/4064>`_ -  Added window maximize/restore functionality for properties dialog.
| `Issue #5370 <https://redmine.postgresql.org/issues/5370>`_ -  Added support to set the binary path for the different database server versions.
| `Issue #6231 <https://redmine.postgresql.org/issues/6231>`_ -  Added OS, Browser, Configuration details in the About dialog.
| `Issue #6395 <https://redmine.postgresql.org/issues/6395>`_ -  Added support for rotating the pgAdmin log file on the basis of size and age.
| `Issue #6524 <https://redmine.postgresql.org/issues/6524>`_ -  Support non-admin installation on Windows.


Housekeeping
************

| `Issue #4622 <https://redmine.postgresql.org/issues/4622>`_ -  Added RESQL/MSQL test cases for Table and its child nodes.
| `Issue #6225 <https://redmine.postgresql.org/issues/6225>`_ -  Updated Flask-Security-Too to the latest v4.
| `Issue #6460 <https://redmine.postgresql.org/issues/6460>`_ -  Added a mechanism to detect a corrupt/broken config database file.

Bug fixes
*********

| `Issue #4203 <https://redmine.postgresql.org/issues/4203>`_ -  Fixed the issue of renaming the database by another user.
| `Issue #6404 <https://redmine.postgresql.org/issues/6404>`_ -  Ensure that the Query Tool connection string should not be changed as per the 'Query Tool tab title'.
| `Issue #6466 <https://redmine.postgresql.org/issues/6466>`_ -  Ensure that the user should be able to add members in Login/Role group while creating it.
| `Issue #6469 <https://redmine.postgresql.org/issues/6469>`_ -  Ensure that the calendar control should be disabled in the properties panel for Role.
| `Issue #6473 <https://redmine.postgresql.org/issues/6473>`_ -  Disable browser password saving in the runtime.
| `Issue #6478 <https://redmine.postgresql.org/issues/6478>`_ -  Fixed duplicate SQL issue for tables with more than one partition.
| `Issue #6482 <https://redmine.postgresql.org/issues/6482>`_ -  Fixed an issue where the Foreground Color property of server dialog does not work.
| `Issue #6513 <https://redmine.postgresql.org/issues/6513>`_ -  Fixed an issue where pgAdmin does not open after password reset in server mode.
| `Issue #6520 <https://redmine.postgresql.org/issues/6520>`_ -  Fixed an issue where a decimal number is appended for character varying fields while downloading the data in CSV format.
