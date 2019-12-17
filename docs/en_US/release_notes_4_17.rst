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


Bug fixes
*********

| `Issue #4506 <https://redmine.postgresql.org/issues/4506>`_ -  Fix an issue where clicking on an empty textbox like fill factor or comments, considers it as change and enabled the save button.
| `Issue #4943 <https://redmine.postgresql.org/issues/4943>`_ -  Added more information to the 'Database connected/disconnected' message.
| `Issue #4999 <https://redmine.postgresql.org/issues/4999>`_ -  Rename some internal environment variables that could conflict with Kubernetes.
| `Issue #5004 <https://redmine.postgresql.org/issues/5004>`_ -  Fix vulnerability issues reported by 'yarn audit'. Replace the deprecated uglifyjs-webpack-plugin with a terser-webpack-plugin.