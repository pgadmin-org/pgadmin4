***********
Version 4.4
***********

Release date: 2019-04-04

This release contains a number of new features and fixes reported since the
release of pgAdmin4 4.3

Features
********

| `Feature #2001 <https://redmine.postgresql.org/issues/2001>`_ - Add support for reverse proxied setups with Gunicorn, and document Gunicorn, uWSGI & NGINX configurations.
| `Feature #4017 <https://redmine.postgresql.org/issues/4018>`_ - Make the Query Tool history persistent across sessions.
| `Feature #4018 <https://redmine.postgresql.org/issues/4018>`_ - Remove the large and unnecessary dependency on React and 87 other related libraries.
| `Feature #4075 <https://redmine.postgresql.org/issues/4075>`_ - Add an ePub doc build target.

Bug fixes
*********

| `Bug #1269 <https://redmine.postgresql.org/issues/1269>`_ - Fix naming inconsistency for the column and FTS parser modules.
| `Bug #3104 <https://redmine.postgresql.org/issues/3104>`_ - Improve a couple of German translations.
| `Bug #3995 <https://redmine.postgresql.org/issues/3995>`_ - Avoid 'bogus varno' message from Postgres when viewing the SQL for a table with triggers.
| `Bug #4019 <https://redmine.postgresql.org/issues/4019>`_ - Update all Python and JavaScript dependencies.
| `Bug #4050 <https://redmine.postgresql.org/issues/4050>`_ - Make the WHEN field a CodeMirror control on the Event Trigger dialogue.
| `Bug #4052 <https://redmine.postgresql.org/issues/4052>`_ - Fix the online help button on the resource group dialogue.
| `Bug #4053 <https://redmine.postgresql.org/issues/4053>`_ - Enable the online help button on the index dialogue.
| `Bug #4054 <https://redmine.postgresql.org/issues/4054>`_ - Handle resultsets with zero columns correctly in the Query Tool.
| `Bug #4060 <https://redmine.postgresql.org/issues/4060>`_ - Fix the latexpdf doc build.
| `Bug #4062 <https://redmine.postgresql.org/issues/4062>`_ - Fix handling of numeric arrays in View/Edit Data.
| `Bug #4069 <https://redmine.postgresql.org/issues/4069>`_ - Append the file suffix to filenames when needed in the File Create dialogue.
| `Bug #4071 <https://redmine.postgresql.org/issues/4071>`_ - Ensure that Firefox prompts for a filename/location when downloading query results as a CSV file.
| `Bug #4073 <https://redmine.postgresql.org/issues/4073>`_ - Change the CodeMirror active line background colour to $color-danger-lighter so it doesn't conflict with the selection colour.
| `Bug #4081 <https://redmine.postgresql.org/issues/4081>`_ - Fix the RE-SQL syntax for roles with a VALID UNTIL clause.
