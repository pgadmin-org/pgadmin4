************
Version 9.16
************

Release date: TBD

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.15.

.. warning:: Starting with this release, when a server connection is configured
    with both an external password-exec command and a passfile, pgAdmin now
    uses the passfile and ignores the password-exec command. Previously the
    password-exec command took precedence. A warning is written to the log when
    the password-exec command is ignored in favour of the passfile.

Supported Database Servers
**************************
**PostgreSQL**: 14, 15, 16, 17 and 18

**EDB Advanced Server**: 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.4


New features
************

  | `Issue #9626 <https://github.com/pgadmin-org/pgadmin4/issues/9626>`_ -  Add support for the TOAST tuple target storage parameter in the Materialized View dialog.
  | `Issue #9646 <https://github.com/pgadmin-org/pgadmin4/issues/9646>`_ -  Make the init container security context in the Helm chart configurable via containerSecurityContext, consistent with the main container.
  | `Issue #9699 <https://github.com/pgadmin-org/pgadmin4/issues/9699>`_ -  Add support for closing a tab with a middle-click on its title.

Housekeeping
************

  | `Issue #9981 <https://github.com/pgadmin-org/pgadmin4/issues/9981>`_ -  Clarify the SSH tunnel "Prompt for identity file password?" switch label and help text to indicate it applies only to identity-file authentication.
  | `Issue #10018 <https://github.com/pgadmin-org/pgadmin4/issues/10018>`_ -  Remove the EDB BigAnimal cloud deployment support.
  | `Issue #10049 <https://github.com/pgadmin-org/pgadmin4/issues/10049>`_ -  Bump vulnerable transitive dependencies (tar, flatted) to clear security advisories.
  | `Issue #10050 <https://github.com/pgadmin-org/pgadmin4/issues/10050>`_ -  Rebase the version-specific SQL templates so the default targets PostgreSQL 14, the oldest supported server version, dropping the obsolete sub-14 template buckets.
  | `Issue #10063 <https://github.com/pgadmin-org/pgadmin4/issues/10063>`_ -  Strip the foreign-architecture slice from the macOS bundle so single-arch builds no longer ship the universal2 Python framework's unused arm64/x86_64 code.

