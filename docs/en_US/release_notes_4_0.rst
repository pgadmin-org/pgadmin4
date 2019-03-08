***********
Version 4.0
***********

Release date: 2019-01-10

This release contains a number of features and fixes reported since the release
of pgAdmin4 3.6


Features
********

| `Feature #3589 <https://redmine.postgresql.org/issues/3589>`_ - Allow query plans to be downloaded as an SVG file.
| `Feature #3692 <https://redmine.postgresql.org/issues/3692>`_ - New UI design.
| `Feature #3801 <https://redmine.postgresql.org/issues/3801>`_ - Allow servers to be pre-loaded into container deployments.

Bug fixes
*********

| `Bug #3083 <https://redmine.postgresql.org/issues/3083>`_ - Increase the size of the resize handle of the edit grid text pop-out.
| `Bug #3354 <https://redmine.postgresql.org/issues/3354>`_ - Fix handling of array types as inputs to the debugger.
| `Bug #3433 <https://redmine.postgresql.org/issues/3433>`_ - Fix an issue that could cause the Query Tool to fail to render.
| `Bug #3549 <https://redmine.postgresql.org/issues/3549>`_ - Display event trigger functions correctly on EPAS.
| `Bug #3559 <https://redmine.postgresql.org/issues/3559>`_ - Further improvements to treeview restoration.
| `Bug #3599 <https://redmine.postgresql.org/issues/3599>`_ - Run Postfix in the container build so passwords can be reset etc.
| `Bug #3619 <https://redmine.postgresql.org/issues/3619>`_ - Add titles to the code areas of the Query Tool and Debugger to ensure that panels can be re-docked within them.
| `Bug #3679 <https://redmine.postgresql.org/issues/3679>`_ - Fix a webpack issue that could cause the Query Tool to fail to render.
| `Bug #3702 <https://redmine.postgresql.org/issues/3702>`_ - Ensure we display the relation name (and not the OID) in the locks table wherever possible.
| `Bug #3711 <https://redmine.postgresql.org/issues/3711>`_ - Fix an encoding issue in the Query Tool.
| `Bug #3726 <https://redmine.postgresql.org/issues/3726>`_ - Include the WHERE clause on EXCLUDE constraints in RE-SQL.
| `Bug #3753 <https://redmine.postgresql.org/issues/3753>`_ - Fix an issue when user define Cast from smallint->text is created.
| `Bug #3757 <https://redmine.postgresql.org/issues/3757>`_ - Hide Radio buttons that should not be shown on the maintenance dialogue.
| `Bug #3780 <https://redmine.postgresql.org/issues/3780>`_ - Ensure that null values handled properly in CSV download.
| `Bug #3796 <https://redmine.postgresql.org/issues/3796>`_ - Tweak the wording on the Grant Wizard.
| `Bug #3797 <https://redmine.postgresql.org/issues/3797>`_ - Prevent attempts to bulk-drop schema objects.
| `Bug #3798 <https://redmine.postgresql.org/issues/3798>`_ - Ensure the browser toolbar buttons work in languages other than English.
| `Bug #3805 <https://redmine.postgresql.org/issues/3805>`_ - Allow horizontal sizing of the edit grid text pop-out.
| `Bug #3809 <https://redmine.postgresql.org/issues/3809>`_ - Ensure auto complete should works when first identifier in the FROM clause needs quoting.
| `Bug #3810 <https://redmine.postgresql.org/issues/3810>`_ - Ensure auto complete should works for columns from a schema-qualified table.
| `Bug #3821 <https://redmine.postgresql.org/issues/3821>`_ - Ensure identifiers are properly displayed in the plan viewer.
| `Bug #3830 <https://redmine.postgresql.org/issues/3830>`_ - Make the setup process more robust against aborted executions.
| `Bug #3856 <https://redmine.postgresql.org/issues/3856>`_ - Fixed an issue while creating export job.