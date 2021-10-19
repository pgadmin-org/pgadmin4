************
Version 6.1
************

Release date: 2021-10-21

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.0.

New features
************

| `Issue #4596 <https://redmine.postgresql.org/issues/4596>`_ -  Added support for indent guides in the browser tree.
| `Issue #6081 <https://redmine.postgresql.org/issues/6081>`_ -  Added support for advanced table fields like the foreign key, primary key in the ERD tool.
| `Issue #6241 <https://redmine.postgresql.org/issues/6241>`_ -  Added support to allow tables to be dragged to ERD Tool.
| `Issue #6529 <https://redmine.postgresql.org/issues/6529>`_ -  Added index creation when generating SQL in the ERD tool.
| `Issue #6657 <https://redmine.postgresql.org/issues/6657>`_ -  Added support for authentication via the webserver (REMOTE_USER).
| `Issue #6794 <https://redmine.postgresql.org/issues/6794>`_ -  Added support to enable/disable rules.

Housekeeping
************


Bug fixes
*********

| `Issue #6719 <https://redmine.postgresql.org/issues/6719>`_ -  Fixed OAuth2 integration redirect issue.
| `Issue #6754 <https://redmine.postgresql.org/issues/6754>`_ -  Ensure that query highlighting color in the query tool should be less intensive.
| `Issue #6776 <https://redmine.postgresql.org/issues/6776>`_ -  Changed the label 'Inherits Tables?' to 'Is inherited?' as it misleading in the properties panel.
| `Issue #6790 <https://redmine.postgresql.org/issues/6790>`_ -  Fixed an issue where the user is unable to create an index with concurrently keyword.
| `Issue #6797 <https://redmine.postgresql.org/issues/6797>`_ -  Remove an extra blank line at the start of the SQL for function, procedure, and trigger function.
| `Issue #6802 <https://redmine.postgresql.org/issues/6802>`_ -  Fixed the issue of editing triggers for advanced servers.
| `Issue #6828 <https://redmine.postgresql.org/issues/6828>`_ -  Fixed an issue where the tree is not scrolling to the object selected from the search result.
| `Issue #6858 <https://redmine.postgresql.org/issues/6858>`_ -  Fixed object delete issue from the properties tab for the collection nodes.
| `Issue #6876 <https://redmine.postgresql.org/issues/6876>`_ -  Ensure that the Dashboard should get updated after connecting to the server.
| `Issue #6881 <https://redmine.postgresql.org/issues/6881>`_ -  Fixed an issue where the browser tree doesn't show all contents on changing resolution.
| `Issue #6882 <https://redmine.postgresql.org/issues/6882>`_ -  Ensure that columns should be displayed in the order of creation instead of alphabetical order in the browser tree.
| `Issue #6890 <https://redmine.postgresql.org/issues/6890>`_ -  Fixed background colour issue in the browser tree.
| `Issue #6891 <https://redmine.postgresql.org/issues/6891>`_ -  Added support for composite foreign keys in the ERD tool.
| `Issue #6900 <https://redmine.postgresql.org/issues/6900>`_ -  Fixed an issue where exclusion constraint cannot be created from table dialog if the access method name is changed once.
| `Issue #6905 <https://redmine.postgresql.org/issues/6905>`_ -  Fixed an issue where the users are unable to load the databases behind an HTTP reverse proxy.
| `Issue #6908 <https://redmine.postgresql.org/issues/6908>`_ -  Fixed an issue where each click to refresh the collection node, the number of objects decreasing by tens or more.
| `Issue #6912 <https://redmine.postgresql.org/issues/6912>`_ -  Fixed browser tree sort order regression issue.
| `Issue #6915 <https://redmine.postgresql.org/issues/6915>`_ -  Fixed an issue where the blank string is stored instead of NULL in the server table of SQLite database.
| `Issue #6928 <https://redmine.postgresql.org/issues/6928>`_ -  Ensure that the master password should be prompt when MASTER_PASSWORD_REQUIRED is set to True and AUTHENTICATION_SOURCES is webserver.
| `Issue #6929 <https://redmine.postgresql.org/issues/6929>`_ -  Ensure that only the table node should be allowed to drop on the ERD tool.
| `Issue #6930 <https://redmine.postgresql.org/issues/6930>`_ -  Fixed an issue where the existing server group is disappeared on rename it.
| `Issue #6935 <https://redmine.postgresql.org/issues/6935>`_ -  Fixed an issue where the wrong SQL is generated when deleting and renaming table columns together.
