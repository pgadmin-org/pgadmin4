************
Version 4.16
************

Release date: 2019-12-12

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.15.

New features
************

| `Issue #4396 <https://redmine.postgresql.org/issues/4396>`_ -  Warn the user on changing the definition of Materialized View about the loss of data and its dependent objects.
| `Issue #4435 <https://redmine.postgresql.org/issues/4435>`_ -  Allow drag and drop functionality for all the nodes under the database node, excluding collection nodes.

Housekeeping
************

| `Issue #4696 <https://redmine.postgresql.org/issues/4696>`_ -  Add Reverse Engineered and Modified SQL tests for Materialized Views.
| `Issue #4807 <https://redmine.postgresql.org/issues/4807>`_ -  Refactored code of table and it's child nodes.
| `Issue #4938 <https://redmine.postgresql.org/issues/4938>`_ -  Refactored code of columns node.

Bug fixes
*********

| `Issue #3538 <https://redmine.postgresql.org/issues/3538>`_ -  Fix issue where the Reset button does not get enabled till all the mandatory fields are provided in the dialog.
| `Issue #4659 <https://redmine.postgresql.org/issues/4659>`_ -  Updated documentation for default privileges to clarify more on the grantor.
| `Issue #4724 <https://redmine.postgresql.org/issues/4724>`_ -  Fix network disconnect issue while establishing the connection via SSH Tunnel and it impossible to expand the Servers node.
| `Issue #4761 <https://redmine.postgresql.org/issues/4761>`_ -  Fix an issue where the wrong type is displayed when changing the datatype from timestamp with time zone to timestamp without time zone.
| `Issue #4792 <https://redmine.postgresql.org/issues/4792>`_ -  Ensure that the superuser should be able to create database, as the superuser overrides all the access restrictions.
| `Issue #4818 <https://redmine.postgresql.org/issues/4818>`_ -  Fix server connection drops out issue in query tool.
| `Issue #4836 <https://redmine.postgresql.org/issues/4836>`_ -  Updated the json file name from 'servers.json' to 'pgadmin4/servers.json' in the container deployment section of the documentation.
| `Issue #4878 <https://redmine.postgresql.org/issues/4878>`_ -  Ensure that the superuser should be able to create role, as the superuser overrides all the access restrictions.
| `Issue #4925 <https://redmine.postgresql.org/issues/4925>`_ -  Shown some text on process watcher till the initial logs are loaded.
| `Issue #4926 <https://redmine.postgresql.org/issues/4926>`_ -  Fix VPN network disconnect issue where pgAdmin4 hangs on expanding the Servers node.
| `Issue #4930 <https://redmine.postgresql.org/issues/4930>`_ -  Fix main window tab navigation accessibility issue.
| `Issue #4933 <https://redmine.postgresql.org/issues/4933>`_ -  Ensure that the Servers collection node should expand independently of server connections.
| `Issue #4934 <https://redmine.postgresql.org/issues/4934>`_ -  Fix the help button link on the User Management dialog.
| `Issue #4935 <https://redmine.postgresql.org/issues/4935>`_ -  Fix accessibility issues.
| `Issue #4964 <https://redmine.postgresql.org/issues/4964>`_ -  Fix an issue where length and precision are not removed from table/column dialog.
| `Issue #4965 <https://redmine.postgresql.org/issues/4965>`_ -  Fix an issue where the Interval data type is not displayed in the properties dialog of table/column.
