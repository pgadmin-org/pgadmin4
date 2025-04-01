************
Version 4.23
************

Release date: 2020-06-25

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.22.

New features
************

| `Issue #5468 <https://redmine.postgresql.org/issues/5468>`_ -  Added option to ignore the whitespaces while comparing objects in schema diff.
| `Issue #5500 <https://redmine.postgresql.org/issues/5500>`_ -  Added server group name while selecting servers in schema diff.
| `Issue #5516 <https://redmine.postgresql.org/issues/5516>`_ -  Added support of Row Security Policies.
| `Issue #5576 <https://redmine.postgresql.org/issues/5576>`_ -  Improve error messaging if the storage and log directories cannot be created.

Housekeeping
************

| `Issue #5325 <https://redmine.postgresql.org/issues/5325>`_ -  Improve code coverage and API test cases for Collations.
| `Issue #5574 <https://redmine.postgresql.org/issues/5574>`_ -  Cleanup Windows build scripts and ensure Windows x64 builds will work.
| `Issue #5581 <https://redmine.postgresql.org/issues/5581>`_ -  Documentation of Row Level Security Policies.

Bug fixes
*********

| `Issue #3591 <https://redmine.postgresql.org/issues/3591>`_ -  Ensure that the query tool should display the proper error message while terminating the active session.
| `Issue #3669 <https://redmine.postgresql.org/issues/3669>`_ -  Ensure that proper error should be displayed for the deleted node.
| `Issue #3787 <https://redmine.postgresql.org/issues/3787>`_ -  Disabled the Stop process button after clicking it and added a message 'Terminating the process...' to notify the user.
| `Issue #4226 <https://redmine.postgresql.org/issues/4226>`_ -  Fixed an issue where select all checkbox only selects the first 50 tables.
| `Issue #5416 <https://redmine.postgresql.org/issues/5416>`_ -  Ensure that the query tool panel gets closed when clicking on the 'Don't Save' button.
| `Issue #5465 <https://redmine.postgresql.org/issues/5465>`_ -  Fixed an issue where the Edge browser version is showing wrong and warning message gets displayed.
| `Issue #5492 <https://redmine.postgresql.org/issues/5492>`_ -  Fixed an issue where the search object is unable to locate inherited tables and constraint filters are not working.
| `Issue #5507 <https://redmine.postgresql.org/issues/5507>`_ -  Fixed connection and version number detection issue when the database server is upgraded.
| `Issue #5521 <https://redmine.postgresql.org/issues/5521>`_ -  Fixed an issue when dumping servers from a desktop pgAdmin app by providing an option '--sqlite-path'.
| `Issue #5539 <https://redmine.postgresql.org/issues/5539>`_ -  Fixed typo in exception keyword.
| `Issue #5584 <https://redmine.postgresql.org/issues/5584>`_ -  Fixed an issue where two identical tables showing different by schema diff tool.
| `Issue #5592 <https://redmine.postgresql.org/issues/5592>`_ -  Ensure that pgadmin should be able to connect to the server which has password more than 1000 characters.