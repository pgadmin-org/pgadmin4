************
Version 6.3
************

Release date: 2021-12-16

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.2.

New features
************

| `Issue #6872 <https://redmine.postgresql.org/issues/6872>`_ -  Include GSSAPI support in the PostgreSQL libraries and utilities on macOS.

Housekeeping
************

| `Issue #6088 <https://redmine.postgresql.org/issues/6088>`_ -  Replace Flask-BabelEx with Flask-Babel.
| `Issue #6984 <https://redmine.postgresql.org/issues/6984>`_ -  Port Backup Global, Backup Server, and Backup object dialog in React.
| `Issue #7010 <https://redmine.postgresql.org/issues/7010>`_ -  Upgrade Flask to version 2.

Bug fixes
*********

| `Issue #6906 <https://redmine.postgresql.org/issues/6906>`_ -  Fixed an issue where referenced table drop-down should be disabled in foreign key -> columns after one row is added.
| `Issue #6964 <https://redmine.postgresql.org/issues/6964>`_ -  Fixed an issue where properties of the database should not be visible after removing the database.
| `Issue #6986 <https://redmine.postgresql.org/issues/6986>`_ -  Fixed an issue where the user can't debug function with timestamp parameter.
| `Issue #6989 <https://redmine.postgresql.org/issues/6989>`_ -  Fixed an issue where the Change Password menu option is missing for internal authentication source when more than one authentication source is defined.
| `Issue #7005 <https://redmine.postgresql.org/issues/7005>`_ -  Fixed an issue where On-demand rows throw an error when any row cell is edited and saved it then scroll to get more rows.
| `Issue #7006 <https://redmine.postgresql.org/issues/7006>`_ -  Ensure that Python 3.10 and the latest eventlet dependency should not break the application.
| `Issue #7013 <https://redmine.postgresql.org/issues/7013>`_ -  Fix an RPM build issue that could lead to a conflict with python3 at installation.
| `Issue #7015 <https://redmine.postgresql.org/issues/7015>`_ -  Fixed an issue where the error is thrown while creating a new server using Add New Server from the dashboard while tree item is not selected.
| `Issue #7024 <https://redmine.postgresql.org/issues/7024>`_ -  Fixed an issue where reverse engineering SQL is wrong for Aggregate.
