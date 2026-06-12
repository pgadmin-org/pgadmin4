************
Version 9.16
************

Release date: 2026-06-18

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.15.

.. warning:: Starting with this release, when a server connection is configured
    with both an external password-exec command and a passfile, pgAdmin now
    uses the passfile and ignores the password-exec command. Previously the
    password-exec command took precedence. A warning is written to the log when
    the password-exec command is ignored in favour of the passfile.

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
  | `Issue #10022 <https://github.com/pgadmin-org/pgadmin4/issues/10022>`_ -  Fix AI Assistant read-only transaction bypass that allowed prompt-injected multi-statement payloads to commit out of the READ ONLY wrapper and execute arbitrary SQL, chaining to RCE via COPY ... TO PROGRAM on a superuser connection (CVE-2026-12045). Reported by Isaac Chen.
  | `Issue #10026 <https://github.com/pgadmin-org/pgadmin4/issues/10026>`_ -  Fix SQL injection in the named restore point endpoint where the user-supplied restore point name was interpolated into SQL via str.format() instead of being passed as a bound parameter (CVE-2026-12050). Reported by Geo.
  | `Issue #10028 <https://github.com/pgadmin-org/pgadmin4/issues/10028>`_ -  Fix open redirect in the multi-factor authentication flow via an unvalidated 'next' parameter that allowed a crafted link to redirect an authenticated victim to an attacker-controlled host (CVE-2026-12049). Reported by Mai Phạm Hiền.
  | `Issue #10068 <https://github.com/pgadmin-org/pgadmin4/issues/10068>`_ -  Fix stored cross-site scripting via PostgreSQL server error text and Explain plan-node content passed through html-react-parser without sanitisation across notifier toasts, form errors, modal alerts, and the Explain visualiser (CVE-2026-12048). Reported by Fernando Bortotti.
  | `Issue #10069 <https://github.com/pgadmin-org/pgadmin4/issues/10069>`_ -  Fix HTML injection in the cloud deployment module (RDS, Azure, Google) where SDK exception text was forwarded to the browser unsanitised and rendered through html-react-parser in the Cloud Wizard (CVE-2026-12047). Reported by Fernando Bortotti.
  | `Issue #10072 <https://github.com/pgadmin-org/pgadmin4/issues/10072>`_ -  Fix two SQL Editor endpoints (close and update_connection) missing the ``@pga_login_required`` decorator, making them reachable without authentication in server mode and exposing a pickle deserialization sink (CVE-2026-12046). Reported by Fernando Bortotti.
  | `Issue #10078 <https://github.com/pgadmin-org/pgadmin4/issues/10078>`_ -  Fix SQL injection across dialog templates that rendered ``COMMENT ON ... IS '<description>'`` by switching to the ``qtLiteral`` escape filter; harden ``qtLiteral`` to raise instead of silently returning raw values when ``conn`` is falsy (CVE-2026-12044). Reported by Jasser Chebbi.
