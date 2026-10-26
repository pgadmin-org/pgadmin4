************
Version 9.19
************

Release date: 2026-10-29

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

.. note:: In desktop mode, when an SSH tunnel is configured with an identity
    file or a password, pgAdmin no longer also offers keys from the SSH agent;
    the agent is still used when neither is configured. In server mode, SSH
    tunnels never use the SSH agent, or the keys and configuration in the
    ``~/.ssh`` directory of the account pgAdmin runs as, so a tunnel that
    relied on them must be given an identity file or password on the server.

.. note:: On Python 3.10 and later, pgAdmin now requires Flask-Security-Too
    5.8.3 or later, which fixes an open redirect (GHSA-ccgp-pv8r-95wm). This
    matters to anyone installing pgAdmin from the Python wheel into an
    existing environment. Python 3.9 installations remain on the
    Flask-Security-Too 5.6 series.

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
  | `Issue #8647 <https://github.com/pgadmin-org/pgadmin4/issues/8647>`_ -  Allow shift + click to extend the cell range selection in the Query Tool results grid.
  | `Issue #9057 <https://github.com/pgadmin-org/pgadmin4/issues/9057>`_ -  Support UNLOGGED partitioned tables correctly, which PostgreSQL 18 no longer allows to be created or altered.
  | `Issue #9064 <https://github.com/pgadmin-org/pgadmin4/issues/9064>`_ -  Add the PostgreSQL 18 pg_dump options to the Backup and Backup Server dialogs.
  | `Issue #9066 <https://github.com/pgadmin-org/pgadmin4/issues/9066>`_ -  Add the PostgreSQL 18 pg_restore options to the Restore dialog.
  | `Issue #9212 <https://github.com/pgadmin-org/pgadmin4/issues/9212>`_ -  Show fill factor, TOAST tuple target and parallel workers in the table Properties panel.
  | `Issue #9264 <https://github.com/pgadmin-org/pgadmin4/issues/9264>`_ -  Move the 'Returns a set?' option to the Definition tab in the Function dialog.
  | `Issue #9704 <https://github.com/pgadmin-org/pgadmin4/issues/9704>`_ -  Allow an OAuth2 claim to restrict which shared servers a user can see, configured through ``OAUTH2_SERVER_GROUP_CLAIM`` and ``OAUTH2_SERVER_GROUP_CLAIM_MAPPING``.
  | `Issue #9975 <https://github.com/pgadmin-org/pgadmin4/issues/9975>`_ -  Allow the login page to be skipped when OAuth2 is the only authentication source, using ``OAUTH2_AUTO_LOGIN`` and ``OAUTH2_LOGOUT_URL``.
  | `Issue #10148 <https://github.com/pgadmin-org/pgadmin4/issues/10148>`_ -  Add support for managing pg_timetable chains and tasks.
  | `Issue #10249 <https://github.com/pgadmin-org/pgadmin4/issues/10249>`_ -  Replace free-text Password Exec Commands in server mode with an administrator-defined allowlist, ``SERVER_PASSEXEC_COMMANDS``. Commands run without a shell, with a reduced environment, and receive the pgAdmin user's identity in ``PGADMIN_PASSEXEC_*`` variables; users of a shared server inherit the owner's command by default.
  | `Issue #10473 <https://github.com/pgadmin-org/pgadmin4/issues/10473>`_ -  Add a macOS 26 layered app icon with dark, clear and tinted variants.
  | `Issue #10499 <https://github.com/pgadmin-org/pgadmin4/issues/10499>`_ -  Add pgEdge Starfleet to the Deploy Cloud Instance wizard, for creating Starfleet Managed databases.
  | `Issue #10503 <https://github.com/pgadmin-org/pgadmin4/issues/10503>`_ -  Add numpad zoom shortcuts to the Desktop View menu.

