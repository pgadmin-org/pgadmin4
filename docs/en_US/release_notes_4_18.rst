************
Version 4.18
************

Release date: 2020-02-06

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.17.

New features
************

| `Issue #3452 <https://redmine.postgresql.org/issues/3452>`_ -  Added Schema Diff tool to compare two schemas and generate the difference script.

Housekeeping
************

| `Issue #5049 <https://redmine.postgresql.org/issues/5049>`_ -  Improve code coverage and API test cases for the CAST module.
| `Issue #5050 <https://redmine.postgresql.org/issues/5050>`_ -  Improve code coverage and API test cases for the LANGUAGE module.
| `Issue #5071 <https://redmine.postgresql.org/issues/5071>`_ -  Improve the test framework to run for multiple classes defined in a single file.
| `Issue #5072 <https://redmine.postgresql.org/issues/5072>`_ -  Updated wcDocker package which includes aria-label accessibility improvements.
| `Issue #5096 <https://redmine.postgresql.org/issues/5096>`_ -  Replace node-sass with sass for SCSS compilation.

Bug fixes
*********

| `Issue #3812 <https://redmine.postgresql.org/issues/3812>`_ -  Ensure that path file name should not disappear when changing ext from the dropdown in file explorer dialog.
| `Issue #4827 <https://redmine.postgresql.org/issues/4827>`_ -  Fix column resizable issue in the file explorer dialog.
| `Issue #5000 <https://redmine.postgresql.org/issues/5000>`_ -  Logout the pgAdmin session when no user activity of mouse move, click or keypress.
| `Issue #5025 <https://redmine.postgresql.org/issues/5025>`_ -  Fix an issue where setting STORAGE_DIR to empty should show all the volumes on Windows in server mode.
| `Issue #5065 <https://redmine.postgresql.org/issues/5065>`_ -  Updated the incorrect icon used for the cast node on refresh.
| `Issue #5066 <https://redmine.postgresql.org/issues/5066>`_ -  Fix an issue where refreshing a package results in the change in the object completely.
| `Issue #5074 <https://redmine.postgresql.org/issues/5074>`_ -  Fix an issue where select, insert and update scripts on tables throwing an error.