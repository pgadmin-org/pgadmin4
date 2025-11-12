************
Version 4.11
************

Release date: 2019-07-25

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.10.

New features
************

| `Issue #1760 <https://redmine.postgresql.org/issues/1760>`_ -  Add support for editing of resultsets in the Query Tool, if the data can be identified as updatable.
| `Issue #4318 <https://redmine.postgresql.org/issues/4318>`_ -  Set the mouse cursor appropriately based on the layout lock state.
| `Issue #4335 <https://redmine.postgresql.org/issues/4335>`_ -  Add EXPLAIN options for SETTINGS and SUMMARY.


Housekeeping
************

| `Issue #4415 <https://redmine.postgresql.org/issues/4415>`_ -  Add Reverse Engineered SQL tests for Roles and Resource Groups.
| `Issue #4441 <https://redmine.postgresql.org/issues/4441>`_ -  Add Reverse Engineered SQL tests for FDWs.
| `Issue #4452 <https://redmine.postgresql.org/issues/4452>`_ -  Add Reverse Engineered SQL tests for Languages.
| `Issue #4453 <https://redmine.postgresql.org/issues/4453>`_ -  Add Reverse Engineered SQL tests for Extensions.
| `Issue #4454 <https://redmine.postgresql.org/issues/4454>`_ -  Add Reverse Engineered SQL tests for FTS Configurations.
| `Issue #4456 <https://redmine.postgresql.org/issues/4456>`_ -  Add Reverse Engineered SQL tests for Packages.
| `Issue #4460 <https://redmine.postgresql.org/issues/4460>`_ -  Add Reverse Engineered SQL tests for FTS Dictionaries.
| `Issue #4463 <https://redmine.postgresql.org/issues/4463>`_ -  Add Reverse Engineered SQL tests for Domains.
| `Issue #4464 <https://redmine.postgresql.org/issues/4464>`_ -  Add Reverse Engineered SQL tests for Collations.
| `Issue #4468 <https://redmine.postgresql.org/issues/4468>`_ -  Add Reverse Engineered SQL tests for Types.
| `Issue #4469 <https://redmine.postgresql.org/issues/4469>`_ -  Add Reverse Engineered SQL tests for Sequences.
| `Issue #4471 <https://redmine.postgresql.org/issues/4471>`_ -  Add Reverse Engineered SQL tests for FTS Parsers.
| `Issue #4475 <https://redmine.postgresql.org/issues/4475>`_ -  Add Reverse Engineered SQL tests for Constraints.

Bug fixes
*********

| `Issue #3919 <https://redmine.postgresql.org/issues/3919>`_ -  Allow keyboard navigation of all controls on subnode grids.
| `Issue #3996 <https://redmine.postgresql.org/issues/3996>`_ -  Fix dropping of pgAgent schedules through the Job properties.
| `Issue #4224 <https://redmine.postgresql.org/issues/4224>`_ -  Prevent flickering of large tooltips on the Graphical EXPLAIN canvas.
| `Issue #4389 <https://redmine.postgresql.org/issues/4389>`_ -  Fix an error that could be seen when editing column privileges.
| `Issue #4393 <https://redmine.postgresql.org/issues/4393>`_ -  Ensure parameter values are quoted when needed when editing roles.
| `Issue #4395 <https://redmine.postgresql.org/issues/4395>`_ -  EXPLAIN options should be Query Tool instance-specific.
| `Issue #4427 <https://redmine.postgresql.org/issues/4427>`_ -  Fix an error while retrieving json data from the table.
| `Issue #4428 <https://redmine.postgresql.org/issues/4428>`_ -  Fix 'malformed array literal' error when updating a pgAgent job.
| `Issue #4429 <https://redmine.postgresql.org/issues/4429>`_ -  Ensure drag/drop from the treeview works as expected on Firefox.
| `Issue #4437 <https://redmine.postgresql.org/issues/4437>`_ -  Fix table icon issue when updating any existing field.
| `Issue #4442 <https://redmine.postgresql.org/issues/4442>`_ -  Ensure browser should not be started by Selenium when feature tests are excluded from a test run.
| `Issue #4446 <https://redmine.postgresql.org/issues/4446>`_ -  Use ROLE consistently when generating RE-SQL for roles, not USER.
| `Issue #4448 <https://redmine.postgresql.org/issues/4448>`_ -  Fix an error seen when updating a connection string in a pgAgent job step.
| `Issue #4450 <https://redmine.postgresql.org/issues/4450>`_ -  Fix reverse engineered sql for Foreign Data Wrapper created on EPAS server in redwood mode.
| `Issue #4462 <https://redmine.postgresql.org/issues/4462>`_ -  Fix some minor UI issues on IE11.
| `Issue #4470 <https://redmine.postgresql.org/issues/4470>`_ -  Fix sequence reverse engineered SQL generation with quoted names on PG/EPAS 10+.
| `Issue #4484 <https://redmine.postgresql.org/issues/4484>`_ -  Fix an issue where Explain and Explain Analyze are not working, it's regression of #1760.
| `Issue #4485 <https://redmine.postgresql.org/issues/4485>`_ -  Fix an issue where Filter toolbar button is not working in view/edit data, it's regression of keyboard navigation.