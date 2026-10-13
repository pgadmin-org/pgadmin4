************
Version 9.19
************

Release date: TBD

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.18.

.. warning:: In server mode, free-text Password Exec Commands are no longer
    run, and ``ENABLE_SERVER_PASS_EXEC_CMD`` is deprecated and ignored.
    Administrators now define the permitted commands by name in
    ``SERVER_PASSEXEC_COMMANDS``, and users choose one of those names in the
    server properties. Configure ``SERVER_PASSEXEC_COMMANDS`` **before** the
    first start after upgrading: on that start, each existing command that
    exactly matches a configured entry is converted to its name, and every
    other command is cleared, which cannot be undone. If the setting is empty,
    the conversion is postponed and a warning is logged at each start. See
    ``config.py`` and the server dialog documentation for details.

.. note:: Users who do not own a shared server never inherit the owner's
    password file; it is treated like the owner's password, SSH key and SSL
    client files. Each user can set their own password file on their copy of
    the server, and a file that everyone should use can be placed in a
    ``SHARED_STORAGE`` directory and referenced as ``Name:/.pgpass``.

.. note:: When an SSH tunnel is configured with an identity file or a
    password, pgAdmin no longer also offers keys from the SSH agent. The agent
    is still used when neither is configured.

.. note:: pgAdmin now requires Flask-Security-Too 5.8.3 or later, which fixes
    an open redirect (GHSA-ccgp-pv8r-95wm). This matters to anyone installing
    pgAdmin from the Python wheel into an existing environment.

Supported Database Servers
**************************
**PostgreSQL**: 14, 15, 16, 17 and 18

**EDB Advanced Server**: 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.6


New features
************

  | `Issue #2018 <https://github.com/pgadmin-org/pgadmin4/issues/2018>`_ -  Add a Statistics node for creating and managing extended statistics.
  | `Issue #2363 <https://github.com/pgadmin-org/pgadmin4/issues/2363>`_ -  Allow data to be edited through simple auto-updatable views in View/Edit Data.
  | `Issue #3205 <https://github.com/pgadmin-org/pgadmin4/issues/3205>`_ -  Allow Query Tool results to be saved as JSON or XML, as well as CSV.
  | `Issue #3834 <https://github.com/pgadmin-org/pgadmin4/issues/3834>`_ -  Add a keyboard shortcut to duplicate the current line or selection in the SQL editor.
  | `Issue #4128 <https://github.com/pgadmin-org/pgadmin4/issues/4128>`_ -  Allow the encoding of Query Tool result files to be chosen.
  | `Issue #4129 <https://github.com/pgadmin-org/pgadmin4/issues/4129>`_ -  Add a 'copy with headers' option for Query Tool results.
  | `Issue #5691 <https://github.com/pgadmin-org/pgadmin4/issues/5691>`_ -  Close dialogs with the Escape key.
  | `Issue #6695 <https://github.com/pgadmin-org/pgadmin4/issues/6695>`_ -  Allow a byte order mark to be added to Query Tool result files.
  | `Issue #7167 <https://github.com/pgadmin-org/pgadmin4/issues/7167>`_ -  Allow dialogs such as Sort/Filter to be saved and closed with the Enter key.
  | `Issue #9057 <https://github.com/pgadmin-org/pgadmin4/issues/9057>`_ -  Support UNLOGGED partitioned tables correctly, which PostgreSQL 18 no longer allows to be created or altered.
  | `Issue #9064 <https://github.com/pgadmin-org/pgadmin4/issues/9064>`_ -  Add the PostgreSQL 18 pg_dump options to the Backup and Backup Server dialogs.
  | `Issue #9066 <https://github.com/pgadmin-org/pgadmin4/issues/9066>`_ -  Add the PostgreSQL 18 pg_restore options to the Restore dialog.
  | `Issue #9704 <https://github.com/pgadmin-org/pgadmin4/issues/9704>`_ -  Allow an OAuth2 claim to restrict which shared servers a user can see, configured through ``OAUTH2_SERVER_GROUP_CLAIM`` and ``OAUTH2_SERVER_GROUP_CLAIM_MAPPING``.
  | `Issue #10148 <https://github.com/pgadmin-org/pgadmin4/issues/10148>`_ -  Add support for managing pg_timetable chains and tasks.
  | `Issue #10249 <https://github.com/pgadmin-org/pgadmin4/issues/10249>`_ -  Replace free-text Password Exec Commands in server mode with an administrator-defined allowlist, ``SERVER_PASSEXEC_COMMANDS``. Commands run without a shell, with a reduced environment, and receive the pgAdmin user's identity in ``PGADMIN_PASSEXEC_*`` variables; users of a shared server inherit the owner's command by default.
  | `Issue #10473 <https://github.com/pgadmin-org/pgadmin4/issues/10473>`_ -  Add a macOS 26 layered app icon with dark, clear and tinted variants.

