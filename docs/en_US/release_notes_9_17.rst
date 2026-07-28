************
Version 9.17
************

Release date: 2026-07-30

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.16.

Supported Database Servers
**************************
**PostgreSQL**: 14, 15, 16, 17 and 18

**EDB Advanced Server**: 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.4


New features
************

  | `Issue #9990 <https://github.com/pgadmin-org/pgadmin4/issues/9990>`_ -  Include the authenticated user's identity in the HTTP access log.
  | `Issue #9942 <https://github.com/pgadmin-org/pgadmin4/issues/9942>`_ -  Add an opt-in Gateway API HTTPRoute template to the Helm chart as an alternative to the existing Ingress.
  | `Issue #10104 <https://github.com/pgadmin-org/pgadmin4/issues/10104>`_ -  Add a preference to cap the row count fetched by the plain "View Data" action, so it is usable on large tables without always doing a full ``SELECT *``.
  | `Issue #10142 <https://github.com/pgadmin-org/pgadmin4/issues/10142>`_ -  Add support for a custom XYZ tile provider (URL, name, CRS, attribution, max zoom) in the Geometry Viewer, alongside the existing built-in base layers.

Housekeeping
************

  | `Issue #10077 <https://github.com/pgadmin-org/pgadmin4/issues/10077>`_ -  Centralize shared-server-group visibility and access-control logic, and adjust the ServerGroup-to-Server/SharedServer model relationships.
  | `Issue #10093 <https://github.com/pgadmin-org/pgadmin4/issues/10093>`_ -  Add a basic starter contributing guide.
  | `Issue #10135 <https://github.com/pgadmin-org/pgadmin4/issues/10135>`_ -  Fail the macOS appbundle build if any bundled library links outside the bundle, and scan all Mach-O binaries for bundle linkage rather than only files named ``.so``/``.dylib``.
  | `Issue #10154 <https://github.com/pgadmin-org/pgadmin4/issues/10154>`_ -  Pin the sonarqube-scan-action GitHub workflow to a full commit SHA instead of a mutable branch ref, to harden against supply-chain tampering.
  | `Issue #10138 <https://github.com/pgadmin-org/pgadmin4/issues/10138>`_ -  Update the Simplified Chinese (zh_Hans_CN) translation to match the wording used in the interface.
  | `Issue #10156 <https://github.com/pgadmin-org/pgadmin4/issues/10156>`_ -  Pin the Yarn version used by the build scripts to the ``packageManager`` field, rather than whatever Yarn happens to be on the builder's PATH.
  | `Issue #10176 <https://github.com/pgadmin-org/pgadmin4/issues/10176>`_ -  Bump JavaScript and Python third-party dependencies, including axios, webpack, react, electron, and certifi.

Bug fixes
*********

  | `Issue #10053 <https://github.com/pgadmin-org/pgadmin4/issues/10053>`_ -  Warn when OAuth2 provider settings are misplaced at the top level of the config instead of under ``OAUTH2_CONFIG``.
  | `Issue #10100 <https://github.com/pgadmin-org/pgadmin4/issues/10100>`_ -  Fix Schema Diff's "Generate Script" and the browser tree's CREATE Script view emitting wrong SQL for SERIAL/identity columns, by detecting column-owned sequences via pg_depend instead of guessing the sequence name.
  | `Issue #10102 <https://github.com/pgadmin-org/pgadmin4/issues/10102>`_ -  Fix a Schema Diff result-status filter chip showing "No difference found" after being toggled off and back on, even when real differences exist.
  | `Issue #10106 <https://github.com/pgadmin-org/pgadmin4/issues/10106>`_ -  Fix the Object Explorer briefly showing the literal HTML markup instead of a greyed-out "[Disconnecting...]" label when disconnecting a server or database.
  | `Issue #10107 <https://github.com/pgadmin-org/pgadmin4/issues/10107>`_ -  Detect a selected-but-unusable OS keyring and fall back gracefully instead of failing.
  | `Issue #10109 <https://github.com/pgadmin-org/pgadmin4/issues/10109>`_ -  Fix ALT+F5 ("Execute query at cursor") doing nothing when the cursor is on or near a statement that is not highlighted, in a Query Tool tab with multiple statements separated by blank lines.
  | `Issue #10110 <https://github.com/pgadmin-org/pgadmin4/issues/10110>`_ -  Stop the googleapiclient cloud-deployment dependency from pulling in the system oauth2client package.
  | `Issue #10117 <https://github.com/pgadmin-org/pgadmin4/issues/10117>`_ -  Fix a "'Response' object is not iterable" crash when expanding a Trigger node under a Table to view its trigger function, and report the correct error message on a node.sql failure in that flow.
  | `Issue #10158 <https://github.com/pgadmin-org/pgadmin4/issues/10158>`_ -  Honor the selected EOL sequence when copying query text to the clipboard.
  | `Issue #10187 <https://github.com/pgadmin-org/pgadmin4/issues/10187>`_ -  Fix the object browser's extension UI breaking under PostgreSQL 19's extension catalog changes.
  | `Issue #10190 <https://github.com/pgadmin-org/pgadmin4/issues/10190>`_ -  Fix a tool-permission bypass where a user denied the Query Tool, Grant Wizard, or Schema Diff permission could still drive that tool's backend routes and Socket.IO handlers directly, since the permission check was applied only to a single "front door" route per tool. Also fixes a non-owner triggering an adhoc connection against another user's shared server persisting a new server record still owned by that other user (CVE-2026-17350). Reported by LXY.
  | `Issue #10191 <https://github.com/pgadmin-org/pgadmin4/issues/10191>`_ -  Fix OS command injection in the MASTER_PASSWORD_HOOK feature, where an externally-sourced username (e.g. via OAuth2/OIDC, Kerberos, or webserver authentication) containing shell metacharacters could execute arbitrary commands as the pgAdmin service account when the configured hook string uses ``%u`` (CVE-2026-17347). Reported by Thiago Pereira.
  | `Issue #10192 <https://github.com/pgadmin-org/pgadmin4/issues/10192>`_ -  Fix a lexer-differential bypass of the AI Assistant's read-only transaction guard, where sqlparse's string-literal lexing disagreed with PostgreSQL's own parser under ``standard_conforming_strings = on``, letting a crafted multi-statement payload smuggle a COMMIT past the intended read-only wrapper, an incomplete fix for CVE-2026-12045 (CVE-2026-17351). Reported by Kai Aizen.
  | `Issue #10193 <https://github.com/pgadmin-org/pgadmin4/issues/10193>`_ -  Fix SQL injection in the Index Statistics all-indexes listing and the Publications/Subscriptions Dependencies views, where an apostrophe in a table, index, publication, or subscription name broke out of an unescaped template interpolation, an incomplete fix for CVE-2026-12044 (CVE-2026-17346). Reported by Hung Tran.
  | `Issue #10194 <https://github.com/pgadmin-org/pgadmin4/issues/10194>`_ -  Fix several Constraints, Preferences, Debugger, and Schema Diff routes missing the ``@pga_login_required`` decorator, making them reachable without authentication in server mode, an incomplete fix for CVE-2026-12046 (CVE-2026-17348). Reported by Hung Tran.
  | `Issue #10200 <https://github.com/pgadmin-org/pgadmin4/issues/10200>`_ -  Fix an adhoc server connection cloning another user's stored database credentials (password, save password flag, tunnel password) alongside ownership, letting a non-owner who cloned another user's shared server connect using that user's saved database password (CVE-2026-17349).
  | `Issue #10213 <https://github.com/pgadmin-org/pgadmin4/issues/10213>`_ -  Fix OS command injection in the Import/Export Data tool, where a query-based export could pass a crafted query string past the ``\copy (...)`` parenthesis-balance guard by exploiting a backslash-escape mismatch with psql's default ``standard_conforming_strings = on`` behaviour, exposing a live ``TO PROGRAM`` clause for arbitrary command execution (CVE-2026-17566). Reported by Arpit Jain.

