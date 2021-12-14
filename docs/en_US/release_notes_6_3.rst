************
Version 6.3
************

Release date: 2021-12-16

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.2.

New features
************

| `Issue #6543 <https://redmine.postgresql.org/issues/6543>`_ -  Added support for Two-factor authentication for improving security.
| `Issue #6872 <https://redmine.postgresql.org/issues/6872>`_ -  Include GSSAPI support in the PostgreSQL libraries and utilities on macOS.
| `Issue #7039 <https://redmine.postgresql.org/issues/7039>`_ -  Added support to disable the auto-discovery of the database servers.

Housekeeping
************

| `Issue #6088 <https://redmine.postgresql.org/issues/6088>`_ -  Replace Flask-BabelEx with Flask-Babel.
| `Issue #6984 <https://redmine.postgresql.org/issues/6984>`_ -  Port Backup Global, Backup Server, and Backup object dialog in React.
| `Issue #7004 <https://redmine.postgresql.org/issues/7004>`_ -  Replaced alertifyjs notifiers with React-based notistack.
| `Issue #7010 <https://redmine.postgresql.org/issues/7010>`_ -  Upgrade Flask to version 2.
| `Issue #7053 <https://redmine.postgresql.org/issues/7053>`_ -  Replace Alertify alert and confirm with React-based model dialog.

Bug fixes
*********

| `Issue #6840 <https://redmine.postgresql.org/issues/6840>`_ -  Fixed an issue where tooltip data are not displaying on downloaded graphical explain plan.
| `Issue #6877 <https://redmine.postgresql.org/issues/6877>`_ -  Fixed schema diff owner related issue.
| `Issue #6906 <https://redmine.postgresql.org/issues/6906>`_ -  Fixed an issue where referenced table drop-down should be disabled in foreign key -> columns after one row is added.
| `Issue #6955 <https://redmine.postgresql.org/issues/6955>`_ -  Ensure that sort order should be maintained when renaming a server group.
| `Issue #6957 <https://redmine.postgresql.org/issues/6957>`_ -  Fixed schema diff related some issues.
| `Issue #6963 <https://redmine.postgresql.org/issues/6963>`_ -  Ensure that the user should be allowed to set the schema of an extension while creating it.
| `Issue #6978 <https://redmine.postgresql.org/issues/6978>`_ -  Increase the width of the scrollbars.
| `Issue #6986 <https://redmine.postgresql.org/issues/6986>`_ -  Fixed an issue where the user can't debug function with timestamp parameter.
| `Issue #6989 <https://redmine.postgresql.org/issues/6989>`_ -  Fixed an issue where the Change Password menu option is missing for internal authentication source when more than one authentication source is defined.
| `Issue #7005 <https://redmine.postgresql.org/issues/7005>`_ -  Fixed an issue where On-demand rows throw an error when any row cell is edited and saved it then scroll to get more rows.
| `Issue #7006 <https://redmine.postgresql.org/issues/7006>`_ -  Ensure that Python 3.10 and the latest eventlet dependency should not break the application.
| `Issue #7013 <https://redmine.postgresql.org/issues/7013>`_ -  Fix an RPM build issue that could lead to a conflict with python3 at installation.
| `Issue #7015 <https://redmine.postgresql.org/issues/7015>`_ -  Fixed an issue where the error is thrown while creating a new server using Add New Server from the dashboard while tree item is not selected.
| `Issue #7020 <https://redmine.postgresql.org/issues/7020>`_ -  Ensure that statue message should not hide the last line of messages when running a long query.
| `Issue #7024 <https://redmine.postgresql.org/issues/7024>`_ -  Fixed an issue where reverse engineering SQL is wrong for Aggregate.
| `Issue #7029 <https://redmine.postgresql.org/issues/7029>`_ -  Correct the SQL definition for function/procedure with the Atomic keyword in PG14.
| `Issue #7031 <https://redmine.postgresql.org/issues/7031>`_ -  Fixed an issue where SQLite database definition is wrong because the USER_ID FK references the table user_old which is not available.
| `Issue #7040 <https://redmine.postgresql.org/issues/7040>`_ -  Add "section" to the Debian package control files.
| `Issue #7044 <https://redmine.postgresql.org/issues/7044>`_ -  Update the dropzone version to 5.9.3 and Flask-SQLAlchemy to 2.5.*.
| `Issue #7046 <https://redmine.postgresql.org/issues/7046>`_ -  Fixed some accessibility issues.
| `Issue #7048 <https://redmine.postgresql.org/issues/7048>`_ -  Fixed unhashable type issue while opening the about dialog.
| `Issue #7064 <https://redmine.postgresql.org/issues/7064>`_ -  Ensure that the Owner should not be disabled while creating the procedure.
| `Issue #7071 <https://redmine.postgresql.org/issues/7071>`_ -  Fixed an issue where confirmation pop-up is hidden behind Reassign/Drop Owned Dialog.