Bug fixes
*********

  | `Issue #6308 <https://github.com/pgadmin-org/pgadmin4/issues/6308>`_ -  Fix the infinite loading spinner after an idle database connection is silently dropped, by detecting stale connections and offering a reconnect dialog.
  | `Issue #7596 <https://github.com/pgadmin-org/pgadmin4/issues/7596>`_ -  Fix the Query Tool turning into a blank white screen when the runtime has a malformed default locale, by guarding the Query History date/time formatting against the resulting RangeError.
  | `Issue #8318 <https://github.com/pgadmin-org/pgadmin4/issues/8318>`_ -  Fixed an error ("i.default.find(...) is undefined") that prevented deleting a table or relationship link in the ERD tool when a foreign key referenced a column that had been renamed.
  | `Issue #9060 <https://github.com/pgadmin-org/pgadmin4/issues/9060>`_ -  Fixed an issue in the Create Table dialog where renaming a column did not update the column references in foreign key and unique constraint definitions for the new table.
  | `Issue #9091 <https://github.com/pgadmin-org/pgadmin4/issues/9091>`_ -  Fix the Query Tool re-prompting for an unsaved password in a loop and rejecting the re-entered password, by caching the entered password on the server manager when the primary connection is already established.
  | `Issue #9128 <https://github.com/pgadmin-org/pgadmin4/issues/9128>`_ -  Fixed an issue where the object breadcrumbs popup blocked clicks on the object explorer items beneath it.
  | `Issue #9595 <https://github.com/pgadmin-org/pgadmin4/issues/9595>`_ -  Fix missing ALTER ... SET DEFAULT statements for inherited columns in the generated table SQL/EDIT script.
  | `Issue #9677 <https://github.com/pgadmin-org/pgadmin4/issues/9677>`_ -  Fix the Unlogged table toggle in table properties not generating any ALTER TABLE ... SET LOGGED/UNLOGGED statement.
  | `Issue #9762 <https://github.com/pgadmin-org/pgadmin4/issues/9762>`_ -  Fix the "Cannot read properties of undefined (reading 'map')" crash in the desktop runtime when a menu refresh is triggered before the application menus have been received.
  | `Issue #9766 <https://github.com/pgadmin-org/pgadmin4/issues/9766>`_ -  Fixed an issue where a server's custom foreground colour was not applied to the object counts (children count) and column type labels shown in the object explorer.
  | `Issue #9828 <https://github.com/pgadmin-org/pgadmin4/issues/9828>`_ -  Fix tool calls failing against OpenAI-compatible providers that emit empty/null name, arguments, or id fields in streaming continuation deltas.
  | `Issue #9829 <https://github.com/pgadmin-org/pgadmin4/issues/9829>`_ -  Fixed installation on Python 3.9 (e.g. RHEL/Rocky/AlmaLinux 8 and 9) failing with "No module named 'pkg_resources'" by pinning setuptools below the version that dropped pkg_resources for Python 3.9.
  | `Issue #9854 <https://github.com/pgadmin-org/pgadmin4/issues/9854>`_ -  Fix the JSON editor stripping trailing fractional zeros (e.g. 10.00) and rewriting large integers in jsonb values, which corrupted unmodified numbers when saving.
  | `Issue #9864 <https://github.com/pgadmin-org/pgadmin4/issues/9864>`_ -  Fixed a regression where the rectangular (block/column) text selection in the code editor stopped working; restored the default Alt+drag selection without re-introducing the crosshair cursor on Alt+F5 (#9570).
  | `Issue #9868 <https://github.com/pgadmin-org/pgadmin4/issues/9868>`_ -  Warn before opening a very large JSON/JSONB value in the data grid cell editor, which could freeze pgAdmin, and let the user choose whether to proceed.
  | `Issue #9875 <https://github.com/pgadmin-org/pgadmin4/issues/9875>`_ -  Fixed an issue where EXPLAIN and EXPLAIN ANALYZE failed to execute when blank lines separated clauses in the SQL query.
  | `Issue #9810 <https://github.com/pgadmin-org/pgadmin4/issues/9810>`_ -  Use the ServerManager's passfile for the credential gate in connect() so the check matches the passfile actually used for the connection, and warn on conflicting passfile/passexec settings.
  | `Issue #9892 <https://github.com/pgadmin-org/pgadmin4/issues/9892>`_ -  Fix blank difference counts on the top-level group rows in Schema Diff.
  | `Issue #9896 <https://github.com/pgadmin-org/pgadmin4/issues/9896>`_ -  Fix invalid DDL reconstruction for SERIAL columns in Schema Diff and the generated SQL/CREATE Script so the output round-trips on a clean target.
  | `Issue #9935 <https://github.com/pgadmin-org/pgadmin4/issues/9935>`_ -  Fix "Illegal instruction" crash on startup of the Linux DEB and RPM packages on older x86_64 CPUs by pinning the psycopg C extension build to the x86-64 baseline.
  | `Issue #9936 <https://github.com/pgadmin-org/pgadmin4/issues/9936>`_ -  Fix the AI panel silently falling back to the default provider when a custom LLM API URL or key file was set, and allow self-hosted LLM endpoints on any loopback port.
  | `Issue #9939 <https://github.com/pgadmin-org/pgadmin4/issues/9939>`_ -  Fix saving a newly-added row in the Query Tool failing when the result set includes expression or alias columns that are not real columns of the underlying table.
  | `Issue #9976 <https://github.com/pgadmin-org/pgadmin4/issues/9976>`_ -  Fix a startup migration crash (NoSuchTableError) when an old configuration database contains a stale foreign-key reference.
  | `Issue #9984 <https://github.com/pgadmin-org/pgadmin4/issues/9984>`_ -  Fix the Docker entrypoint mishandling a quoted PGADMIN_CONFIG_CONFIG_DATABASE_URI, which caused a SQLAlchemy parse error and silently skipped PGADMIN_DEFAULT_EMAIL/PASSWORD setup.
  | `Issue #9987 <https://github.com/pgadmin-org/pgadmin4/issues/9987>`_ -  Fix "AttributeError: 'PgAdmin' object has no attribute 'login_manager'" crash when running setup.py user-management commands (add-user, update-user) from the CLI.
  | `Issue #9988 <https://github.com/pgadmin-org/pgadmin4/issues/9988>`_ -  Provide an actionable error when 'openid' is in OAUTH2_SCOPE but OAUTH2_SERVER_METADATA_URL is not set, instead of a cryptic Authlib failure.
  | `Issue #10027 <https://github.com/pgadmin-org/pgadmin4/issues/10027>`_ -  Fix the spurious "Crypt key is missing" error and logged traceback in the Query Tool new-connection endpoints after a backend restart, by surfacing it as the standard CRYPTKEY_MISSING response so the client recovers transparently.
  | `Issue #10029 <https://github.com/pgadmin-org/pgadmin4/issues/10029>`_ -  Fixed a regression where the rectangular (block/column) text selection in the code editor stopped working; restored the default Alt+drag selection without re-introducing the crosshair cursor on Alt+F5 (#9570).
  | `Issue #10059 <https://github.com/pgadmin-org/pgadmin4/issues/10059>`_ -  Fix the generated SQL for editing a SQL-language function/procedure whose body contains the word "return" (e.g. a RETURNING clause), which was wrongly treated as a SQL-standard body and produced a statement without the AS $BODY$ wrapper.