Housekeeping
************

  | `Issue #9230 <https://github.com/pgadmin-org/pgadmin4/issues/9230>`_ -  Rename the server 'Change Password' option to 'Change Server Password', and the user menu option to 'Change pgAdmin Password', so the two can no longer be confused.
  | `Issue #10363 <https://github.com/pgadmin-org/pgadmin4/issues/10363>`_ -  Enforce ``--immutable`` on every yarn install, in CI and the release builds, to harden the supply chain.
  | `Issue #10546 <https://github.com/pgadmin-org/pgadmin4/issues/10546>`_ -  Fix the flaky ``test_windows_pty_failures`` test counting psql output from other tests.
  | `Issue #10552 <https://github.com/pgadmin-org/pgadmin4/issues/10552>`_ -  Add a test for Reset discarding pending SQL editor values in dialogs.
  | `Issue #10553 <https://github.com/pgadmin-org/pgadmin4/issues/10553>`_ -  Make the server tests restore the shared test fixture after themselves.

Bug fixes
*********

  | `Issue #5940 <https://github.com/pgadmin-org/pgadmin4/issues/5940>`_ -  Fix View/Edit Data failing on SQL_ASCII databases when a name contains a backslash followed by 'u' or 'U'.
  | `Issue #6090 <https://github.com/pgadmin-org/pgadmin4/issues/6090>`_ -  Refresh a stale server connection manager when a server id is reused, so one user's session can no longer pick up settings from another server.
  | `Issue #6231 <https://github.com/pgadmin-org/pgadmin4/issues/6231>`_ -  Generate a single GRANT statement for roles with identical privileges.
  | `Issue #6481 <https://github.com/pgadmin-org/pgadmin4/issues/6481>`_ -  Fix index and constraint columns not being shown when their names require quoting.
  | `Issue #7232 <https://github.com/pgadmin-org/pgadmin4/issues/7232>`_ -  Fix the tab switching shortcuts not working whilst focus is inside the PSQL, Query, ERD or Schema Diff tools.
  | `Issue #8529 <https://github.com/pgadmin-org/pgadmin4/issues/8529>`_ -  Rewrite the container entrypoint using bash features, and pass values to the embedded Python safely, so an email address containing an apostrophe works and a validation error stops the container rather than passing silently.
  | `Issue #8664 <https://github.com/pgadmin-org/pgadmin4/issues/8664>`_ -  Fix debugger messages from successive steps running together on one line.
  | `Issue #8991 <https://github.com/pgadmin-org/pgadmin4/issues/8991>`_ -  Fix BEGIN, COMMIT and ROLLBACK silently failing in the Query Tool under server cursor mode.
  | `Issue #9450 <https://github.com/pgadmin-org/pgadmin4/issues/9450>`_ -  Allow roles holding ADMIN OPTION to manage Group Role membership.
  | `Issue #9672 <https://github.com/pgadmin-org/pgadmin4/issues/9672>`_ -  Fix View/Edit Data not handling generated columns properly.
  | `Issue #9798 <https://github.com/pgadmin-org/pgadmin4/issues/9798>`_ -  Fix the collation and ctype query error for databases with a non-default LC_COLLATE.
  | `Issue #9814 <https://github.com/pgadmin-org/pgadmin4/issues/9814>`_ -  Disable the SSH agent when an SSH tunnel identity file or password is provided.
  | `Issue #9836 <https://github.com/pgadmin-org/pgadmin4/issues/9836>`_ -  Fix the CREATE TABLE script ignoring the UNLOGGED attribute of a partition.
  | `Issue #9984 <https://github.com/pgadmin-org/pgadmin4/issues/9984>`_ -  Report an unreachable external configuration database, or a malformed ``CONFIG_DATABASE_URI``, as a failed check rather than an unhandled exception.
  | `Issue #10031 <https://github.com/pgadmin-org/pgadmin4/issues/10031>`_ -  Fix Query Tool tabs running their query automatically after a session restore.
  | `Issue #10103 <https://github.com/pgadmin-org/pgadmin4/issues/10103>`_ -  Exclude non-editable alias and expression columns when saving edited rows in the Query Tool.
  | `Issue #10136 <https://github.com/pgadmin-org/pgadmin4/issues/10136>`_ -  Restore tags for standard users on shared servers, and never inherit the owner's password file.
  | `Issue #10143 <https://github.com/pgadmin-org/pgadmin4/issues/10143>`_ -  Fix switching back to a dialog tab containing a data grid being slow, by skipping virtualisation for small grids.
  | `Issue #10226 <https://github.com/pgadmin-org/pgadmin4/issues/10226>`_ -  Restore remembering the last visited directory in the desktop file dialogs.
  | `Issue #10251 <https://github.com/pgadmin-org/pgadmin4/issues/10251>`_ -  Fix invalid SQL from the Maintenance dialog for REINDEX ... CONCURRENTLY.
  | `Issue #10254 <https://github.com/pgadmin-org/pgadmin4/issues/10254>`_ -  Fix the Object Explorer shortcut not moving keyboard focus into the tree.
  | `Issue #10273 <https://github.com/pgadmin-org/pgadmin4/issues/10273>`_ -  Fix the dashboard transactions per second graph being wrong for refresh rates other than one second.
  | `Issue #10292 <https://github.com/pgadmin-org/pgadmin4/issues/10292>`_ -  Fix Schema Diff scripts that convert a column to or from SERIAL.
  | `Issue #10301 <https://github.com/pgadmin-org/pgadmin4/issues/10301>`_ -  Drop the scaffolding default partition after Schema Diff rebuilds a partitioned table.
  | `Issue #10334 <https://github.com/pgadmin-org/pgadmin4/issues/10334>`_ -  Add Caddy reverse proxy configuration examples to the documentation.
  | `Issue #10347 <https://github.com/pgadmin-org/pgadmin4/issues/10347>`_ -  Fix the selected UI language not persisting beyond the request that set it in server mode.
  | `Issue #10348 <https://github.com/pgadmin-org/pgadmin4/issues/10348>`_ -  Fix OpenAI streaming tool calls being split into two entries in the AI Assistant.
  | `Issue #10349 <https://github.com/pgadmin-org/pgadmin4/issues/10349>`_ -  Fix the OAuth2 userinfo request crashing when ``OAUTH2_USERINFO_ENDPOINT`` is set to None.
  | `Issue #10350 <https://github.com/pgadmin-org/pgadmin4/issues/10350>`_ -  Fix the MAINTAIN privilege being silently dropped for views and materialised views on PostgreSQL 17 and later.
  | `Issue #10357 <https://github.com/pgadmin-org/pgadmin4/issues/10357>`_ -  Fix the cursor jumping to the start of SQL fields in dialogs when keys are pressed together.
  | `Issue #10364 <https://github.com/pgadmin-org/pgadmin4/issues/10364>`_ -  Explain Docker Compose quoting for ``PGADMIN_CONFIG_*`` values in the container documentation.
  | `Issue #10386 <https://github.com/pgadmin-org/pgadmin4/issues/10386>`_ -  Stop the Query Tool spinner, and its idle CPU use, whilst a password prompt is open.
  | `Issue #10401 <https://github.com/pgadmin-org/pgadmin4/issues/10401>`_ -  Show default privileges in the Database properties panel.
  | `Issue #10409 <https://github.com/pgadmin-org/pgadmin4/issues/10409>`_ -  Include the authenticated user in the access log on logout.
  | `Issue #10414 <https://github.com/pgadmin-org/pgadmin4/issues/10414>`_ -  Fix the Linux packages shipping a stray copy of Python as ``venv/bin/𝜋thon``, which stopped the DEB package installing on Ubuntu 26.04.
  | `Issue #10415 <https://github.com/pgadmin-org/pgadmin4/issues/10415>`_ -  Prefer the user's email address as the Gravatar identifier.
  | `Issue #10418 <https://github.com/pgadmin-org/pgadmin4/issues/10418>`_ -  Remove the dead ``usr`` parameter from Query Tool connection URLs.
  | `Issue #10419 <https://github.com/pgadmin-org/pgadmin4/issues/10419>`_ -  Fix Kerberos login failures returning a JSON 500 response, and first-time automatically created Kerberos logins being rejected.
  | `Issue #10422 <https://github.com/pgadmin-org/pgadmin4/issues/10422>`_ -  Fix Schema Diff repeating unchanged column comments and identity options.
  | `Issue #10424 <https://github.com/pgadmin-org/pgadmin4/issues/10424>`_ -  Fix Reset Layout dropping Query Tool tabs from the saved application state.
  | `Issue #10428 <https://github.com/pgadmin-org/pgadmin4/issues/10428>`_ -  Fix connections crashing on Windows with an access violation, and the utilities failing to find ``gssapi64.dll``, by staging the Kerberos runtime next to libpq.
  | `Issue #10446 <https://github.com/pgadmin-org/pgadmin4/issues/10446>`_ -  Fix Schema Diff reporting identical tables as different when a foreign key's referenced table has a dropped column.
  | `Issue #10449 <https://github.com/pgadmin-org/pgadmin4/issues/10449>`_ -  Honour the password file in the Change Server Password dialog, rather than requiring the current password.
  | `Issue #10462 <https://github.com/pgadmin-org/pgadmin4/issues/10462>`_ -  Fix duplicated content when opening large non-UTF-8 files in the Query Tool.
  | `Issue #10463 <https://github.com/pgadmin-org/pgadmin4/issues/10463>`_ -  Pass the target database, and every supported connection parameter, to the utilities, so a database set in a service file no longer overrides the one selected.
  | `Issue #10470 <https://github.com/pgadmin-org/pgadmin4/issues/10470>`_ -  Remove inherited columns from the Columns tab when their parent table is removed after reopening a table.
  | `Issue #10482 <https://github.com/pgadmin-org/pgadmin4/issues/10482>`_ -  Allow saving files through symbolic links in desktop mode, and stop forcing 0600 permissions on them there.
  | `Issue #10485 <https://github.com/pgadmin-org/pgadmin4/issues/10485>`_ -  Fix 'Cannot have two HTML5 backends at the same time' errors in dialogs containing a data grid.
  | `Issue #10511 <https://github.com/pgadmin-org/pgadmin4/issues/10511>`_ -  Fix the Dashboard Logs tab failing on multi-byte characters split across read chunks.
  | `Issue #10527 <https://github.com/pgadmin-org/pgadmin4/issues/10527>`_ -  Write the cloud deployment wizard's AWS, Azure and Google credentials through to the session store.
  | `Issue #10531 <https://github.com/pgadmin-org/pgadmin4/issues/10531>`_ -  Fix the Query Tool saving files that were loaded as latin-1 back as UTF-8.
  | `Issue #10534 <https://github.com/pgadmin-org/pgadmin4/issues/10534>`_ -  Fix the hardcoded table OID in the column properties query, which broke inherited column details.
  | `Issue #10547 <https://github.com/pgadmin-org/pgadmin4/issues/10547>`_ -  Fix valid escapes below U+0100 being rewritten in SQL_ASCII data and names.
  | `Issue #10548 <https://github.com/pgadmin-org/pgadmin4/issues/10548>`_ -  Fix negative identity column options being dropped from the generated SQL.
  | `Issue #10549 <https://github.com/pgadmin-org/pgadmin4/issues/10549>`_ -  Fix Schema Diff not removing a column comment that exists only in the target.
  | `Issue #10550 <https://github.com/pgadmin-org/pgadmin4/issues/10550>`_ -  Fix changing an identity column's START value also restarting its sequence.
  | `Issue #10551 <https://github.com/pgadmin-org/pgadmin4/issues/10551>`_ -  Fix the cursor jumping to the start of SQL fields in dialogs after a quick edit and undo.
  | `Issue #10554 <https://github.com/pgadmin-org/pgadmin4/issues/10554>`_ -  Fix column properties reporting an arbitrary parent for columns merged from several parents.
