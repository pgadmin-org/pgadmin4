************
Version 6.5
************

Release date: 2021-02-10

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.4.

New features
************


Housekeeping
************

| `Issue #7016 <https://redmine.postgresql.org/issues/7016>`_ -  Port Dependent, dependencies, statistics panel to React.
| `Issue #7017 <https://redmine.postgresql.org/issues/7017>`_ -  Port Import/Export dialog to React.

Bug fixes
*********

| `Issue #6916 <https://redmine.postgresql.org/issues/6916>`_ -  Added flag in runtime to disable GPU hardware acceleration.
| `Issue #7035 <https://redmine.postgresql.org/issues/7035>`_ -  Fixed an issue where connections keep open to (closed) connections on the initial connection to the database server.
| `Issue #7085 <https://redmine.postgresql.org/issues/7085>`_ -  Ensure that Partitioned tables should be visible correctly when creating multiple partition levels.
| `Issue #7086 <https://redmine.postgresql.org/issues/7086>`_ -  Correct documentation for 'Add named restore point'.
| `Issue #7100 <https://redmine.postgresql.org/issues/7100>`_ -  Fixed an issue where the Browser tree gets disappears when scrolling sequences.
| `Issue #7109 <https://redmine.postgresql.org/issues/7109>`_ -  Make the size blank for all the directories in the file select dialog.
| `Issue #7110 <https://redmine.postgresql.org/issues/7110>`_ -  Ensure that cursor should be focused on the first options of the Utility dialogs.
| `Issue #7118 <https://redmine.postgresql.org/issues/7118>`_ -  Ensure that JSON files should be downloaded properly from the storage manager.
| `Issue #7123 <https://redmine.postgresql.org/issues/7123>`_ -  Fixed an issue where restore generates incorrect options for the schema.
| `Issue #7126 <https://redmine.postgresql.org/issues/7126>`_ -  Fixed an issue where the F2 Function key removes browser panel contents.
| `Issue #7127 <https://redmine.postgresql.org/issues/7127>`_ -  Added validation for Hostname in the server dialog.
| `Issue #7135 <https://redmine.postgresql.org/issues/7135>`_ -  Enforce the minimum Windows version that the installer will run on.
| `Issue #7136 <https://redmine.postgresql.org/issues/7136>`_ -  Fixed an issue where the query tool is displaying an incorrect label.
| `Issue #7142 <https://redmine.postgresql.org/issues/7142>`_ -  Fixed an issue where a warning message was shown after database creation/modification.
| `Issue #7145 <https://redmine.postgresql.org/issues/7145>`_ -  Ensure that owner should be ignored while comparing extensions.
| `Issue #7146 <https://redmine.postgresql.org/issues/7146>`_ -  Fixed event trigger comparing issue in Schema Diff tool.
