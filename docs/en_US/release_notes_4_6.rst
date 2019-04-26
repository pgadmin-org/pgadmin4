***********
Version 4.6
***********

Release date: 2019-05-02

This release contains a number of new features and fixes reported since the
release of pgAdmin4 4.5

Features
********

| `Feature #4165 <https://redmine.postgresql.org/issues/4165>`_ - Depend on psycopg2-binary in the Python wheel, rather than psycopg2.

Bug fixes
*********

| `Bug #2392 <https://redmine.postgresql.org/issues/2392>`_ - Ensure that on clicking Delete button should not delete rows immediately from the database server, it should be deleted when Save button will be clicked.
| `Bug #3327 <https://redmine.postgresql.org/issues/3327>`_ - Ensure that newly added row in backgrid should be visible.
| `Bug #3582 <https://redmine.postgresql.org/issues/3582>`_ - Ensure that JSON strings as comments should be added properly for all the objects.
| `Bug #3605 <https://redmine.postgresql.org/issues/3605>`_ - Fix an issue where Deleting N number of rows makes first N number of rows disable.
| `Bug #3938 <https://redmine.postgresql.org/issues/3938>`_ - Added support for Default Partition.
| `Bug #4087 <https://redmine.postgresql.org/issues/4087>`_ - Fix an issue where 'GRANT UPDATE' sql should be displayed for default sequence privileges.
| `Bug #4101 <https://redmine.postgresql.org/issues/4101>`_ - Ensure that confirmation dialog should be popped up before reload of query tool or debugger if it is opened in a new browser tab.
| `Bug #4104 <https://redmine.postgresql.org/issues/4104>`_ - Ensure that record should be add/edited for root partition table with primary keys.
| `Bug #4121 <https://redmine.postgresql.org/issues/4121>`_ - Fixed alignment issue of columns in definition section of Index node.
| `Bug #4134 <https://redmine.postgresql.org/issues/4134>`_ - Fixed 'Location cannot be empty' error when open Tablespace properties.
| `Bug #4138 <https://redmine.postgresql.org/issues/4138>`_ - Fix an issue where the dropdown becomes misaligned/displaced.
| `Bug #4154 <https://redmine.postgresql.org/issues/4154>`_ - Ensure the treeview shows all sequences except those used to implement IDENTITY columns (which can be edited as part of the column). Show all if Show System Objects is enabled.
| `Bug #4160 <https://redmine.postgresql.org/issues/4160>`_ - Fixed 'Increment value cannot be empty' error for existing tables.
| `Bug #4161 <https://redmine.postgresql.org/issues/4161>`_ - Ensure that parameters of procedures for EPAS server 10 and below should be set/reset properly.
| `Bug #4163 <https://redmine.postgresql.org/issues/4163>`_ - Prevent duplicate columns being included in reverse engineered SQL for tables.
| `Bug #4182 <https://redmine.postgresql.org/issues/4182>`_ - Ensure sanity of the permissions on the storage and session directories and the config database.