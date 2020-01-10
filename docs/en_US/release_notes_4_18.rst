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

| `Issue #5071 <https://redmine.postgresql.org/issues/5071>`_ -  Improve the test framework to run for multiple classes defined in a single file.
| `Issue #5072 <https://redmine.postgresql.org/issues/5072>`_ -  Updated wcDocker package which includes aria-label accessibility improvements.

Bug fixes
*********

| `Issue #3812 <https://redmine.postgresql.org/issues/3812>`_ -  Ensure that path file name should not disappear when changing ext from the dropdown in file explorer dialog.
| `Issue #4827 <https://redmine.postgresql.org/issues/4827>`_ -  Fix column resizable issue in the file explorer dialog.
| `Issue #5074 <https://redmine.postgresql.org/issues/5074>`_ -  Fix an issue where select, insert and update scripts on tables throwing an error.