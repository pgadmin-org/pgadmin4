************
Version 9.18
************

Release date: 2026-09-10

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.17.

Supported Database Servers
**************************
**PostgreSQL**: 14, 15, 16, 17 and 18

**EDB Advanced Server**: 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.4


New features
************

  | `Issue #9631 <https://github.com/pgadmin-org/pgadmin4/issues/9631>`_ -  Collapse and restore the Object Explorer by re-clicking the Default workspace icon, in the manner of the VS Code side bar, remembering the choice across refreshes.

Housekeeping
************

  | `Issue #10221 <https://github.com/pgadmin-org/pgadmin4/issues/10221>`_ -  Skip importing and initialising the kerberos, ldap, mfa, oauth2 and webserver authentication providers unless ``SERVER_MODE`` is set, leaving desktop mode with internal authentication alone.
  | `Issue #10247 <https://github.com/pgadmin-org/pgadmin4/issues/10247>`_ -  Relax the ``azure-mgmt-resource`` pin to allow 24.0.0, and aggregate the third-party JavaScript and Python dependency bumps for this release.
  | ``6487f2a93`` -  Add support for Python 3.14: the macOS bundle now defaults to 3.14.7 and the Windows build looks for an interpreter in ``C:\Python314``, and the pip trove classifier is added. The minimum supported version is unchanged at 3.9.
  | ``efc0dea33`` -  Document what the AI features transmit to LLM providers - schema definitions, ``pg_settings`` values, query text, EXPLAIN plan output and, for the Query Tool assistant, row data - and that nothing is transmitted until a provider is configured.
  | ``3cb33475e`` -  Helm chart: add ``existingClaim`` to persistence.
  | ``9cd0e35f4`` -  Helm chart: add ``backendRefs`` group and kind to ``httproute.yaml``.
  | ``689c969f9`` -  macOS packaging: stop using ``--system-site-packages`` in favour of a scoped ``.pth``, and surface the real notarization failure by printing ``REQUEST_STATUS`` and fetching the notarytool log.
  | ``bc58657d3`` -  Stop the build scripts fetching an unpinned Yarn before the pinned one.
  | ``7790264ac`` -  Batch Dependabot's minor and patch updates into one pull request per manifest, and stop it re-proposing bumps we have deliberately held back.

