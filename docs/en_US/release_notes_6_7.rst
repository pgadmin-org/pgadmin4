************
Version 6.7
************

Release date: 2022-03-14

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.6.

.. note::  **Security Release**

    Please note that this release includes a security update to fix an issue
    where a user could upload files to directories outside of their storage directory, when using pgAdmin
    running in server mode.

    Users running pgAdmin in server mode, including the standard container based distribution, should upgrade
    to this release as soon as possible.

    This issue does not affect users running in desktop mode.

Bug fixes
*********

  | `Issue #7220 <https://redmine.postgresql.org/issues/7220>`_ -  Fixed a schema diff issue where difference SQL isn't generated when foreign key values for a table differ.
  | `Issue #7228 <https://redmine.postgresql.org/issues/7228>`_ -  Fixed a schema diff issue where string separator '_$PGADMIN$_' is visible for identical user mappings.
  | `Issue #7230 <https://redmine.postgresql.org/issues/7230>`_ -  Fixed an issue where pgAdmin 4 took ~75 seconds to display the 'Starting pgAdmin' text on the splash screen.
  | `Issue #7233 <https://redmine.postgresql.org/issues/7233>`_ -  Ensure that upload paths are children of the storage directory (CVE-2022-0959).
