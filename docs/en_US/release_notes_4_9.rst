***********
Version 4.9
***********

Release date: 2019-06-27

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.8.

New features
************


Bug fixes
*********

| `Bug #4171 <https://redmine.postgresql.org/issues/4171>`_ - Fix issue where reverse engineered SQL was failing for foreign tables, if it had "=" in the options.
| `Bug #4195 <https://redmine.postgresql.org/issues/4195>`_ - Fix keyboard navigation in "inner" tabsets such as the Query Tool and Debugger.
| `Bug #4253 <https://redmine.postgresql.org/issues/4253>`_ - Fix issue where new column should be created with Default value.
| `Bug #4255 <https://redmine.postgresql.org/issues/4255>`_ - Prevent the geometry viewer grabbing key presses when not in focus under Firefox, IE and Edge.
| `Bug #4310 <https://redmine.postgresql.org/issues/4310>`_ - Ensure that the Return key can be used to submit the Master Password dialogue.
| `Bug #4317 <https://redmine.postgresql.org/issues/4317>`_ - Ensure that browser auto-fill doesn't cause Help pages to be opened unexpectedly.
| `Bug #4320 <https://redmine.postgresql.org/issues/4320>`_ - Fix issue where SSH tunnel connection using password is failing, it's regression of Master Password.