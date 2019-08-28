************
Version 4.13
************

Release date: 2019-09-19

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.12.

New features
************

| `Issue #4553 <https://redmine.postgresql.org/issues/4553>`_ -  Don't wait for the database connection before rendering the Query Tool UI, for improved UX.
| `Issue #4651 <https://redmine.postgresql.org/issues/4651>`_ -  Allow configuration options to be set from the environment in the container distribution.
| `Issue #4667 <https://redmine.postgresql.org/issues/4667>`_ -  Ensure editable and read-only columns in Query Tool should be identified by icons and tooltips in the column header.

Housekeeping
************

| `Issue #4576 <https://redmine.postgresql.org/issues/4576>`_ -  Add Reverse Engineered SQL tests for Views.
| `Issue #4600 <https://redmine.postgresql.org/issues/4600>`_ -  Add Reverse Engineered SQL tests for Rules.

Bug fixes
*********

| `Issue #2706 <https://redmine.postgresql.org/issues/2706>`_ -  Added ProjectSet icon for explain module.
| `Issue #2828 <https://redmine.postgresql.org/issues/2828>`_ -  Added Gather Merge, Named Tuple Store Scan and Table Function Scan icon for explain module.
| `Issue #3778 <https://redmine.postgresql.org/issues/3778>`_ -  Ensure Boolean columns should be editable using keyboard keys.
| `Issue #4419 <https://redmine.postgresql.org/issues/4419>`_ -  Fix a debugger error when using Python 2.7.
| `Issue #4486 <https://redmine.postgresql.org/issues/4486>`_ -  Ensure View should be created with special characters.
| `Issue #4487 <https://redmine.postgresql.org/issues/4487>`_ -  Ensure Boolean columns should be editable in View/Edit data and Query Tool.
| `Issue #4577 <https://redmine.postgresql.org/issues/4577>`_ -  Fix an error that could be seen when click on any system column of a table.
| `Issue #4584 <https://redmine.postgresql.org/issues/4584>`_ -  Unescape HTML entities in database names in the Query Tool title bar.
| `Issue #4643 <https://redmine.postgresql.org/issues/4643>`_ -  Fix Truncate option deselect issue for compound triggers.
| `Issue #4644 <https://redmine.postgresql.org/issues/4644>`_ -  Fix length and precision enable/disable issue when changing the data type for Domain node.
| `Issue #4650 <https://redmine.postgresql.org/issues/4650>`_ -  Fix SQL tab issue for Views. It's a regression of compound triggers.
| `Issue #4657 <https://redmine.postgresql.org/issues/4657>`_ -  Fix PGADMIN_SERVER_JSON_FILE environment variable support in the container.
| `Issue #4674 <https://redmine.postgresql.org/issues/4674>`_ -  Fix query tool launch error if user name contain html characters.