************
Version 4.10
************

Release date: 2019-07-04

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.9.

New features
************

| `Issue #4139 <https://redmine.postgresql.org/issues/4139>`_ -  Allow some objects to be dragged/dropped into the Query Tool to insert their signature into the query text.
| `Issue #4400 <https://redmine.postgresql.org/issues/4400>`_ -  Allow the path to /pgadmin4/servers.json to be overridden in the container distribution.

Bug fixes
*********

| `Issue #4403 <https://redmine.postgresql.org/issues/4403>`_ - Ensure the browser close confirmation is only shown when closing a Query Tool which is running in a separate browser tab.
| `Issue #4404 <https://redmine.postgresql.org/issues/4404>`_ - Prevent an error that may occur when editing data with an integer primary key.
| `Issue #4407 <https://redmine.postgresql.org/issues/4407>`_ - Fix a quoting issue that caused a blank UI to be displayed when running in French.
| `Issue #4421 <https://redmine.postgresql.org/issues/4421>`_ - Ensure the version comparision should be correct for windows installer.