************
Version 8.11
************

Release date: 2024-08-22

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.10.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, 16 and 17

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.3


New features
************

  | `Issue #2046 <https://github.com/pgadmin-org/pgadmin4/issues/2046>`_ -  Add a home button to the geometry viewer to set original zoom level when the viewer was opened.

Housekeeping
************

  | `Issue #7705 <https://github.com/pgadmin-org/pgadmin4/issues/7705>`_ -  Upgrade react-data-grid fork to latest and change pgAdmin accordingly.
  | `Issue #7776 <https://github.com/pgadmin-org/pgadmin4/issues/7776>`_ -  Introduce custom React Hook useSchemaState to simplify SchemaView component.

Bug fixes
*********

  | `Issue #7499 <https://github.com/pgadmin-org/pgadmin4/issues/7499>`_ -  Fixed an issue where refreshing the Schema Diff tool opened in a new tab caused an error.
  | `Issue #7540 <https://github.com/pgadmin-org/pgadmin4/issues/7540>`_ -  Fix server heartbeat logging error after deleting the server.
  | `Issue #7682 <https://github.com/pgadmin-org/pgadmin4/issues/7682>`_ -  Fixed an issue where the Generate Script ignored filter conditions when a parent node was selected.
  | `Issue #7683 <https://github.com/pgadmin-org/pgadmin4/issues/7683>`_ -  Fixed an issue where delete object(shortcut key) affecting both text and Object Explorer items.
  | `Issue #7688 <https://github.com/pgadmin-org/pgadmin4/issues/7688>`_ -  Fix an issue where ERD tool should to be able to open saved pgerd file when using keyboard shortcuts.
  | `Issue #7728 <https://github.com/pgadmin-org/pgadmin4/issues/7728>`_ -  Updated the documentation for web server authentication.
  | `Issue #7737 <https://github.com/pgadmin-org/pgadmin4/issues/7737>`_ -  Fixed an issue where the REVOKE statement in the create script was throwing an error if the role contained special characters.
  | `Issue #7748 <https://github.com/pgadmin-org/pgadmin4/issues/7748>`_ -  Improve code highlighting in query editor.
  | `Issue #7754 <https://github.com/pgadmin-org/pgadmin4/issues/7754>`_ -  Fix an issue where the wheel package is not getting installed on the arm64-based macOS version < 14.
  | `Issue #7772 <https://github.com/pgadmin-org/pgadmin4/issues/7772>`_ -  Fixed an issue where column resizing is not working in search objects dialog.
  | `Issue #7775 <https://github.com/pgadmin-org/pgadmin4/issues/7775>`_ -  Fixed an issue where the value in the find box is not updating with selected text in editor if find is already open and re-triggered.
  | `Issue #7793 <https://github.com/pgadmin-org/pgadmin4/issues/7793>`_ -  Fixed paths for Flatpak broken after Electron changes.
