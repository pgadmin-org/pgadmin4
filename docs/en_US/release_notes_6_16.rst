************
Version 6.16
************

Release date: 2022-11-18

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.15.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

New features
************

  | `Issue #1832 <https://github.com/pgadmin-org/pgadmin4/issues/1832>`_ -  Added support for storing configurations of pgAdmin in an external database.
  | `Issue #4756 <https://github.com/pgadmin-org/pgadmin4/issues/4756>`_ -  Added the ability to generate ERDs for tables.
  | `Issue #5468 <https://github.com/pgadmin-org/pgadmin4/issues/5468>`_ -  Add the possibility to configure the Oauth2 claim which is used for the pgAdmin username.

Housekeeping
************


Bug fixes
*********

  | `Issue #2174 <https://github.com/pgadmin-org/pgadmin4/issues/2174>`_ -  Ensure that the browser tree should auto scroll to the selected node when expanding the server node.
  | `Issue #4841 <https://github.com/pgadmin-org/pgadmin4/issues/4841>`_ -  Use SocketIO instead of REST for schema diff compare.
  | `Issue #5066 <https://github.com/pgadmin-org/pgadmin4/issues/5066>`_ -  Ensure that users can use custom characters as CSV field separators/CSV quotes when downloading query results.
  | `Issue #5058 <https://github.com/pgadmin-org/pgadmin4/issues/5058>`_ -  Ensure that the save button should be disabled by default on the Sort/Filter dialog in the query tool.
  | `Issue #5098 <https://github.com/pgadmin-org/pgadmin4/issues/5098>`_ -  Fix an issue where the save button is enabled when the table properties dialog is opened.
  | `Issue #5122 <https://github.com/pgadmin-org/pgadmin4/issues/5122>`_ -  Ensure that the spinner should be visible on the browser tree on node refresh.
  | `Issue #5149 <https://github.com/pgadmin-org/pgadmin4/issues/5149>`_ -  Ensure the Generate ERD option is hidden if the connection to the database is not allowed.
  | `Issue #5206 <https://github.com/pgadmin-org/pgadmin4/issues/5206>`_ -  Reposition the select dropdown when the browser is resized.
  | `Issue #5281 <https://github.com/pgadmin-org/pgadmin4/issues/5281>`_ -  Ensure that autocomplete works properly with objects starting with double quotes.
  | `Issue #5344 <https://github.com/pgadmin-org/pgadmin4/issues/5344>`_ -  Ensure that pgAdmin routes should have the SCRIPT_NAME prefix.
  | `Issue #5424 <https://github.com/pgadmin-org/pgadmin4/issues/5424>`_ -  Ensure that the appropriate permissions are set on the key file before trying an SSL connection with the server in server mode.
  | `Issue #5429 <https://github.com/pgadmin-org/pgadmin4/issues/5429>`_ -  Fixed an issue where parameters for roles were not visible.
  | `Issue #5452 <https://github.com/pgadmin-org/pgadmin4/issues/5452>`_ -  The container deployment document should include the server.json file format.
  | `Issue #5455 <https://github.com/pgadmin-org/pgadmin4/issues/5455>`_ -  Fixed an issue where the dependents tab wasn't working for PG 15.
  | `Issue #5458 <https://github.com/pgadmin-org/pgadmin4/issues/5458>`_ -  Ensure that the browser path column in the search object shows the complete path.
  | `Issue #5463 <https://github.com/pgadmin-org/pgadmin4/issues/5463>`_ -  Fixed an issue where the result grid was not working properly while trying to edit data by hitting Enter key.
  | `Issue #5465 <https://github.com/pgadmin-org/pgadmin4/issues/5465>`_ -  Fixed an issue where the screen was freezing while closing the wcDocker panel.
  | `Issue #5473 <https://github.com/pgadmin-org/pgadmin4/issues/5473>`_ -  Fixed an issue where AutoComplete was not working correctly due to incorrect regex.
  | `Issue #5475 <https://github.com/pgadmin-org/pgadmin4/issues/5475>`_ -  Fixed an issue where the 'Confirm on close or refresh' setting was ignored when closing the query/ERD tool opened in the new tab.
  | `Issue #5507 <https://github.com/pgadmin-org/pgadmin4/issues/5507>`_ -  Fixed an issue where pgadmin does not respect reverse proxy any more.
  | `Issue #5521 <https://github.com/pgadmin-org/pgadmin4/issues/5521>`_ -  Fixed SocketIO calls when pgAdmin 4 server is running from a sub directory.
  | `Issue #5522 <https://github.com/pgadmin-org/pgadmin4/issues/5522>`_ -  Ensure that the load file paths are children of the storage directory.
  | `Issue #5533 <https://github.com/pgadmin-org/pgadmin4/issues/5533>`_ -  Use the shared server username when opening query tool.
  | `Issue #5535 <https://github.com/pgadmin-org/pgadmin4/issues/5535>`_ -  Fixed an issue where the 'save_password' column threw an error for the shared server when using an external database.
  | `Issue #5537 <https://github.com/pgadmin-org/pgadmin4/issues/5537>`_ -  Ensure that the correct error message in ERD for permission denied should be shown.
