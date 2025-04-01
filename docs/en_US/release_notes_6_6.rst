************
Version 6.6
************

Release date: 2022-03-10

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.5.

New features
************

| `Issue #7177 <https://redmine.postgresql.org/issues/7177>`_ -  Added capability to deploy PostgreSQL servers on Amazon RDS.

Housekeeping
************

| `Issue #7180 <https://redmine.postgresql.org/issues/7180>`_ -  Rename the menu 'Disconnect Database' to 'Disconnect from database'.


Bug fixes
*********

| `Issue #6956 <https://redmine.postgresql.org/issues/6956>`_ -  Fixed a schema diff issue in which user mappings were not compared correctly.
| `Issue #6991 <https://redmine.postgresql.org/issues/6991>`_ -  Fixed an issue where pgadmin cannot connect to LDAP when STARTTLS is required before bind.
| `Issue #6999 <https://redmine.postgresql.org/issues/6999>`_ -  Fixed an issue where a warning is flashed every time for an email address when authentication sources are internal and ldap.
| `Issue #7105 <https://redmine.postgresql.org/issues/7105>`_ -  Fixed an issue where the parent partition table was not displayed during autocomplete.
| `Issue #7124 <https://redmine.postgresql.org/issues/7124>`_ -  Fixed the schema diff issue where tables have different column positions and a column has a default value.
| `Issue #7152 <https://redmine.postgresql.org/issues/7152>`_ -  Added comments column for the functions collection node.
| `Issue #7172 <https://redmine.postgresql.org/issues/7172>`_ -  Allow users to scroll and enter input when there is a validation error.
| `Issue #7173 <https://redmine.postgresql.org/issues/7173>`_ -  Fixed an issue where the User Management dialog is not opening.
| `Issue #7181 <https://redmine.postgresql.org/issues/7181>`_ -  Ensure that the user should be able to add new server with unix socket connection.
| `Issue #7186 <https://redmine.postgresql.org/issues/7186>`_ -  Fixes an issue where the connect server/database menu was not updated correctly.
| `Issue #7202 <https://redmine.postgresql.org/issues/7202>`_ -  Ensure that Flask-Security-Too is using the latest version.
