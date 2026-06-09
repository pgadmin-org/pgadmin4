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
  | `Issue #10050 <https://github.com/pgadmin-org/pgadmin4/issues/10050>`_ -  Rebase the version-specific SQL templates so the default targets PostgreSQL 14, the oldest supported server version, dropping the obsolete sub-14 template buckets.

Bug fixes
*********

  | `Issue #6308 <https://github.com/pgadmin-org/pgadmin4/issues/6308>`_ -  Fix the infinite loading spinner after an idle database connection is silently dropped, by detecting stale connections and offering a reconnect dialog.
  | `Issue #9595 <https://github.com/pgadmin-org/pgadmin4/issues/9595>`_ -  Fix missing ALTER ... SET DEFAULT statements for inherited columns in the generated table SQL/EDIT script.
  | `Issue #9677 <https://github.com/pgadmin-org/pgadmin4/issues/9677>`_ -  Fix the Unlogged table toggle in table properties not generating any ALTER TABLE ... SET LOGGED/UNLOGGED statement.
  | `Issue #9828 <https://github.com/pgadmin-org/pgadmin4/issues/9828>`_ -  Fix tool calls failing against OpenAI-compatible providers that emit empty/null name, arguments, or id fields in streaming continuation deltas.
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
