************
Version 4.22
************

Release date: 2020-05-28

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.21.

New features
************


Housekeeping
************

| `Issue #5443 <https://redmine.postgresql.org/issues/5443>`_ -  Remove support for Python 2.
| `Issue #5444 <https://redmine.postgresql.org/issues/5444>`_ -  Cleanup Python detection in the runtime project file.
| `Issue #5455 <https://redmine.postgresql.org/issues/5455>`_ -  Refactor pgAdmin4.py so it can be imported and is a lot more readable.

Bug fixes
*********

| `Issue #3694 <https://redmine.postgresql.org/issues/3694>`_ -  Gracefully informed the user that the database is already connected when they click on "Connect Database...".
| `Issue #4279 <https://redmine.postgresql.org/issues/4279>`_ -  Ensure that file browse "home" button should point to $HOME rather than /.
| `Issue #5422 <https://redmine.postgresql.org/issues/5422>`_ -  Ensure that the dependencies tab shows correct information for Synonyms.
| `Issue #5466 <https://redmine.postgresql.org/issues/5466>`_ -  Correct ipv4 "all interfaces" address in the container docs, per Frank Limpert.
| `Issue #5469 <https://redmine.postgresql.org/issues/5469>`_ -  Fixed an issue where select2 hover is inconsistent for the SSL field in create server dialog.
| `Issue #5473 <https://redmine.postgresql.org/issues/5473>`_ -  Fixed post-login redirect location when running in server mode under a non-default root.