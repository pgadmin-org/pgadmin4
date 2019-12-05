************
Version 4.14
************

Release date: 2019-10-17

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.13.

New features
************

| `Issue #3009 <https://redmine.postgresql.org/issues/3009>`_ -  Added Copy with headers functionality when copy data from Query Tool/View Data.
| `Issue #4778 <https://redmine.postgresql.org/issues/4778>`_ -  Implemented the Query Plan Analyser.
| `Issue #4823 <https://redmine.postgresql.org/issues/4823>`_ -  Include PostgreSQL 12 binaries in the container.

Housekeeping
************

| `Issue #4472 <https://redmine.postgresql.org/issues/4472>`_ -  Add Reverse Engineered and Modified SQL tests for Synonyms.
| `Issue #4628 <https://redmine.postgresql.org/issues/4628>`_ -  Add Reverse Engineered and Modified SQL tests for Unique Constraints.
| `Issue #4701 <https://redmine.postgresql.org/issues/4701>`_ -  Optimize Webpack to improve overall performance.

Bug fixes
*********

| `Issue #3386 <https://redmine.postgresql.org/issues/3386>`_ -  Ensure backup a partition table should not backup the whole database.
| `Issue #4199 <https://redmine.postgresql.org/issues/4199>`_ -  Ensure that 'ENTER' key in the data filter should not run the query.
| `Issue #4590 <https://redmine.postgresql.org/issues/4590>`_ -  Fix issue where backup fails for schema name that needs quoting.
| `Issue #4728 <https://redmine.postgresql.org/issues/4728>`_ -  Highlighted the color of closing or opening parenthesis when user select them in CodeMirror.
| `Issue #4751 <https://redmine.postgresql.org/issues/4751>`_ -  Fix issue where export job fails when deselecting all the columns.
| `Issue #4753 <https://redmine.postgresql.org/issues/4753>`_ -  Fix an error where 'false' string is displayed when we add a new parameter in the Parameters tab, also clear the old value when the user changes the parameter name.
| `Issue #4755 <https://redmine.postgresql.org/issues/4755>`_ -  Ensure that pgAdmin should work behind reverse proxy if the inbuilt server is used as it is.
| `Issue #4756 <https://redmine.postgresql.org/issues/4756>`_ -  Fix issue where pgAdmin does not load completely if loaded in an iframe.
| `Issue #4760 <https://redmine.postgresql.org/issues/4760>`_ -  Ensure the search path should not be quoted for Database.
| `Issue #4768 <https://redmine.postgresql.org/issues/4768>`_ -  Ensure pgAdmin should work behind reverse proxy on a non standard port.
| `Issue #4769 <https://redmine.postgresql.org/issues/4769>`_ -  Fix query tool open issue on Internet Explorer.
| `Issue #4777 <https://redmine.postgresql.org/issues/4777>`_ -  Fix issue where query history is not visible in the query history tab.
| `Issue #4780 <https://redmine.postgresql.org/issues/4780>`_ -  Ensure the search path should not be quoted for Function, Procedure and Trigger Function.
| `Issue #4791 <https://redmine.postgresql.org/issues/4791>`_ -  Fix issue where VALID foreign keys show as NOT VALID in the SQL tab for tables.
| `Issue #4817 <https://redmine.postgresql.org/issues/4817>`_ -  Ensure the MAC OSX app should be notarized for Catalina.
