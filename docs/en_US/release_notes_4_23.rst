************
Version 4.23
************

Release date: 2020-06-25

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.22.

New features
************

| `Issue #5576 <https://redmine.postgresql.org/issues/5576>`_ -  Improve error messaging if the storage and log directories cannot be created.

Housekeeping
************

| `Issue #5325 <https://redmine.postgresql.org/issues/5325>`_ -  Improve code coverage and API test cases for Collations.
| `Issue #5574 <https://redmine.postgresql.org/issues/5574>`_ -  Cleanup Windows build scripts and ensure Windows x64 builds will work.

Bug fixes
*********

| `Issue #3669 <https://redmine.postgresql.org/issues/3669>`_ -  Ensure that proper error should be displayed for the deleted node.
| `Issue #3787 <https://redmine.postgresql.org/issues/3787>`_ -  Disabled the Stop process button after clicking it and added a message 'Terminating the process...' to notify the user.
| `Issue #5416 <https://redmine.postgresql.org/issues/5416>`_ -  Ensure that the query tool panel gets closed when clicking on the 'Don't Save' button.
| `Issue #5465 <https://redmine.postgresql.org/issues/5465>`_ -  Fixed an issue where the Edge browser version is showing wrong and warning message gets displayed.
| `Issue #5507 <https://redmine.postgresql.org/issues/5507>`_ -  Fixed connection and version number detection issue when the database server is upgraded.
| `Issue #5521 <https://redmine.postgresql.org/issues/5521>`_ -  Fixed an issue when dumping servers from a desktop pgAdmin app by providing an option '--sqlite-path'.
| `Issue #5539 <https://redmine.postgresql.org/issues/5539>`_ -  Fixed typo in exception keyword.