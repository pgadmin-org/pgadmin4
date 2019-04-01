***********
Version 4.4
***********

Release date: 2019-04-04

This release contains a number of new features and fixes reported since the
release of pgAdmin4 4.3.

.. warning:: This release includes a bug fix
    (`Bug #3887 <https://redmine.postgresql.org/issues/3887>`_) which will
    rename the per-user storage directories for existing users when running in
    server mode. Previously, saved SQL queries were stored under the
    *STORAGE_DIR* in a sub-directory named after the username part of the user's
    email address. From this version onwards, the full email address is used,
    with the @ replaced with an underscore. For example, in v.4.3 with
    *STORAGE_DIR* set to */var/lib/pgadmin4* user files may be stored in:

    .. code-block:: bash

        /var/lib/pgadmin4/storage/username/

    With the fix, that directory will be renamed (or created for new users) as:

    .. code-block:: bash

        /var/lib/pgadmin4/storage/username_example.com/

Features
********

| `Feature #2001 <https://redmine.postgresql.org/issues/2001>`_ - Add support for reverse proxied setups with Gunicorn, and document Gunicorn, uWSGI & NGINX configurations.
| `Feature #4017 <https://redmine.postgresql.org/issues/4017>`_ - Make the Query Tool history persistent across sessions.
| `Feature #4018 <https://redmine.postgresql.org/issues/4018>`_ - Remove the large and unnecessary dependency on React and 87 other related libraries.
| `Feature #4030 <https://redmine.postgresql.org/issues/4030>`_ - Add support for IDENTITY columns.
| `Feature #4075 <https://redmine.postgresql.org/issues/4075>`_ - Add an ePub doc build target.

Bug fixes
*********

| `Bug #1269 <https://redmine.postgresql.org/issues/1269>`_ - Fix naming inconsistency for the column and FTS parser modules.
| `Bug #2627 <https://redmine.postgresql.org/issues/2627>`_ - Include inherited column comments and defaults in reverse engineered table SQL.
| `Bug #3104 <https://redmine.postgresql.org/issues/3104>`_ - Improve a couple of German translations.
| `Bug #3887 <https://redmine.postgresql.org/issues/3887>`_ - Use the user's full email address (not just the username part) as the basis for the storage directory name.
| `Bug #3968 <https://redmine.postgresql.org/issues/3968>`_ - Update wcDocker to fix the issue where the Scratch Pad grows in size if the results panel is resized.
| `Bug #3995 <https://redmine.postgresql.org/issues/3995>`_ - Avoid 'bogus varno' message from Postgres when viewing the SQL for a table with triggers.
| `Bug #4019 <https://redmine.postgresql.org/issues/4019>`_ - Update all Python and JavaScript dependencies.
| `Bug #4037 <https://redmine.postgresql.org/issues/4037>`_ - Include comment SQL for inherited columns in reverse engineered table SQL.
| `Bug #4050 <https://redmine.postgresql.org/issues/4050>`_ - Make the WHEN field a CodeMirror control on the Event Trigger dialogue.
| `Bug #4052 <https://redmine.postgresql.org/issues/4052>`_ - Fix the online help button on the resource group dialogue.
| `Bug #4053 <https://redmine.postgresql.org/issues/4053>`_ - Enable the online help button on the index dialogue.
| `Bug #4054 <https://redmine.postgresql.org/issues/4054>`_ - Handle resultsets with zero columns correctly in the Query Tool.
| `Bug #4058 <https://redmine.postgresql.org/issues/4058>`_ - Include inherited columns in SELECT scripts.
| `Bug #4060 <https://redmine.postgresql.org/issues/4060>`_ - Fix the latexpdf doc build.
| `Bug #4062 <https://redmine.postgresql.org/issues/4062>`_ - Fix handling of numeric arrays in View/Edit Data.
| `Bug #4063 <https://redmine.postgresql.org/issues/4063>`_ - Enlarge the grab handles for resizing dialogs etc.
| `Bug #4069 <https://redmine.postgresql.org/issues/4069>`_ - Append the file suffix to filenames when needed in the File Create dialogue.
| `Bug #4071 <https://redmine.postgresql.org/issues/4071>`_ - Ensure that Firefox prompts for a filename/location when downloading query results as a CSV file.
| `Bug #4073 <https://redmine.postgresql.org/issues/4073>`_ - Change the CodeMirror active line background colour to $color-danger-lighter so it doesn't conflict with the selection colour.
| `Bug #4081 <https://redmine.postgresql.org/issues/4081>`_ - Fix the RE-SQL syntax for roles with a VALID UNTIL clause.
| `Bug #4082 <https://redmine.postgresql.org/issues/4082>`_ - Prevent an empty error message being shown when "downloading" a CREATE script using the CSV download.
| `Bug #4084 <https://redmine.postgresql.org/issues/4084>`_ - Overhaul the layout saving code so it includes the Query Tool and Debugger, and stores the layout when change events are detected rather than (unreliably) on exit.
| `Bug #4085 <https://redmine.postgresql.org/issues/4085>`_ - Display errors during CSV download from the Query Tool in the UI rather than putting them in the CSV file.
| `Bug #4090 <https://redmine.postgresql.org/issues/4090>`_ - Improve the German translation for Backup Server.
| `Bug #4096 <https://redmine.postgresql.org/issues/4096>`_ - Ensure the toolbar buttons are properly reset following a CSV download in the Query Tool.
| `Bug #4099 <https://redmine.postgresql.org/issues/4099>`_ - Fix SQL help for EPAS 10+, and refactor the URL generation code into a testable function.
| `Bug #4100 <https://redmine.postgresql.org/issues/4100>`_ - Ensure sequences can be created with increment, start, minimum and maximum options set.
| `Bug #4105 <https://redmine.postgresql.org/issues/4105>`_ - Fix an issue where JSON data would not be rendered in the Query Tool.
| `Bug #4109 <https://redmine.postgresql.org/issues/4109>`_ - Ensure View/Materialized View node should be visible after updating any property.
| `Bug #4110 <https://redmine.postgresql.org/issues/4110>`_ - Fix custom autovacuum configuration for Materialized Views.