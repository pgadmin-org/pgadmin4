***********
Version 4.2
***********

Release date: 2019-02-07

This release contains a number of fixes reported since the release of pgAdmin4
4.1

Bug fixes
*********

| `Issue #3051 <https://redmine.postgresql.org/issues/3051>`_ - Replace Bootstrap switch with Bootstrap4 toggle to improve the performance.
| `Issue #3272 <https://redmine.postgresql.org/issues/3272>`_ - Replace the PyCrypto module with the cryptography module.
| `Issue #3453 <https://redmine.postgresql.org/issues/3453>`_ - Fixed SQL for foreign table options.
| `Issue #3475 <https://redmine.postgresql.org/issues/3475>`_ - Fixed execution time to show Hours part for long running queries in Query Tool.
| `Issue #3608 <https://redmine.postgresql.org/issues/3608>`_ - Messages tab of Query Tool should be clear on subsequent execution of table/view using View/Edit Data.
| `Issue #3609 <https://redmine.postgresql.org/issues/3609>`_ - Clear drop-down menu should be disabled for View/Edit Data.
| `Issue #3664 <https://redmine.postgresql.org/issues/3664>`_ - Fixed Statistics panel hang issue for 1000+ tables.
| `Issue #3693 <https://redmine.postgresql.org/issues/3693>`_ - Proper error should be thrown when server group is created with existing name.
| `Issue #3695 <https://redmine.postgresql.org/issues/3695>`_ - Ensure long string should be wrap in alertify dialogs.
| `Issue #3697 <https://redmine.postgresql.org/issues/3697>`_ - Ensure that output of the query should be displayed even if Data Output window is detached from the Query Tool.
| `Issue #3740 <https://redmine.postgresql.org/issues/3740>`_ - Inline edbspl trigger functions should not be visible in Grant Wizard.
| `Issue #3774 <https://redmine.postgresql.org/issues/3774>`_ - Proper SQL should be generated when create function with return type as custom type argument.
| `Issue #3800 <https://redmine.postgresql.org/issues/3800>`_ - Ensure that database restriction of server dialog should work with special characters.
| `Issue #3811 <https://redmine.postgresql.org/issues/3811>`_ - Ensure that Backup/Restore button should work on single click.
| `Issue #3837 <https://redmine.postgresql.org/issues/3837>`_ - Fixed SQL for when clause while creating Trigger.
| `Issue #3838 <https://redmine.postgresql.org/issues/3838>`_ - Proper SQL should be generated when creating/changing column with custom type argument.
| `Issue #3840 <https://redmine.postgresql.org/issues/3840>`_ - Ensure that file format combo box value should be retained when hidden files checkbox is toggled.
| `Issue #3846 <https://redmine.postgresql.org/issues/3846>`_ - Proper SQL should be generated when create procedure with custom type arguments.
| `Issue #3849 <https://redmine.postgresql.org/issues/3849>`_ - Ensure that browser should warn before close or refresh.
| `Issue #3850 <https://redmine.postgresql.org/issues/3850>`_ - Fixed EXEC script for procedures.
| `Issue #3853 <https://redmine.postgresql.org/issues/3853>`_ - Proper SQL should be generated when create domain of type interval with precision.
| `Issue #3858 <https://redmine.postgresql.org/issues/3858>`_ - Drop-down should be closed when click on any other toolbar button.
| `Issue #3862 <https://redmine.postgresql.org/issues/3862>`_ - Fixed keyboard navigation for dialog tabs.
| `Issue #3865 <https://redmine.postgresql.org/issues/3865>`_ - Increase frames splitter mouse hover area to make it easier to resize.
| `Issue #3871 <https://redmine.postgresql.org/issues/3871>`_ - Fixed alignment of tree arrow icons for Internet Explorer.
| `Issue #3872 <https://redmine.postgresql.org/issues/3872>`_ - Ensure object names in external process dialogues are properly escaped.
| `Issue #3891 <https://redmine.postgresql.org/issues/3891>`_ - Correct order of Save and Cancel button for json/jsonb editing.
| `Issue #3897 <https://redmine.postgresql.org/issues/3897>`_ - Data should be updated properly for FTS Configurations, FTS Dictionaries, FTS Parsers and FTS Templates.
| `Issue #3899 <https://redmine.postgresql.org/issues/3899>`_ - Fixed unable to drop multiple Rules and Foreign Tables from properties tab.
| `Issue #3903 <https://redmine.postgresql.org/issues/3903>`_ - Fixed Query Tool Initialization Error.
| `Issue #3908 <https://redmine.postgresql.org/issues/3908>`_ - Fixed keyboard navigation for Select2 and Privilege cell in Backgrid.
| `Issue #3916 <https://redmine.postgresql.org/issues/3916>`_ - Correct schema should be displayed in Materialized View dialog.
| `Issue #3927 <https://redmine.postgresql.org/issues/3927>`_ - Fixed debugger issue for procedure inside package for EPAS servers.
| `Issue #3929 <https://redmine.postgresql.org/issues/3929>`_ - Fix alignment of help messages in properties panels.
| `Issue #3932 <https://redmine.postgresql.org/issues/3932>`_ - Fix alignment of submenu for Internet Explorer.
| `Issue #3935 <https://redmine.postgresql.org/issues/3935>`_ - Ensure that grant wizard should list down functions for EPAS server running with no-redwood-compat mode.
| `Issue #3941 <https://redmine.postgresql.org/issues/3941>`_ - Dashboard graph optimization.
| `Issue #3954 <https://redmine.postgresql.org/issues/3954>`_ - Remove Python 2.6 code that's now obsolete.
| `Issue #3955 <https://redmine.postgresql.org/issues/3955>`_ - Expose the bind address in the Docker container via PGADMIN_BIND_ADDRESS.
| `Issue #3961 <https://redmine.postgresql.org/issues/3961>`_ - Exclude HTTPExceptions from the all_exception_handler as they should be returned as-is.