Housekeeping
************

  | `Issue #5369 <https://github.com/pgadmin-org/pgadmin4/issues/5369>`_ -  Clarify the configuration files documentation.
  | `Issue #9230 <https://github.com/pgadmin-org/pgadmin4/issues/9230>`_ -  Rename the server 'Change Password' option to 'Change Server Password', and the user menu option to 'Change pgAdmin Password', so the two can no longer be confused.
  | `Issue #9331 <https://github.com/pgadmin-org/pgadmin4/issues/9331>`_ -  Remove unused Google API documents, Babel locale data and packaging tools from the packages.
  | `Issue #9524 <https://github.com/pgadmin-org/pgadmin4/issues/9524>`_ -  Document running the container with rootless Podman, and the ``PUID`` and ``PGID`` environment variables.
  | `Issue #10363 <https://github.com/pgadmin-org/pgadmin4/issues/10363>`_ -  Enforce ``--immutable`` on every yarn install, in CI and the release builds, to harden the supply chain.
  | `Issue #10546 <https://github.com/pgadmin-org/pgadmin4/issues/10546>`_ -  Fix the flaky ``test_windows_pty_failures`` test counting psql output from other tests.
  | `Issue #10552 <https://github.com/pgadmin-org/pgadmin4/issues/10552>`_ -  Add a test for Reset discarding pending SQL editor values in dialogs.
  | `Issue #10553 <https://github.com/pgadmin-org/pgadmin4/issues/10553>`_ -  Make the server tests restore the shared test fixture after themselves.
  | `Issue #10601 <https://github.com/pgadmin-org/pgadmin4/issues/10601>`_ -  Remove the dead tree ``loadfail`` handler from ``browser.js``.
  | `Issue #10602 <https://github.com/pgadmin-org/pgadmin4/issues/10602>`_ -  Fix the Jest ``addNewDatagridRow`` helper so schema UI specs actually add a row.

