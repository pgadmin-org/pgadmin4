************
Version 5.1
************

Release date: 2021-03-25

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.0.

New features
************


Housekeeping
************


Bug fixes
*********

| `Issue #4959 <https://redmine.postgresql.org/issues/4959>`_ -  Fixed an issue where the properties tab for collection nodes is unresponsive after switching the tabs.
| `Issue #5073 <https://redmine.postgresql.org/issues/5073>`_ -  Fixed an issue where the Save button is enabled for functions/procedures by default when open the properties dialog.
| `Issue #5467 <https://redmine.postgresql.org/issues/5467>`_ -  Allow underscores in the Windows installation path.
| `Issue #5628 <https://redmine.postgresql.org/issues/5628>`_ -  Remove the "launch now" option in the Windows installer, as UAC could cause it to run as an elevated user.
| `Issue #6018 <https://redmine.postgresql.org/issues/6018>`_ -  Fixed encoding issue when database encoding set to SQL_ASCII and name of the column is in ASCII character.
| `Issue #6159 <https://redmine.postgresql.org/issues/6159>`_ -  Ensure that the user should be able to kill the session from Dashboard if the user has a 'pg_signal_backend' role.
| `Issue #6227 <https://redmine.postgresql.org/issues/6227>`_ -  Ensure PGADMIN_DEFAULT_EMAIL looks sane when initialising a container deployment.
| `Issue #6253 <https://redmine.postgresql.org/issues/6253>`_ -  Fixed an issue where the user is unable to create a subscription if the host/IP address for connection is 127.0.0.1.
| `Issue #6259 <https://redmine.postgresql.org/issues/6259>`_ -  Ensure that proper error message should be shown on the properties and statistics tab in case of insufficient privileges for a subscription.
| `Issue #6260 <https://redmine.postgresql.org/issues/6260>`_ -  Fixed an issue where the 'Create Slot' option is disabled in case of the same IP/host provided but the port is different.
| `Issue #6281 <https://redmine.postgresql.org/issues/6281>`_ -  Fixed an issue where schema diff showing wrong SQL when comparing triggers with different when clause.
