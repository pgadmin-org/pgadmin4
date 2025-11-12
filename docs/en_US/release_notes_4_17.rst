************
Version 4.17
************

Release date: 2020-01-09

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.16.

New features
************

| `Issue #4764 <https://redmine.postgresql.org/issues/4764>`_ -  Allow screen-reader to read relationship attributes in nested elements.
| `Issue #5060 <https://redmine.postgresql.org/issues/5060>`_ -  Ensure all binaries are securely signed and linked with the hardened runtime in the macOS bundle

Housekeeping
************

| `Issue #4988 <https://redmine.postgresql.org/issues/4988>`_ -  Refactored SQL of Table's and it's child nodes.
| `Issue #5023 <https://redmine.postgresql.org/issues/5023>`_ -  Refactored SQL of Views and Materialized Views.
| `Issue #5024 <https://redmine.postgresql.org/issues/5024>`_ -  Refactored SQL of Functions and Procedures.
| `Issue #5038 <https://redmine.postgresql.org/issues/5038>`_ -  Added support for on-demand loading of items in Select2.
| `Issue #5048 <https://redmine.postgresql.org/issues/5048>`_ -  Added code coverage tool for pgAdmin.

Bug fixes
*********

| `Issue #4198 <https://redmine.postgresql.org/issues/4198>`_ -  Fix syntax highlighting in code mirror for backslash and escape constant.
| `Issue #4506 <https://redmine.postgresql.org/issues/4506>`_ -  Fix an issue where clicking on an empty textbox like fill factor or comments, considers it as change and enabled the save button.
| `Issue #4633 <https://redmine.postgresql.org/issues/4633>`_ -  Added support to view multilevel partitioned tables.
| `Issue #4842 <https://redmine.postgresql.org/issues/4842>`_ -  Ensure that constraints, indexes, rules, triggers, and compound triggers should be created on partitions.
| `Issue #4943 <https://redmine.postgresql.org/issues/4943>`_ -  Added more information to the 'Database connected/disconnected' message.
| `Issue #4950 <https://redmine.postgresql.org/issues/4950>`_ -  Ensure that the user should be able to select/modify tablespace for the partitioned table on v12 and above.
| `Issue #4999 <https://redmine.postgresql.org/issues/4999>`_ -  Rename some internal environment variables that could conflict with Kubernetes.
| `Issue #5004 <https://redmine.postgresql.org/issues/5004>`_ -  Fix vulnerability issues reported by 'yarn audit'. Replace the deprecated uglifyjs-webpack-plugin with a terser-webpack-plugin.
| `Issue #5008 <https://redmine.postgresql.org/issues/5008>`_ -  Ensure that the error message should not be displayed if Tablespace is not selected while creating the index.
| `Issue #5009 <https://redmine.postgresql.org/issues/5009>`_ -  Fix an issue where operator, access method and operator class is not visible for exclusion constraints.
| `Issue #5013 <https://redmine.postgresql.org/issues/5013>`_ -  Add a note to the documentation about the use of non-privileged ports on filesystems that don't support extended attributes when running the container.
| `Issue #5047 <https://redmine.postgresql.org/issues/5047>`_ -  Added tab navigation for tabs under explain panel in query tool.
| `Issue #5068 <https://redmine.postgresql.org/issues/5068>`_ -  Fix an issue where the table is not created with autovacuum_enabled and toast.autovacuum_enabled for PG/EPAS 12.