Additional changes (no associated issue)
****************************************

Dependencies
------------

Non-breaking ``dependabot`` and audit-driven bumps aggregated for v9.17.

Python:

  | ``certifi`` 2026.5.20 -> 2026.6.17

JavaScript (``web/``):

  | ``@babel/core`` 7.29.0 -> 7.29.6
  | ``@date-io/date-fns`` 3.x -> 3.2.1
  | ``@szhsin/react-menu`` 4.5.1 -> 4.5.2
  | ``@tanstack/react-query`` 5.100.9 -> 5.101.4
  | ``@types/react`` 19.2.14 -> 19.2.17
  | ``ajv`` 8.18.0 -> 8.20.0
  | ``anti-trojan-source`` 1.8.1 -> 1.12.0
  | ``autoprefixer`` 10.5.0 -> 10.5.4
  | ``axios`` 1.16.0 -> 1.18.1
  | ``core-js`` added as an explicit direct dependency (3.49.0), previously relied on transitively via pickr
  | ``date-fns`` 4.1.0 -> 4.4.0
  | ``dompurify`` 3.4.1 -> 3.4.12
  | ``eslint-plugin-jest`` 29.15.2 -> 29.15.5
  | ``globals`` 17.5.0 -> 17.7.0
  | ``hotkeys-js`` 4.0.3 -> 4.0.4
  | ``html-to-image`` 1.11.11 -> 1.11.13
  | ``ip-address`` 10.1.1 -> 10.2.0
  | ``jest`` / ``jest-environment-jsdom`` 30.3.0 -> 30.4.2 / 30.4.1
  | ``marked`` 18.0.2 -> 18.0.7
  | ``moment-timezone`` 0.6.2 -> 0.6.3
  | ``papaparse`` 5.5.3 -> 5.5.4
  | ``postcss`` 8.5.10/8.5.14 -> 8.5.20
  | ``react`` / ``react-dom`` 19.2.5 -> 19.2.7
  | ``react-checkbox-tree`` 2.0.1 -> 2.0.2
  | ``react-draggable`` 4.5.0 -> 4.7.0
  | ``react-timer-hook`` 4.0.5 -> 4.0.6
  | ``sharp`` 0.34.4 -> 0.35.3
  | ``sql-formatter`` 15.7.3 -> 15.8.2
  | ``svgo`` 4.0.1 -> 4.0.2
  | ``terser-webpack-plugin`` 5.5.0 -> 5.6.1
  | ``typescript-eslint`` 8.59.0 -> 8.65.0
  | ``webpack`` 5.106.2 -> 5.108.4
  | ``webpack-bundle-analyzer`` 5.3.0 -> 5.3.1
  | ``zustand`` 5.0.12 -> 5.0.14
  | Transitive advisory bumps: ``brace-expansion``, ``form-data``, ``undici``, ``js-yaml``
  | Reverted ``azure-mgmt-resource`` to avoid a breaking import-path change in ``pgadmin/misc/cloud/azure``

JavaScript (``runtime/``):

  | ``electron`` 42.3.3 -> 43.1.1
  | ``eslint`` 10.4.1 -> 10.7.0
  | ``globals`` 17.6.0 -> 17.7.0
  | ``axios`` 1.18.0 -> 1.18.1
  | ``ip-address`` 10.1.1 -> 10.2.0
  | ``postcss`` 8.5.10 -> 8.5.20
  | Pinned ``packageManager`` to ``yarn@4.15.0``
