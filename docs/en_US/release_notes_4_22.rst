************
Version 4.22
************

Release date: 2020-05-28

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.21.

New features
************

| `Issue #5452 <https://redmine.postgresql.org/issues/5452>`_ -  Added connected pgAdmin user and connection name in the log file.
| `Issue #5489 <https://redmine.postgresql.org/issues/5489>`_ -  Show the startup log as well as the server log in the runtime's log viewer.

Housekeeping
************
| `Issue #5255 <https://redmine.postgresql.org/issues/5255>`_ -  Implement Selenium Grid to run multiple tests across different browsers, operating systems, and machines in parallel.
| `Issue #5333 <https://redmine.postgresql.org/issues/5333>`_ -  Improve code coverage and API test cases for Indexes.
| `Issue #5334 <https://redmine.postgresql.org/issues/5334>`_ -  Improve code coverage and API test cases for the Rules module.
| `Issue #5335 <https://redmine.postgresql.org/issues/5335>`_ -  Improve code coverage and API test cases for Triggers and Compound Triggers.
| `Issue #5443 <https://redmine.postgresql.org/issues/5443>`_ -  Remove support for Python 2.
| `Issue #5444 <https://redmine.postgresql.org/issues/5444>`_ -  Cleanup Python detection in the runtime project file.
| `Issue #5455 <https://redmine.postgresql.org/issues/5455>`_ -  Refactor pgAdmin4.py so it can be imported and is a lot more readable.
| `Issue #5493 <https://redmine.postgresql.org/issues/5493>`_ -  Search object UI improvements.
| `Issue #5525 <https://redmine.postgresql.org/issues/5525>`_ -  Cleanup and refactor the macOS build scripts.
| `Issue #5552 <https://redmine.postgresql.org/issues/5552>`_ -  Update dependencies in the Docker container.
| `Issue #5553 <https://redmine.postgresql.org/issues/5553>`_ -  Remove PG 9.4 utilities from the Docker container as it's now out of support.

Bug fixes
*********

| `Issue #3694 <https://redmine.postgresql.org/issues/3694>`_ -  Gracefully informed the user that the database is already connected when they click on "Connect Database...".
| `Issue #4033 <https://redmine.postgresql.org/issues/4033>`_ -  Fixed an issue where clicking on the cross button of the alert box on the login page is not working.
| `Issue #4099 <https://redmine.postgresql.org/issues/4099>`_ -  Fixed the SQL help issue for EDB Postgres Advanced Server.
| `Issue #4223 <https://redmine.postgresql.org/issues/4223>`_ -  Ensure that maintenance job should be worked properly for indexes under a materialized view.
| `Issue #4279 <https://redmine.postgresql.org/issues/4279>`_ -  Ensure that file browse "home" button should point to $HOME rather than /.
| `Issue #4840 <https://redmine.postgresql.org/issues/4840>`_ -  Ensure that 'With OID' option should be disabled while taking backup of database server version 12 and above.
| `Issue #5001 <https://redmine.postgresql.org/issues/5001>`_ -  Fixed invalid literal issue when removing the connection limit for the existing role.
| `Issue #5052 <https://redmine.postgresql.org/issues/5052>`_ -  Fixed internal server error when clicking on Triggers -> 'Enable All' for partitions.
| `Issue #5398 <https://redmine.postgresql.org/issues/5398>`_ -  Fixed generated SQL issue for auto vacuum options.
| `Issue #5422 <https://redmine.postgresql.org/issues/5422>`_ -  Ensure that the dependencies tab shows correct information for Synonyms.
| `Issue #5434 <https://redmine.postgresql.org/issues/5434>`_ -  Fixed an issue where the newly added table is not alphabetically added to the tree.
| `Issue #5440 <https://redmine.postgresql.org/issues/5440>`_ -  Fixed list sorting issue in the schema diff tool.
| `Issue #5449 <https://redmine.postgresql.org/issues/5449>`_ -  Fixed an issue while comparing the two identical schemas using the schema diff tool.
| `Issue #5450 <https://redmine.postgresql.org/issues/5450>`_ -  Fixed an issue when renaming the column not added in the proper order.
| `Issue #5466 <https://redmine.postgresql.org/issues/5466>`_ -  Correct ipv4 "all interfaces" address in the container docs, per Frank Limpert.
| `Issue #5469 <https://redmine.postgresql.org/issues/5469>`_ -  Fixed an issue where select2 hover is inconsistent for the SSL field in create server dialog.
| `Issue #5473 <https://redmine.postgresql.org/issues/5473>`_ -  Fixed post-login redirect location when running in server mode under a non-default root.
| `Issue #5480 <https://redmine.postgresql.org/issues/5480>`_ -  Fixed an issue where the background job creation fails if there is only a version-specific python binary available in PATH.
| `Issue #5481 <https://redmine.postgresql.org/issues/5481>`_ -  Fixed data truncation issue when updating the data of type character with length.
| `Issue #5487 <https://redmine.postgresql.org/issues/5487>`_ -  Fixed an issue where if LDAP_SEARCH_BASE_DN is not set then, the value for LDAP_BASE_DN will be considered.
| `Issue #5496 <https://redmine.postgresql.org/issues/5496>`_ -  Fixed an issue where clicking on Select All button, not selecting all the options in pgAgent job scheduler.
| `Issue #5503 <https://redmine.postgresql.org/issues/5503>`_ -  Clarify and correct the docs on enabling the pl/debugger plugin on the server.
| `Issue #5510 <https://redmine.postgresql.org/issues/5510>`_ -  Fixed Unicode decode error 'utf-8' codec can't decode byte.