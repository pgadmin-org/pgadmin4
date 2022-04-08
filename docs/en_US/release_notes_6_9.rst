************
Version 6.9
************

Release date: 2022-05-05

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.8.

New features
************

 | `Issue #3253 <https://redmine.postgresql.org/issues/3253>`_ -  Added status bar to the Query Tool.
 | `Issue #3989 <https://redmine.postgresql.org/issues/3989>`_ -  Ensure that row numbers should be visible in view when scrolling horizontally.
 | `Issue #6830 <https://redmine.postgresql.org/issues/6830>`_ -  Relocate GIS Viewer Button to the Left Side of the Results Table.


Housekeeping
************

 | `Issue #6131 <https://redmine.postgresql.org/issues/6131>`_ -  Port query tool to React.

Bug fixes
*********

 | `Issue #6725 <https://redmine.postgresql.org/issues/6725>`_ -  Fixed an issue where the Query tool opens on minimum size if the user opens multiple query tool Window quickly.
 | `Issue #7187 <https://redmine.postgresql.org/issues/7187>`_ -  Fixed an issue where the downloaded ERD diagram was 0 bytes.
 | `Issue #7188 <https://redmine.postgresql.org/issues/7188>`_ -  Fixed an issue where the connection bar is not visible.
 | `Issue #7231 <https://redmine.postgresql.org/issues/7231>`_ -  Don't strip binaries when packaging them in the server RPM as this might break cpython modules.
 | `Issue #7260 <https://redmine.postgresql.org/issues/7260>`_ -  Fixed an issue where an Empty message popup after running a query.
 | `Issue #7262 <https://redmine.postgresql.org/issues/7262>`_ -  Ensure that Autocomplete should work after changing the connection.
 | `Issue #7294 <https://redmine.postgresql.org/issues/7294>`_ -  Fixed an issue where the copy and paste row does not work if the first column contains no data.
