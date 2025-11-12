************
Version 4.13
************

Release date: 2019-09-19

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.12.

New features
************

| `Issue #2828 <https://redmine.postgresql.org/issues/2828>`_ -  Added Gather Merge, Named Tuple Store Scan and Table Function Scan icon for explain module.
| `Issue #4553 <https://redmine.postgresql.org/issues/4553>`_ -  Don't wait for the database connection before rendering the Query Tool UI, for improved UX.
| `Issue #4651 <https://redmine.postgresql.org/issues/4651>`_ -  Allow configuration options to be set from the environment in the container distribution.
| `Issue #4667 <https://redmine.postgresql.org/issues/4667>`_ -  Ensure editable and read-only columns in Query Tool should be identified by icons and tooltips in the column header.
| `Issue #4691 <https://redmine.postgresql.org/issues/4691>`_ -  Add an Italian translation.
| `Issue #4752 <https://redmine.postgresql.org/issues/4752>`_ -  Refactor Dockerfile to avoid needing to run supporting scripts (i.e. 'docker build .' will work) and minimise layers.

Housekeeping
************

| `Issue #4575 <https://redmine.postgresql.org/issues/4575>`_ -  Add Reverse Engineered SQL tests for Schemas.
| `Issue #4576 <https://redmine.postgresql.org/issues/4576>`_ -  Add Reverse Engineered SQL tests for Views.
| `Issue #4600 <https://redmine.postgresql.org/issues/4600>`_ -  Add Reverse Engineered SQL tests for Rules.
| `Issue #4616 <https://redmine.postgresql.org/issues/4616>`_ -  Add Reverse Engineered and Modified SQL tests for Foreign Keys.
| `Issue #4617 <https://redmine.postgresql.org/issues/4617>`_ -  Add Reverse Engineered and Modified SQL tests for Foreign Servers.
| `Issue #4618 <https://redmine.postgresql.org/issues/4618>`_ -  Add Reverse Engineered and Modified SQL tests for Foreign Tables.
| `Issue #4619 <https://redmine.postgresql.org/issues/4619>`_ -  Add Reverse Engineered and Modified SQL tests for FTS Templates.
| `Issue #4621 <https://redmine.postgresql.org/issues/4621>`_ -  Add Reverse Engineered and Modified SQL tests for Indexes.
| `Issue #4624 <https://redmine.postgresql.org/issues/4624>`_ -  Add Reverse Engineered and Modified SQL tests for Primary Keys.
| `Issue #4627 <https://redmine.postgresql.org/issues/4627>`_ -  Add Reverse Engineered and Modified SQL tests for User Mappings.
| `Issue #4690 <https://redmine.postgresql.org/issues/4690>`_ -  Add Modified SQL tests for Resource Group.

Bug fixes
*********

| `Issue #2706 <https://redmine.postgresql.org/issues/2706>`_ -  Added ProjectSet icon for explain module.
| `Issue #3778 <https://redmine.postgresql.org/issues/3778>`_ -  Ensure Boolean columns should be editable using keyboard keys.
| `Issue #3936 <https://redmine.postgresql.org/issues/3936>`_ -  Further code refactoring to stabilise the Feature Tests.
| `Issue #4381 <https://redmine.postgresql.org/issues/4381>`_ -  Fix an issue where oid column should not be pasted when copy/paste row is used on query output containing the oid column.
| `Issue #4408 <https://redmine.postgresql.org/issues/4408>`_ -  Fix display of validation error message in SlickGrid cells.
| `Issue #4412 <https://redmine.postgresql.org/issues/4412>`_ -  Fix issue where Validated switch option is inverted for the Foreign Key.
| `Issue #4419 <https://redmine.postgresql.org/issues/4419>`_ -  Fix a debugger error when using Python 2.7.
| `Issue #4461 <https://redmine.postgresql.org/issues/4461>`_ -  Fix error while importing data to a table using Import/Export dialog and providing "Not null columns" option.
| `Issue #4486 <https://redmine.postgresql.org/issues/4486>`_ -  Ensure View should be created with special characters.
| `Issue #4487 <https://redmine.postgresql.org/issues/4487>`_ -  Ensure Boolean columns should be editable in View/Edit data and Query Tool.
| `Issue #4577 <https://redmine.postgresql.org/issues/4577>`_ -  Fix an error that could be seen when click on any system column of a table.
| `Issue #4584 <https://redmine.postgresql.org/issues/4584>`_ -  Unescape HTML entities in database names in the Query Tool title bar.
| `Issue #4631 <https://redmine.postgresql.org/issues/4631>`_ -  Add editor options for plain text mode and to disable block folding to workaround rendering speed issues in CodeMirror with very large scripts.
| `Issue #4642 <https://redmine.postgresql.org/issues/4642>`_ -  Ensure port and username should not be mandatory when a service is provided.
| `Issue #4643 <https://redmine.postgresql.org/issues/4643>`_ -  Fix Truncate option deselect issue for compound triggers.
| `Issue #4644 <https://redmine.postgresql.org/issues/4644>`_ -  Fix length and precision enable/disable issue when changing the data type for Domain node.
| `Issue #4650 <https://redmine.postgresql.org/issues/4650>`_ -  Fix SQL tab issue for Views. It's a regression of compound triggers.
| `Issue #4657 <https://redmine.postgresql.org/issues/4657>`_ -  Fix PGADMIN_SERVER_JSON_FILE environment variable support in the container.
| `Issue #4663 <https://redmine.postgresql.org/issues/4663>`_ -  Fix exception in query history for python 2.7.
| `Issue #4674 <https://redmine.postgresql.org/issues/4674>`_ -  Fix query tool launch error if user name contain html characters.
| `Issue #4681 <https://redmine.postgresql.org/issues/4681>`_ -  Increase cache control max age for static files to improve performance over longer run.
| `Issue #4698 <https://redmine.postgresql.org/issues/4698>`_ -  Fix SQL issue of length and precision when changing the data type of Column.
| `Issue #4702 <https://redmine.postgresql.org/issues/4702>`_ -  Fix modified SQL for Index when reset the value of Fill factor and Clustered?.
| `Issue #4703 <https://redmine.postgresql.org/issues/4703>`_ -  Fix reversed engineered SQL for btree Index when provided sort order and NULLs.
| `Issue #4726 <https://redmine.postgresql.org/issues/4726>`_ -  Ensure sequence with negative value should be created.
| `Issue #4727 <https://redmine.postgresql.org/issues/4727>`_ -  Fix issue where EXEC script doesn't write the complete script for Procedures.
| `Issue #4736 <https://redmine.postgresql.org/issues/4736>`_ -  Fix query tool and view data issue with the Italian language.
| `Issue #4742 <https://redmine.postgresql.org/issues/4742>`_ -  Ensure Primary Key should be created with Index.
| `Issue #4750 <https://redmine.postgresql.org/issues/4750>`_ -  Fix query history exception for Python 3.6.