Bug fixes
*********

  | `Issue #10383 <https://github.com/pgadmin-org/pgadmin4/issues/10383>`_ -  Fix an authentication bypass in Webserver authentication mode, where ``get_user()`` fell back to reading the configured ``WEBSERVER_REMOTE_USER`` name from the request headers when it was absent from the WSGI environment, letting any client that could reach pgAdmin assert any identity, including an administrator's (CVE-2026-XXXXX). Header-asserted identity is now opt-in, restricted to a configured list of trusted proxies with an optional shared secret, and refused for accounts whose authentication source is not ``webserver``. Reported by Sanghyeon Lee (@h9e0n).
  | `Issue #10384 <https://github.com/pgadmin-org/pgadmin4/issues/10384>`_ -  Fix argument and connection-string injection in the Backup tool, where the client-supplied database name was appended to the pg_dump argument vector as a bare positional argument: because getopt_long permutes arguments, a value beginning with a dash supplied further options such as ``--file``, overriding the storage-confined output path, and because libpq expands a database name containing an equals sign into a full connection string, one could also redirect the connection to an attacker-controlled host and exfiltrate the stored password (CVE-2026-XXXXX). The database name is now passed through the ``PGDATABASE`` environment variable instead. Reported by Sanghyeon Lee (@h9e0n) and Hitesh Jambhale.
  | `Issue #10385 <https://github.com/pgadmin-org/pgadmin4/issues/10385>`_ -  Fix a time-of-check to time-of-use flaw in the File Manager's ``save_file`` endpoint, which backs saving from the Query Tool and ERD: the requested path was validated with ``check_access_permission()`` and then opened with a plain ``open()``, so a symbolic link planted in between was followed, writing outside the storage directory. This is the sink CVE-2026-7819's hardening of the separate upload path did not cover (CVE-2026-XXXXX). Reported by sec-rex.
  | `Issue #9226 <https://github.com/pgadmin-org/pgadmin4/issues/9226>`_ -  Accept ``SharedUsername`` when importing a shared server from a servers.json definition, instead of insisting on ``Username`` for every server.
  | `Issue #10155 <https://github.com/pgadmin-org/pgadmin4/issues/10155>`_ -  Share concurrent identical GET requests behind ``getNodeAjaxOptions()`` so a wide table's Columns tab no longer fires one duplicate ``get_types`` request per column row.
  | `Issue #10235 <https://github.com/pgadmin-org/pgadmin4/issues/10235>`_ -  Remove a trailing quote from the Windows installer's ``ProductVersion``, which was stamped as e.g. ``9.17"``.
  | `Issue #10236 <https://github.com/pgadmin-org/pgadmin4/issues/10236>`_ -  Fix Schema Diff reporting false differences for SERIAL/BIGSERIAL columns by ignoring the owned sequence's oid, and fix the invalid ``ALTER COLUMN ... TYPE bigserial`` SQL generated when such a column genuinely differs.
  | `Issue #10237 <https://github.com/pgadmin-org/pgadmin4/issues/10237>`_ -  Fix a ``replace() argument 2 must be str, not None`` crash when a per-server Password Exec Command is used with a service-only (pg_service.conf) connection, which leaves host, port and username unset.
  | `Issue #10239 <https://github.com/pgadmin-org/pgadmin4/issues/10239>`_ -  Remove a redundant ``passlib`` pin that conflicts with the indirectly required ``libpass``.
  | `Issue #10309 <https://github.com/pgadmin-org/pgadmin4/issues/10309>`_ -  Reject an empty or null ``Username`` when importing a non-shared server, which previously imported cleanly and left a server libpq would silently authenticate as the OS account running pgAdmin.
  | `Issue #10311 <https://github.com/pgadmin-org/pgadmin4/issues/10311>`_ -  Fix login being impossible against Flask-Security-Too 5.8.2, which corrected a long-standing inversion in ``UserMixin.is_locked()`` that ``User.is_locked()`` had been written against.
  | ``9a009fd2b`` -  Refuse HTTP redirects on LLM API requests, rather than following a ``Location`` header on to a destination ``ALLOWED_LLM_API_URLS`` was never applied to. This is hardening rather than a fix for an exploitable flaw, since returning the redirect at all requires control of a host already on the allowlist. Reported by Ziya Abdullayev.
  | ``3f9945419`` -  Fix the desktop app hanging at startup on hosts with no live D-Bus/GNOME-Keyring session, by moving the keyring usability probe out of ``import config`` and into a background thread that runs it in a separate process.

Dependencies
************

Non-breaking ``dependabot`` and audit-driven bumps aggregated for v9.18.

