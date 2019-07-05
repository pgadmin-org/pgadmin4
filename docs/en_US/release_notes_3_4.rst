***********
Version 3.4
***********

Release date: 2018-10-04

This release contains a number of features and fixes reported since the release
of pgAdmin4 3.3


Features
********

| `Issue #2927 <https://redmine.postgresql.org/issues/2927>`_ - Move all CSS into SCSS files for consistency and ease of colour maintenance etc.
| `Issue #3514 <https://redmine.postgresql.org/issues/3514>`_ - Add optional data point markers and mouse-over tooltips to display values on graphs.
| `Issue #3564 <https://redmine.postgresql.org/issues/3564>`_ - Add shortcuts for View Data and the Query tool to the Browser header bar.

Bug fixes
*********

| `Issue #3464 <https://redmine.postgresql.org/issues/3464>`_ - Ensure the runtime can startup properly if there are wide characters in the logfile path on Windows.
| `Issue #3551 <https://redmine.postgresql.org/issues/3551>`_ - Fix handling of backslashes in the edit grid.
| `Issue #3576 <https://redmine.postgresql.org/issues/3576>`_ - Ensure queries are no longer executed when dashboards are closed.
| `Issue #3596 <https://redmine.postgresql.org/issues/3596>`_ - Fix support for the CLOB datatype in EPAS.
| `Issue #3607 <https://redmine.postgresql.org/issues/3607>`_ - Fix logic around validation and highlighting of Sort/Filter in the Query Tool.
| `Issue #3630 <https://redmine.postgresql.org/issues/3630>`_ - Ensure auto-complete works for objects in schemas other than public and pg_catalog.
| `Issue #3657 <https://redmine.postgresql.org/issues/3657>`_ - Ensure changes to Query Tool settings from the Preferences dialogue are applied before executing queries.
| `Issue #3658 <https://redmine.postgresql.org/issues/3658>`_ - Swap the Schema and Schemas icons and Catalog and Catalogs icons that had been used the wrong way around.

