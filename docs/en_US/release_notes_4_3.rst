***********
Version 4.3
***********

Release date: 2019-03-07

This release contains a number of new features and fixes reported since the
release of pgAdmin4 4.2

Features
********

| `Issue #1825 <https://redmine.postgresql.org/issues/1825>`_ - Install a script to start pgAdmin (pgadmin4) from the command line when installed from the Python wheel.
| `Issue #2233 <https://redmine.postgresql.org/issues/2233>`_ - Add a "scratch pad" to the Query Tool to hold text snippets whilst editing.
| `Issue #2418 <https://redmine.postgresql.org/issues/2418>`_ - Add Commit and Rollback buttons to the Query Tool.
| `Issue #3439 <https://redmine.postgresql.org/issues/3439>`_ - Allow X-FRAME-OPTIONS to be set for security. Default to SAMEORIGIN.
| `Issue #3559 <https://redmine.postgresql.org/issues/3559>`_ - Automatically expand child nodes as well as the selected node on the treeview if there is only one.
| `Issue #3886 <https://redmine.postgresql.org/issues/3886>`_ - Include multiple versions of the PG utilties in containers.
| `Issue #3991 <https://redmine.postgresql.org/issues/3991>`_ - Update Alpine Linux version in the docker container.
| `Issue #4034 <https://redmine.postgresql.org/issues/4034>`_ - Support double-click on Query Tool result grid column resize handles to auto-size to the content.

Bug fixes
*********

| `Bug #3096 <https://redmine.postgresql.org/issues/3096>`_ - Ensure size stats are prettified on the statistics tab when the UI language is not English.
| `Bug #3352 <https://redmine.postgresql.org/issues/3352>`_ - Handle display of roles with expiration set to infinity correctly.
| `Bug #3418 <https://redmine.postgresql.org/issues/3418>`_ - Allow editing of values in columns with the oid datatype which are not an actual row OID.
| `Bug #3544 <https://redmine.postgresql.org/issues/3544>`_ - Make the Query Tool tab titles more concise and useful.
| `Bug #3587 <https://redmine.postgresql.org/issues/3587>`_ - Fix support for bigint's in JSONB data.
| `Bug #3583 <https://redmine.postgresql.org/issues/3583>`_ - Update CodeMirror to 5.43.0 to resolve issues with auto-indent.
| `Bug #3600 <https://redmine.postgresql.org/issues/3600>`_ - Ensure JSON data isn't modified in-flight by psycopg2 when using View/Edit data.
| `Bug #3673 <https://redmine.postgresql.org/issues/3673>`_ - Modify the Download as CSV option to use the same connection as the Query Tool its running in so temporary tables etc. can be used.
| `Bug #3873 <https://redmine.postgresql.org/issues/3873>`_ - Fix context sub-menu alignment on Safari.
| `Bug #3890 <https://redmine.postgresql.org/issues/3890>`_ - Update documentation screenshots as per new design.
| `Bug #3906 <https://redmine.postgresql.org/issues/3906>`_ - Fix alignment of Close and Maximize button of Grant Wizard.
| `Bug #3911 <https://redmine.postgresql.org/issues/3911>`_ - Add full support and testsfor all PG server side encodings.
| `Bug #3912 <https://redmine.postgresql.org/issues/3912>`_ - Fix editing of table data with a JSON primary key.
| `Bug #3933 <https://redmine.postgresql.org/issues/3933>`_ - Ignore exceptions in the logger.
| `Bug #3942 <https://redmine.postgresql.org/issues/3942>`_ - Close connections gracefully when the user logs out of pgAdmin.
| `Bug #3946 <https://redmine.postgresql.org/issues/3946>`_ - Fix alignment of checkbox to drop multiple schedules of pgAgent job.
| `Bug #3958 <https://redmine.postgresql.org/issues/3958>`_ - Don't exclude SELECT statements from transaction management in the Query Tool in case they call data-modifying functions.
| `Bug #3959 <https://redmine.postgresql.org/issues/3959>`_ - Optimise display of Dependencies and Dependents, and use on-demand loading of rows in batches of 100.
| `Bug #3963 <https://redmine.postgresql.org/issues/3963>`_ - Fix alignment of import/export toggle switch.
| `Bug #3970 <https://redmine.postgresql.org/issues/3970>`_ - Prevent an error when closing the Sort/Filter dialogue with an empty filter string.
| `Bug #3974 <https://redmine.postgresql.org/issues/3974>`_ - Fix alignment of Connection type toggle switch of pgagent.
| `Bug #3981 <https://redmine.postgresql.org/issues/3981>`_ - Fix the query to set bytea_output so that read-only standbys don't consider it a write query.
| `Bug #3982 <https://redmine.postgresql.org/issues/3982>`_ - Add full support and testsfor all PG server side encodings.
| `Bug #3985 <https://redmine.postgresql.org/issues/3985>`_ - Don't embed docs and external sites in iframes, to allow the external sites to set X-FRAME-OPTIONS = DENY for security.
| `Bug #3992 <https://redmine.postgresql.org/issues/3992>`_ - Add full support and testsfor all PG server side encodings.
| `Bug #3998 <https://redmine.postgresql.org/issues/3998>`_ - Custom-encode forward slashes in URL parameters as Apache HTTPD doesn't allow them in some cases.
| `Bug #4000 <https://redmine.postgresql.org/issues/4000>`_ - Update CodeMirror to 5.43.0 to resolve issues with tab indent with use spaces enabled.
| `Bug #4013 <https://redmine.postgresql.org/issues/4013>`_ - Ensure long queries don't cause errors when downloading CSV in the Query Tool.
| `Bug #4021 <https://redmine.postgresql.org/issues/4021>`_ - Disable the editor and execute functions whilst queries are executing.
| `Bug #4022 <https://redmine.postgresql.org/issues/4022>`_ - Fix an issue where importing servers fails if a group already exists for a different user.