************
Version 9.16
************

Release date: TBD

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.15.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

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

Bug fixes
*********

  | `Issue #9677 <https://github.com/pgadmin-org/pgadmin4/issues/9677>`_ -  Fix the Unlogged table toggle in table properties not generating any ALTER TABLE ... SET LOGGED/UNLOGGED statement.
  | `Issue #9828 <https://github.com/pgadmin-org/pgadmin4/issues/9828>`_ -  Fix tool calls failing against OpenAI-compatible providers that emit empty/null name, arguments, or id fields in streaming continuation deltas.
  | `Issue #9892 <https://github.com/pgadmin-org/pgadmin4/issues/9892>`_ -  Fix blank difference counts on the top-level group rows in Schema Diff.
  | `Issue #9896 <https://github.com/pgadmin-org/pgadmin4/issues/9896>`_ -  Fix invalid DDL reconstruction for SERIAL columns in Schema Diff and the generated SQL/CREATE Script so the output round-trips on a clean target.
  | `Issue #9935 <https://github.com/pgadmin-org/pgadmin4/issues/9935>`_ -  Fix "Illegal instruction" crash on startup of the Linux DEB and RPM packages on older x86_64 CPUs by pinning the psycopg C extension build to the x86-64 baseline.
  | `Issue #9936 <https://github.com/pgadmin-org/pgadmin4/issues/9936>`_ -  Fix the AI panel silently falling back to the default provider when a custom LLM API URL or key file was set, and allow self-hosted LLM endpoints on any loopback port.
  | `Issue #9939 <https://github.com/pgadmin-org/pgadmin4/issues/9939>`_ -  Fix saving a newly-added row in the Query Tool failing when the result set includes expression or alias columns that are not real columns of the underlying table.
  | `Issue #9976 <https://github.com/pgadmin-org/pgadmin4/issues/9976>`_ -  Fix a startup migration crash (NoSuchTableError) when an old configuration database contains a stale foreign-key reference.
  | `Issue #9984 <https://github.com/pgadmin-org/pgadmin4/issues/9984>`_ -  Fix the Docker entrypoint mishandling a quoted PGADMIN_CONFIG_CONFIG_DATABASE_URI, which caused a SQLAlchemy parse error and silently skipped PGADMIN_DEFAULT_EMAIL/PASSWORD setup.
  | `Issue #9987 <https://github.com/pgadmin-org/pgadmin4/issues/9987>`_ -  Fix "AttributeError: 'PgAdmin' object has no attribute 'login_manager'" crash when running setup.py user-management commands (add-user, update-user) from the CLI.
