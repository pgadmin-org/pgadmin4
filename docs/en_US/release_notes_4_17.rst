************
Version 4.17
************

Release date: 2020-01-09

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.16.

New features
************

| `Issue #4764 <https://redmine.postgresql.org/issues/4764>`_ -  Allow screen-reader to read relationship attributes in nested elements.

Housekeeping
************

| `Issue #4988 <https://redmine.postgresql.org/issues/4988>`_ -  Refactored SQL of Table's and it's child nodes.
| `Issue #5017 <https://redmine.postgresql.org/issues/5017>`_ -  Use cheroot as default production server for pgAdmin4.
| `Issue #5023 <https://redmine.postgresql.org/issues/5023>`_ -  Refactored SQL of Views and Materialized Views.
| `Issue #5024 <https://redmine.postgresql.org/issues/5024>`_ -  Refactored SQL of Functions and Procedures.

Bug fixes
*********

| `Issue #4506 <https://redmine.postgresql.org/issues/4506>`_ -  Fix an issue where clicking on an empty textbox like fill factor or comments, considers it as change and enabled the save button.
| `Issue #4943 <https://redmine.postgresql.org/issues/4943>`_ -  Added more information to the 'Database connected/disconnected' message.
| `Issue #4999 <https://redmine.postgresql.org/issues/4999>`_ -  Rename some internal environment variables that could conflict with Kubernetes.
| `Issue #5004 <https://redmine.postgresql.org/issues/5004>`_ -  Fix vulnerability issues reported by 'yarn audit'. Replace the deprecated uglifyjs-webpack-plugin with a terser-webpack-plugin.
| `Issue #5008 <https://redmine.postgresql.org/issues/5008>`_ -  Ensure that the error message should not be displayed if Tablespace is not selected while creating the index.
| `Issue #5009 <https://redmine.postgresql.org/issues/5009>`_ -  Fix an issue where operator, access method and operator class is not visible for exclusion constraints.