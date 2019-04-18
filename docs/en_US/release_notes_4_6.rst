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
| `Bug #3582 <https://redmine.postgresql.org/issues/3582>`_ - Ensure that JSON strings as comments should be added properly for all the objects.
| `Bug #3605 <https://redmine.postgresql.org/issues/3605>`_ - Fix an issue where Deleting N number of rows makes first N number of rows disable.
| `Bug #3938 <https://redmine.postgresql.org/issues/3938>`_ - Added support for Default Partition.
| `Bug #4104 <https://redmine.postgresql.org/issues/4104>`_ - Ensure that record should be add/edited for root partition table with primary keys.
| `Bug #4121 <https://redmine.postgresql.org/issues/4121>`_ - Fixed alignment issue of columns in definition section of Index node.
| `Bug #4138 <https://redmine.postgresql.org/issues/4138>`_ - Fix an issue where the dropdown becomes misaligned/displaced.
| `Bug #4161 <https://redmine.postgresql.org/issues/4161>`_ - Ensure that parameters of procedures for EPAS server 10 and below should be set/reset properly.
| `Bug #4182 <https://redmine.postgresql.org/issues/4182>`_ - Ensure sanity of the permissions on the storage and session directories and the config database.