************
Version 5.1
************

Release date: 2021-03-25

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.0.

New features
************

| `Issue #5404 <https://redmine.postgresql.org/issues/5404>`_ -  Show the login roles that are members of a group role be shown when examining a group role.
| `Issue #6212 <https://redmine.postgresql.org/issues/6212>`_ -  Make the container distribution a multi-arch build with x86_64 and Arm64 support.
| `Issue #6268 <https://redmine.postgresql.org/issues/6268>`_ -  Make 'kerberos' an optional feature in the Python wheel, to avoid the need to install MIT Kerberos on the system by default.
| `Issue #6270 <https://redmine.postgresql.org/issues/6270>`_ -  Added '--replace' option in Import server to replace the list of servers with the newly imported one.
| `Issue #6271 <https://redmine.postgresql.org/issues/6271>`_ -  Added zoom scaling options with keyboard shortcuts in runtime.

Housekeeping
************

| `Issue #3976 <https://redmine.postgresql.org/issues/3976>`_ -  Use schema qualification while accessing the catalog objects.
| `Issue #6176 <https://redmine.postgresql.org/issues/6176>`_ -  Make the 'Save Data Changes' icon to be more intuitive.

Bug fixes
*********

| `Issue #4014 <https://redmine.postgresql.org/issues/4014>`_ -  Fixed alignment issue under preferences for the German language.
| `Issue #4020 <https://redmine.postgresql.org/issues/4020>`_ -  Fixed color issue on the statistics tab for collection node in the safari browser.
| `Issue #4438 <https://redmine.postgresql.org/issues/4438>`_ -  Fixed an issue where adding/updating records fails if the table name contains percent sign.
| `Issue #4784 <https://redmine.postgresql.org/issues/4784>`_ -  Ensure that autovacuum and analyze scale factors should be editable with more than two decimals.
| `Issue #4847 <https://redmine.postgresql.org/issues/4847>`_ -  Fixed an issue where % displayed twice in explain analyze for query and table.
| `Issue #4849 <https://redmine.postgresql.org/issues/4849>`_ -  Rename text 'table' with 'relation' in the statistic tab for explain analyze.
| `Issue #4959 <https://redmine.postgresql.org/issues/4959>`_ -  Fixed an issue where the properties tab for collection nodes is unresponsive after switching the tabs.
| `Issue #5073 <https://redmine.postgresql.org/issues/5073>`_ -  Fixed an issue where the Save button is enabled for functions/procedures by default when open the properties dialog.
| `Issue #5119 <https://redmine.postgresql.org/issues/5119>`_ -  Fixed an issue where hanging symlinks in a directory cause select file dialog to break.
| `Issue #5467 <https://redmine.postgresql.org/issues/5467>`_ -  Allow underscores in the Windows installation path.
| `Issue #5628 <https://redmine.postgresql.org/issues/5628>`_ -  Remove the "launch now" option in the Windows installer, as UAC could cause it to run as an elevated user.
| `Issue #5810 <https://redmine.postgresql.org/issues/5810>`_ -  Ensure that cell content being auto selected when editing the cell data.
| `Issue #5869 <https://redmine.postgresql.org/issues/5869>`_ -  Ensure that SQL formatter should not add extra tabs and format the SQL correctly.
| `Issue #6018 <https://redmine.postgresql.org/issues/6018>`_ -  Fixed encoding issue when database encoding set to SQL_ASCII and name of the column is in ASCII character.
| `Issue #6159 <https://redmine.postgresql.org/issues/6159>`_ -  Ensure that the user should be able to kill the session from Dashboard if the user has a 'pg_signal_backend' role.
| `Issue #6206 <https://redmine.postgresql.org/issues/6206>`_ -  Ensure that the view/edit data panel should not be opened for unsupported nodes using the keyboard shortcut.
| `Issue #6227 <https://redmine.postgresql.org/issues/6227>`_ -  Ensure PGADMIN_DEFAULT_EMAIL looks sane when initialising a container deployment.
| `Issue #6228 <https://redmine.postgresql.org/issues/6228>`_ -  Improve the web setup script for Linux to make the platform detection more robust and overrideable.
| `Issue #6233 <https://redmine.postgresql.org/issues/6233>`_ -  Ensure that SQL formatter should not use tab size if 'Use spaces?' set to false.
| `Issue #6253 <https://redmine.postgresql.org/issues/6253>`_ -  Fixed an issue where the user is unable to create a subscription if the host/IP address for connection is 127.0.0.1.
| `Issue #6259 <https://redmine.postgresql.org/issues/6259>`_ -  Ensure that proper error message should be shown on the properties and statistics tab in case of insufficient privileges for a subscription.
| `Issue #6260 <https://redmine.postgresql.org/issues/6260>`_ -  Fixed an issue where the 'Create Slot' option is disabled in case of the same IP/host provided but the port is different.
| `Issue #6269 <https://redmine.postgresql.org/issues/6269>`_ -  Ensure the Python interpreter used by the runtime ignores user site-packages.
| `Issue #6272 <https://redmine.postgresql.org/issues/6272>`_ -  Fixed an issue where the user is not able to change the connection in Query Tool when any SQL file is opened.
| `Issue #6279 <https://redmine.postgresql.org/issues/6279>`_ -  Ensure that the venv activation scripts have the correct path in them on Linux.
| `Issue #6281 <https://redmine.postgresql.org/issues/6281>`_ -  Fixed an issue where schema diff showing wrong SQL when comparing triggers with different when clause.
| `Issue #6286 <https://redmine.postgresql.org/issues/6286>`_ -  Ensure that the template database should be visible while creating the database.
| `Issue #6292 <https://redmine.postgresql.org/issues/6292>`_ -  Fixed string index out of range error where the dependent tab is in focus and selecting any publication or table.
| `Issue #6294 <https://redmine.postgresql.org/issues/6294>`_ -  Fixed an issue where the dependent tab throwing an error when selecting any login/group role.
| `Issue #6307 <https://redmine.postgresql.org/issues/6307>`_ -  Fixed an issue where the incorrect values visible in the dependents tab for publication.
| `Issue #6312 <https://redmine.postgresql.org/issues/6312>`_ -  Fixed an issue where copy/paste rows in view data paste the wrong value for boolean type.
| `Issue #6316 <https://redmine.postgresql.org/issues/6316>`_ -  Ensure that the primary key should be visible properly in the table dialog.
| `Issue #6317 <https://redmine.postgresql.org/issues/6317>`_ -  Ensure that toggle buttons are accessible by most screen readers.
| `Issue #6322 <https://redmine.postgresql.org/issues/6322>`_ -  Fixed an issue where the top menu disappears when entering into the full screen for minimum screen resolution.
| `Issue #6323 <https://redmine.postgresql.org/issues/6323>`_ -  Ensure that the grantor name should be visible properly for the security tab in the table dialog.
