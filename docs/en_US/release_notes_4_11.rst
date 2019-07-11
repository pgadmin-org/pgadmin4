************
Version 4.11
************

Release date: 2019-07-25

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.10.

New features
************

| `Issue #4335 <https://redmine.postgresql.org/issues/4335>`_ -  Add EXPLAIN options for SETTINGS and SUMMARY.
| `Issue #4318 <https://redmine.postgresql.org/issues/4318>`_ -  Set the mouse cursor appropriately based on the layout lock state.


Housekeeping
************

| `Issue #4415 <https://redmine.postgresql.org/issues/4415>`_ -  Add Reverse Engineered SQL tests for Roles and Resource Groups.
| `Issue #4441 <https://redmine.postgresql.org/issues/4441>`_ -  Add Reverse Engineered SQL tests for FDWs.
| `Issue #4452 <https://redmine.postgresql.org/issues/4452>`_ -  Add Reverse Engineered SQL tests for Languages.
| `Issue #4453 <https://redmine.postgresql.org/issues/4453>`_ -  Add Reverse Engineered SQL tests for Extensions.
| `Issue #4454 <https://redmine.postgresql.org/issues/4454>`_ -  Add Reverse Engineered SQL tests for FTS Configurations.
| `Issue #4456 <https://redmine.postgresql.org/issues/4456>`_ -  Add Reverse Engineered SQL tests for Packages.

Bug fixes
*********

| `Issue #4224 <https://redmine.postgresql.org/issues/4224>`_ -  Prevent flickering of large tooltips on the Graphical EXPLAIN canvas.
| `Issue #4393 <https://redmine.postgresql.org/issues/4393>`_ -  Ensure parameter values are quoted when needed when editing roles.
| `Issue #4395 <https://redmine.postgresql.org/issues/4395>`_ -  EXPLAIN options should be Query Tool instance-specific.
| `Issue #4429 <https://redmine.postgresql.org/issues/4429>`_ -  Ensure drag/drop from the treeview works as expected on Firefox.
| `Issue #4437 <https://redmine.postgresql.org/issues/4437>`_ -  Fix table icon issue when updating any existing field.
| `Issue #4442 <https://redmine.postgresql.org/issues/4442>`_ -  Ensure browser should not be started by Selenium when feature tests are excluded from a test run.
| `Issue #4450 <https://redmine.postgresql.org/issues/4450>`_ -  Fix reverse engineered sql for Foreign Data Wrapper created on EPAS server in redwood mode.