Bug fixes
*********

  | `Issue #5940 <https://github.com/pgadmin-org/pgadmin4/issues/5940>`_ -  Fix View/Edit Data failing on SQL_ASCII databases when a name contains a backslash followed by 'u' or 'U'.
  | `Issue #6090 <https://github.com/pgadmin-org/pgadmin4/issues/6090>`_ -  Refresh a stale server connection manager when a server id is reused, so one user's session can no longer pick up settings from another server.
  | `Issue #6231 <https://github.com/pgadmin-org/pgadmin4/issues/6231>`_ -  Generate a single GRANT statement for roles with identical privileges.
  | `Issue #6481 <https://github.com/pgadmin-org/pgadmin4/issues/6481>`_ -  Fix index and constraint columns not being shown when their names require quoting.
  | `Issue #6652 <https://github.com/pgadmin-org/pgadmin4/issues/6652>`_ -  Fix Schema Diff treating functions that differ only in OUT arguments or return type as unrelated objects.
  | `Issue #6671 <https://github.com/pgadmin-org/pgadmin4/issues/6671>`_ -  Allow the emailed MFA code to be re-entered after an invalid code is entered.
  | `Issue #7232 <https://github.com/pgadmin-org/pgadmin4/issues/7232>`_ -  Fix the tab switching shortcuts not working whilst focus is inside the PSQL, Query, ERD or Schema Diff tools.
  | `Issue #7612 <https://github.com/pgadmin-org/pgadmin4/issues/7612>`_ -  Fix the server context menu showing database options after the tree state is restored.
  | `Issue #7619 <https://github.com/pgadmin-org/pgadmin4/issues/7619>`_ -  Fix Query Tool autocomplete running as the wrong user, or failing, after changing the connection to a different user.
  | `Issue #8015 <https://github.com/pgadmin-org/pgadmin4/issues/8015>`_ -  Re-sort renamed server groups and other nodes in the Object Explorer instead of waiting for a reload.
  | `Issue #8144 <https://github.com/pgadmin-org/pgadmin4/issues/8144>`_ -  Connect the server when changing the Query Tool connection after it was disconnected.
  | `Issue #8529 <https://github.com/pgadmin-org/pgadmin4/issues/8529>`_ -  Rewrite the container entrypoint using bash features, and pass values to the embedded Python safely, so an email address containing an apostrophe works and a validation error stops the container rather than passing silently.
  | `Issue #8664 <https://github.com/pgadmin-org/pgadmin4/issues/8664>`_ -  Fix debugger messages from successive steps running together on one line.
  | `Issue #8991 <https://github.com/pgadmin-org/pgadmin4/issues/8991>`_ -  Fix BEGIN, COMMIT and ROLLBACK silently failing in the Query Tool under server cursor mode.
  | `Issue #9130 <https://github.com/pgadmin-org/pgadmin4/issues/9130>`_ -  Select the adjacent tab when the active tab is closed, rather than the left-most.
  | `Issue #9450 <https://github.com/pgadmin-org/pgadmin4/issues/9450>`_ -  Allow roles holding ADMIN OPTION to manage Group Role membership.
  | `Issue #9603 <https://github.com/pgadmin-org/pgadmin4/issues/9603>`_ -  Restore the per-tab toolbar options when Query Tool tabs are restored on relaunch.
  | `Issue #9624 <https://github.com/pgadmin-org/pgadmin4/issues/9624>`_ -  Fix a database's label staying at '[Disconnecting...]' when disconnecting it fails.
  | `Issue #9630 <https://github.com/pgadmin-org/pgadmin4/issues/9630>`_ -  Fix the parameter value dropdown keeping stale options when the parameter name is changed.
  | `Issue #9672 <https://github.com/pgadmin-org/pgadmin4/issues/9672>`_ -  Fix View/Edit Data not handling generated columns properly.
  | `Issue #9784 <https://github.com/pgadmin-org/pgadmin4/issues/9784>`_ -  Fix modal dialogs losing keyboard focus to a tool iframe loading in the background.
  | `Issue #9798 <https://github.com/pgadmin-org/pgadmin4/issues/9798>`_ -  Fix the collation and ctype query error for databases with a non-default LC_COLLATE.
  | `Issue #9814 <https://github.com/pgadmin-org/pgadmin4/issues/9814>`_ -  Disable the SSH agent when an SSH tunnel identity file or password is provided.
  | `Issue #9818 <https://github.com/pgadmin-org/pgadmin4/issues/9818>`_ -  Keep the AI Assistant's intermediate responses instead of replacing them with placeholder messages.
  | `Issue #9836 <https://github.com/pgadmin-org/pgadmin4/issues/9836>`_ -  Fix the CREATE TABLE script ignoring the UNLOGGED attribute of a partition.
  | `Issue #9838 <https://github.com/pgadmin-org/pgadmin4/issues/9838>`_ -  Fix formatting a view's SQL being treated as a column change that drops and re-creates the view.
  | `Issue #9865 <https://github.com/pgadmin-org/pgadmin4/issues/9865>`_ -  Fix modal dialogs being hidden from assistive technology by ``aria-hidden`` on the application root.
  | `Issue #9890 <https://github.com/pgadmin-org/pgadmin4/issues/9890>`_ -  Fix ERD tables becoming immovable after a Shift-drag selection.
  | `Issue #9921 <https://github.com/pgadmin-org/pgadmin4/issues/9921>`_ -  Fix Azure and Google authentication in the cloud deployment wizard.
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
  | `Issue #10310 <https://github.com/pgadmin-org/pgadmin4/issues/10310>`_ -  Fix the Statistics node failing to list its children in Object Explorer.
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
  | `Issue #10573 <https://github.com/pgadmin-org/pgadmin4/issues/10573>`_ -  Fix Query Tool state save/restore failing on installations with a legacy ``SECRET_KEY``.
  | `Issue #10584 <https://github.com/pgadmin-org/pgadmin4/issues/10584>`_ -  Preserve explicit 24-hour mode in date-time picker popups.
  | `Issue #10597 <https://github.com/pgadmin-org/pgadmin4/issues/10597>`_ -  Fix Schema Diff treating a function whose input argument was renamed as two unrelated functions.
  | `Issue #10598 <https://github.com/pgadmin-org/pgadmin4/issues/10598>`_ -  Keep the Query Tool execute options when its transaction is re-created.
  | `Issue #10600 <https://github.com/pgadmin-org/pgadmin4/issues/10600>`_ -  Revert the Query Tool execute option checkboxes when changing an option fails.
  | `Issue #10603 <https://github.com/pgadmin-org/pgadmin4/issues/10603>`_ -  Fix the Query Tool not re-running the query after reconnecting at a password prompt.
  | `Issue #10604 <https://github.com/pgadmin-org/pgadmin4/issues/10604>`_ -  Report a failed autocomplete reconnect in the Query Tool instead of ignoring it.
  | `Issue #10607 <https://github.com/pgadmin-org/pgadmin4/issues/10607>`_ -  Fix Query Tool autocomplete objects being shared between sessions that use the same transaction id.
  | `Issue #10612 <https://github.com/pgadmin-org/pgadmin4/issues/10612>`_ -  Free Query Tool autocomplete objects when an idle session's connections are released.
  | `Issue #10613 <https://github.com/pgadmin-org/pgadmin4/issues/10613>`_ -  Reconnect a lost Query Tool connection as the user and role it was changed to.
  | `Issue #10614 <https://github.com/pgadmin-org/pgadmin4/issues/10614>`_ -  Keep external pages out of the desktop runtime's privileged windows and confine non-prompted downloads to the downloads directory.
  | `Issue #10618 <https://github.com/pgadmin-org/pgadmin4/issues/10618>`_ -  Keep Query Tool execution disabled until a restored tab's execute options reach the server.
  | `Issue #10645 <https://github.com/pgadmin-org/pgadmin4/issues/10645>`_ -  Fix connection redirection in the materialized view refresh, where the target database's name was passed straight to psql's ``--dbname``: because libpq expands a value containing an equals sign into a full connection string, a database named like ``host=... port=...``, which any role with only CREATEDB can create, redirected psql to a server of the creator's choosing and leaked the connecting user's saved password (CVE-2026-116252). The name is now passed through the same connection-information helper as the Backup, Restore, Maintenance and Import/Export tools, so libpq treats it strictly as a database name. Reported by Bae Seung-won (@baeseungwon1010).
  | `Issue #10646 <https://github.com/pgadmin-org/pgadmin4/issues/10646>`_ -  Fix a user's other sessions surviving a password change, which left a session an attacker already held valid after the password was changed or reset (CVE-2026-116251). A self-service change now rotates the user's ``fs_uniquifier``, logging out every other session while the changing session stays signed in with its database connections, and saved passwords, including those of shared servers, are re-encrypted under the new key, with any that cannot be decrypted cleared, and all of them cleared if re-encryption fails. An administrator reset (including ``setup.py update-user``) also rotates ``fs_uniquifier``, ending all of that user's sessions, but does not re-encrypt their saved passwords. Reported by Zohaib.
  | `Issue #10647 <https://github.com/pgadmin-org/pgadmin4/issues/10647>`_ -  Fix time-of-check to time-of-use symlink races in Import/Export Servers and the File Manager's upload, save and file-open paths, where a path validated against the user's storage directory was then opened by name, so a symbolic link swapped in at the file or any parent directory in between let an export overwrite, or an import read, a file outside the storage directory (CVE-2026-116250). In server mode on POSIX the file is now opened by walking down from the storage directory one component at a time with ``O_NOFOLLOW``; new files are created with mode 0600 and only regular files are read, opened non-blocking so a FIFO cannot hang the request. Symbolic links inside a storage directory are now refused, even when they point elsewhere inside it. Windows and desktop mode are unchanged, so the race remains there. Reported by MUTED CYBERSECURITY S.L.
  | `Issue #10648 <https://github.com/pgadmin-org/pgadmin4/issues/10648>`_ -  Fix the same symlink races in the files handed to Backup, Restore and Import/Export Data, where the validated path was passed to pg_dump, pg_dumpall, pg_restore or psql, which opened it by name later, extending the fix for the vulnerability tracked in Issue #10647. In server mode on POSIX pgAdmin now opens the file itself with the descriptor-relative ``O_NOFOLLOW`` walk, accepts only a regular file and hands the utility ``/dev/fd/N``, and new backup and export files are created with mode 0600. This applies on Linux only, and not to directory-format Backup and Restore, where the utility opens the files inside the directory by name; on macOS and the BSDs the file is checked safely but the utility still reopens it by name.
  | `Issue #10649 <https://github.com/pgadmin-org/pgadmin4/issues/10649>`_ -  Refuse hard links and FIFOs in the symlink-race fixes of Issue #10647 and Issue #10648, since ``O_NOFOLLOW`` stops only symbolic links: in server mode on POSIX, a file with more than one link is refused, for reading as well as before it is truncated for writing, and a FIFO can no longer hang an upload, save or export; Windows is not covered. The Import/Export Servers, save, Backup, Restore and Import/Export Data handlers also return the reason for a failure instead of text containing the absolute storage path.
  | `Issue #10650 <https://github.com/pgadmin-org/pgadmin4/issues/10650>`_ -  Fix connection file paths escaping the user's storage directory, where a password file, SSL certificate, key or CRL, or SSH tunnel identity file such as ``../<another user>/.pgpass`` was joined to the storage directory after stripping only leading slashes, so a user could connect with another user's credentials or key, and where ``sslkeylogfile`` was copied into the connection string unchanged, letting libpq create or append a file as the pgAdmin service account (CVE-2026-116249). In server mode the resolved path, with symbolic links followed, must now stay inside the user's storage directory or the named shared storage directory, and ``sslkeylogfile`` is confined the same way. Connection parameter keys are also validated against the libpq keyword list, since a crafted key could smuggle its own ``keyword=value`` pairs past these checks. Servers whose file paths reach outside the storage directory, through ``..`` or a symbolic link, stop connecting until the files are moved into it or into a ``SHARED_STORAGE`` directory.
  | `Issue #10651 <https://github.com/pgadmin-org/pgadmin4/issues/10651>`_ -  Fix any user able to register a server being able to share it with every other user in server mode, because the create and update endpoints stored whatever ``shared`` value they were sent, and the servers.json import removed a non-administrator's shared entries only after validation, so an early error left them in place (CVE-2026-116248). Such requests are now refused with a 403, and the import prunes and skips a non-administrator's shared entries before validating. The restriction is not retroactive: servers shared by non-administrators before the upgrade stay shared until the owner un-shares them or an administrator clears the ``shared`` column in the configuration database, and pgAdmin only logs a warning about each of them at startup, so administrators should review those servers and un-share any that should not be shared. ``Shared`` in a servers.json import must now be the JSON value ``true``, and a file that fails validation is refused as a whole.
  | `Issue #10652 <https://github.com/pgadmin-org/pgadmin4/issues/10652>`_ -  Stop libpq using the pgAdmin service account's own client files in server mode: when a server had no password file, client certificate or client key configured, libpq fell back to the service account's ``~/.pgpass``, ``~/.postgresql/postgresql.crt`` and ``~/.postgresql/postgresql.key`` (or ``PGPASSFILE``, ``PGSSLCERT`` and ``PGSSLKEY``), letting any user connect with the service account's saved passwords or client certificate (CVE-2026-116247). In server mode each of these parameters is now always given a value, the user's own file or a path that can never be opened, in the connection string and for the utilities. Server mode deployments relying on the service account's files, or on ``passfile``, ``sslcert`` or ``sslkey`` in a connection service entry, must configure them on each server instead, and a server with a client certificate must also have a client key.
  | `Issue #10653 <https://github.com/pgadmin-org/pgadmin4/issues/10653>`_ -  Fix server passwords being left in pgAdmin's own process environment, where the password handed to psql and to the utilities was written into ``os.environ`` and never removed, so another user's later psql session or utility inherited it and libpq used it for any connection made without a password of its own (CVE-2026-116246). The password now goes only into the environment of the process that needs it.
  | `Issue #10654 <https://github.com/pgadmin-org/pgadmin4/issues/10654>`_ -  Restrict connection services in server mode, where any user could set a server's service, or a ``service`` connection parameter, to an entry in the service account's connection service file and connect with that entry's credentials, and where a ``PGPASSWORD`` or ``PGSERVICE`` variable set for that account was used for every connection (CVE-2026-116245). A service may now only be used if the administrator lists it in the new ``SERVER_MODE_ALLOWED_SERVICES`` setting, which is empty by default; the ``servicefile`` parameter is refused, and ``PGPASSWORD`` and ``PGSERVICE`` are removed from pgAdmin's environment at startup. ``setup.py load-servers`` also refuses an unlisted service. In server mode, servers that use a service stop connecting until the administrator lists it in ``SERVER_MODE_ALLOWED_SERVICES`` in ``config_local.py``, ideally before upgrading. Listing a service shares its credentials with every pgAdmin user, so list only services intended for everyone.
  | `Issue #10655 <https://github.com/pgadmin-org/pgadmin4/issues/10655>`_ -  Stop libpq using the pgAdmin service account's Kerberos credentials in server mode, where removing ``KRB5CCNAME`` let the Kerberos library fall back to the service account's default credential cache or client keytab (or its logon, through SSPI on Windows), so any user could answer a server's GSSAPI request as the service account's principal (CVE-2026-116244). In server mode ``KRB5CCNAME`` and ``KRB5_CLIENT_KTNAME`` now point at a file that cannot exist, except that a user who logged in with Kerberos gets their own delegated ``KRB5CCNAME`` when connecting to a server with Kerberos authentication enabled. Every other connection also gets ``gssencmode=disable`` and, with libpq 16 or later, ``require_auth=!gss,!sspi``; without ``require_auth``, SSPI and gssproxy are not stopped, so upgrade the libpq used by pgAdmin and its utilities to 16 or later. A server whose ``require_auth`` allows only GSSAPI or SSPI is refused unless the user logged in with Kerberos. A service listed in ``SERVER_MODE_ALLOWED_SERVICES`` takes precedence for psql and the utilities, so it must not set ``require_auth``, ``gssencmode`` or ``gsslib``.
  | `Issue #10656 <https://github.com/pgadmin-org/pgadmin4/issues/10656>`_ -  Fix the utility binary-path guard accepting a path under ``SHARED_STORAGE``, which ordinary users can write to, so a user could point a server type's binary path at a file placed there and have pgAdmin execute it (CVE-2026-116243). Every ``SHARED_STORAGE`` entry is now rejected alongside ``STORAGE_DIR``, after expanding ``$DIR`` and ``..`` and resolving symbolic links, so an existing binary path under a shared storage directory stops working. An empty ``STORAGE_DIR`` is not covered. Reported by Harsh Singh.
  | `Issue #10662 <https://github.com/pgadmin-org/pgadmin4/issues/10662>`_ -  Stop SSH tunnels using the pgAdmin service account's own SSH identity, where sshtunnel always loaded the unencrypted private keys in the service account's ``~/.ssh``, read its ``~/.ssh/config`` and could use its ssh-agent, so any user could configure a tunnel that authenticated with the service account's key (CVE-2026-116242). In server mode the tunnel no longer reads those keys or that configuration, or uses the agent, and an identity file that cannot be found in the user's storage is reported. Tunnels relying on the service account's key, config or agent must have an identity file in the user's storage or a password configured on the server.
  | `Issue #10663 <https://github.com/pgadmin-org/pgadmin4/issues/10663>`_ -  Fix OS command injection in the Import/Export Data tool, where a query-based export could pass a crafted query past the ``\copy (...)`` parenthesis-balance guard through a backslash inside a double-quoted identifier, which psql treats as an escape when ``standard_conforming_strings`` is off, exposing a live ``TO PROGRAM`` clause that runs an arbitrary command on the pgAdmin host, an incomplete fix for CVE-2026-17566 (CVE-2026-116241). A backslash inside a double-quoted identifier is now rejected, and so is a backslash or null byte in the schema, table or column names of an export or import, which reached the same ``\copy`` command through ``qtIdent()``. Reported by Yonghwa Lee (Xint by Theori).
  | `Issue #10674 <https://github.com/pgadmin-org/pgadmin4/issues/10674>`_ -  Fix the File Manager and the storage-path tools acting on a different path from the one that was checked (CVE-2026-116240): opening, saving and listing files, download, delete, rename, create-folder and upload could name files outside the user's storage directory, or in another user's directory whose name begins with the same characters. Every File Manager and storage-path caller now acts on the absolute path that was checked, and in server mode on POSIX files are opened relative to the storage directory without following symbolic links, so symbolic links to directories and hard-linked files inside it can no longer be opened, downloaded or renamed through. The storage directory itself can no longer be deleted.
  | `Issue #10675 <https://github.com/pgadmin-org/pgadmin4/issues/10675>`_ -  Fix LDAP and Kerberos authentication logging a user in to a different account that shared their username: Kerberos and LDAP looked the account up by username alone, or accepted the account Flask-Security's internal validation had matched by the email typed, so a Kerberos or LDAP user could be logged in as an Internal account, including the initial administrator, or as another user (CVE-2026-116239). Accounts are now looked up by the authenticated username and the source that authenticated them, and only internal authentication logs in an account from its own form. Webserver users whose username matches an Internal account, and LDAP users with capitals in their username, now log in correctly, and ``setup.py`` can update a user without a role and add one without ``--role``. Users who relied on being logged in to an Internal account of the same name now need an account of their own source. Reported by Yves Soete of Blacksight LLC (@yssoe).
  | `Issue #10676 <https://github.com/pgadmin-org/pgadmin4/issues/10676>`_ -  Fix bypasses of the failed-login limit and of pgAdmin's own login, password change and password reset checks, where a username in another case or a wrong internal password with LDAP or Webserver authentication also configured was never counted, and where Flask-Security's own ``/login``, ``/verify``, ``/change``, ``/reset`` and ``/reset/<token>`` views accepted submissions that skipped the failed-login count and lock, the change password permission, the re-encryption of saved passwords, and the internal-account check on resets (CVE-2026-116238). Every failed internal login is now counted (when ``MAX_LOGIN_ATTEMPTS`` is set) and only internal authentication is locked, so a locked Internal account no longer blocks other sources. A login form that posts a password is no longer passed to Kerberos, OAuth2 or Webserver authentication, submissions to Flask-Security's views are refused with 405, and password resets act only on the internal account.
