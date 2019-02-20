***********
Version 4.3
***********

Release date: 2019-03-07

This release contains a number of new features and fixes reported since the release of pgAdmin4 4.2

Features
********

| `Feature #1825 <https://redmine.postgresql.org/issues/1825>`_ - Install a script to start pgAdmin (pgadmin4) from the command line when installed from the Python wheel.
| `Feature #2233 <https://redmine.postgresql.org/issues/2233>`_ - Add a "scratch pad" to the Query Tool to hold text snippets whilst editing.
| `Feature #3439 <https://redmine.postgresql.org/issues/3439>`_ - Allow X-FRAME-OPTIONS to be set for security. Default to SAMEORIGIN.
| `Feature #3559 <https://redmine.postgresql.org/issues/3559>`_ - Automatically expand child nodes as well as the selected node on the treeview if there is only one.
| `Feature #3886 <https://redmine.postgresql.org/issues/3886>`_ - Include multiple versions of the PG utilties in containers.
| `Feature #3991 <https://redmine.postgresql.org/issues/3991>`_ - Update Alpine Linux version in the docker container.

Bug fixes
*********

| `Bug #3544 <https://redmine.postgresql.org/issues/3544>`_ - Make the Query Tool tab titles more concise and useful.
| `Bug #3673 <https://redmine.postgresql.org/issues/3673>`_ - Modify the Download as CSV option to use the same connection as the Query Tool its running in so temporary tables etc. can be used.
| `Bug #3873 <https://redmine.postgresql.org/issues/3873>`_ - Fix context sub-menu alignment on Safari.
| `Bug #3906 <https://redmine.postgresql.org/issues/3906>`_ - Fix alignment of Close and Maximize button of Grant Wizard.
| `Bug #3912 <https://redmine.postgresql.org/issues/3912>`_ - Fix editing of table data with a JSON primary key.
| `Bug #3942 <https://redmine.postgresql.org/issues/3942>`_ - Close connections gracefully when the user logs out of pgAdmin.
| `Bug #3946 <https://redmine.postgresql.org/issues/3946>`_ - Fix alignment of checkbox to drop multiple schedules of pgAgent job.
| `Bug #3959 <https://redmine.postgresql.org/issues/3959>`_ - Optimise display of Dependencies and Dependents, and use on-demand loading of rows in batches of 100.
| `Bug #3963 <https://redmine.postgresql.org/issues/3963>`_ - Fix alignment of import/export toggle switch.
| `Bug #3970 <https://redmine.postgresql.org/issues/3970>`_ - Prevent an error when closing the Sort/Filter dialogue with an empty filter string.
| `Bug #3974 <https://redmine.postgresql.org/issues/3974>`_ - Fix alignment of Connection type toggle switch of pgagent.
| `Bug #3981 <https://redmine.postgresql.org/issues/3981>`_ - Fix the query to set bytea_output so that read-only standbys don't consider it a write query.
| `Bug #3985 <https://redmine.postgresql.org/issues/3985>`_ - Don't embed docs and external sites in iframes, to allow the external sites to set X-FRAME-OPTIONS = DENY for security.