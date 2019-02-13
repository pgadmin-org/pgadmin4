***********
Version 4.3
***********

Release date: 2019-03-07

This release contains a number of new features and fixes reported since the release of pgAdmin4 4.2

Features
********

| `Feature #1825 <https://redmine.postgresql.org/issues/1825>`_ - Install a script to start pgAdmin (pgadmin4) from the command line when installed from the Python wheel.
| `Feature #3439 <https://redmine.postgresql.org/issues/3439>`_ - Allow X-FRAME-OPTIONS to be set for security. Default to SAMEORIGIN.

Bug fixes
*********

| `Bug #3873 <https://redmine.postgresql.org/issues/3873>`_ - Fix context sub-menu alignment on Safari.
| `Bug #3906 <https://redmine.postgresql.org/issues/3906>`_ - Fix alignment of Close and Maximize button of Grant Wizard.
| `Bug #3942 <https://redmine.postgresql.org/issues/3942>`_ - Close connections gracefully when the user logs out of pgAdmin.
| `Bug #3963 <https://redmine.postgresql.org/issues/3963>`_ - Fix alignment of import/export toggle switch.
| `Bug #3974 <https://redmine.postgresql.org/issues/3974>`_ - Fix alignment of Connection type toggle switch of pgagent.
| `Bug #3981 <https://redmine.postgresql.org/issues/3981>`_ - Fix the query to set bytea_output so that read-only standbys don't consider it a write query.
| `Bug #3985 <https://redmine.postgresql.org/issues/3985>`_ - Don't embed docs and external sites in iframes, to allow the external sites to set X-FRAME-OPTIONS = DENY for security.