Python:

  | ``Authlib`` 1.7.* -> 1.8.*
  | ``azure-mgmt-resource`` ==25.0.0 -> >=24.0.0,<26.0.0
  | ``certifi`` 2026.6.17 -> 2026.7.22
  | ``cryptography`` 49.0.* -> 50.0.*
  | ``Flask-Security-Too`` 5.8.* -> >=5.8.2,<5.9
  | ``google-auth-oauthlib`` 1.4.0 -> 1.4.1
  | ``gssapi`` 1.11.* -> 1.12.*
  | ``passlib`` 1.* pin removed (redundant, and conflicting with ``libpass``)
  | ``psycopg[c]`` 3.3.4 -> 3.3.5
  | ``selenium`` (``web/regression``) 4.45.0 -> 4.48.0
  | ``setuptools`` 83.* -> 84.*
  | ``testscenarios`` (``web/regression``) 0.6.2 -> 0.7.0
  | ``typer`` 0.26.* -> 0.27.*
  | Skipped: ``paramiko`` 3 -> 5 (blocked on ``sshtunnel``'s ``paramiko.DSSKey`` usage) and ``azure-mgmt-resource`` 26.0.0 (drops Python 3.9 support)

JavaScript (``web/``):

  | ``@babel/*`` toolchain (core, eslint-parser, eslint-plugin, plugin-syntax-jsx, plugin-transform-class-properties, plugin-transform-object-rest-spread, plugin-transform-runtime, preset-env, preset-react, preset-typescript) -> 7.29.7
  | ``@mui/icons-material`` / ``@mui/material`` 7.3.10 -> 7.3.11
  | ``@mui/x-date-pickers`` 8.28.3 -> 8.29.3
  | ``@tanstack/react-query`` 5.101.4 -> 5.102.8
  | ``@tanstack/react-virtual`` 3.13.24 -> 3.14.10
  | ``@testing-library/jest-dom`` 6.9.1 -> 6.10.0
  | ``@testing-library/react`` 16.3.2 -> 16.3.3
  | ``@testing-library/user-event`` 14.6.1 -> 14.6.3
  | ``@types/react`` 19.2.17 -> 19.2.18
  | ``@types/react-dom`` 19.2.3 -> 19.2.5
  | ``anti-trojan-source`` 1.12.0 -> 1.12.2
  | ``axios`` 1.18.1 -> 1.20.0
  | ``codemirror`` 6.0.2 -> 6.65.7
  | ``core-js`` 3.49.0 -> 3.50.0
  | ``css-loader`` 7.1.4 -> 7.1.5
  | ``diff-arrays-of-objects`` 1.1.10 -> 1.1.11
  | ``dompurify`` 3.4.12 -> 3.4.14
  | ``eslint`` 9.39.4 -> 9.39.5
  | ``eslint-plugin-jest`` 29.15.5 -> 29.16.6
  | ``globals`` 17.7.0 -> 17.12.0
  | ``hotkeys-js`` 4.0.4 -> 4.0.7
  | ``image-minimizer-webpack-plugin`` 4.1.4 -> 5.0.0
  | ``ip-address`` 10.2.0 -> 10.7.0
  | ``jest`` / ``jest-environment-jsdom`` 30.4.2 / 30.4.1 -> 30.5.1
  | ``lossless-json`` 4.3.0 -> 4.3.1
  | ``marked`` 18.0.7 -> 18.0.11
  | ``papaparse`` 5.5.4 -> 5.7.0
  | ``postcss`` 8.5.20 -> 8.5.26
  | ``rc-dock`` 4.0.0-alpha.2 -> 4.0.0-alpha.3
  | ``react`` / ``react-dom`` 19.2.7 -> 19.2.8
  | ``react-arborist`` 3.5.0 -> 3.16.0
  | ``react-draggable`` 4.7.0 -> 4.7.1
  | ``sharp`` 0.35.3 -> 0.35.4
  | ``svgo`` 4.0.2 -> 4.1.0
  | ``svgo-loader`` 4.0.0 -> 5.0.0
  | ``typescript-eslint`` 8.65.0 -> 8.69.0
  | ``use-resize-observer`` 9.1.0 -> 10.0.0
  | ``vanilla-jsoneditor`` 3.12.0 -> 3.13.0
  | ``webpack-bundle-analyzer`` 5.3.1 -> 5.3.2
  | ``zustand`` 5.0.14 -> 5.0.15
  | Transitive advisory bumps: ``brace-expansion``, ``fast-uri``, ``js-yaml``, ``shell-quote``, ``socket.io-parser``, ``tar``
  | Held back: ``@simonwep/pickr`` 1.10.x (webpack production-bundle interop break), Babel 8, and ``webpack`` 5.110.3 (npm-quarantined at bump time)

JavaScript (``runtime/``):

  | ``axios`` 1.18.1 -> 1.19.0
  | ``electron`` 43.1.1 -> 43.4.0
  | ``eslint`` 10.7.0 -> 10.8.1
  | ``globals`` 17.7.0 -> 17.11.0
  | ``ip-address`` 10.2.0 -> 10.3.1
  | ``postcss`` 8.5.20 -> 8.5.23
  | Transitive advisory bumps: ``brace-expansion``, ``fast-uri``, ``undici``
