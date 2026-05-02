************
Version 9.15
************

Release date: 2026-05-11

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.14.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.2


New features
************

  | `Issue #9657 <https://github.com/pgadmin-org/pgadmin4/issues/9657>`_ -  Allow the container image to run as a non-default user via the PUID and PGID environment variables.

Housekeeping
************

  | `Issue #9764 <https://github.com/pgadmin-org/pgadmin4/issues/9764>`_ -  Update the Swedish translation.
  | `Issue #9827 <https://github.com/pgadmin-org/pgadmin4/issues/9827>`_ -  Bump Python and JavaScript dependencies.
  | `Issue #9832 <https://github.com/pgadmin-org/pgadmin4/issues/9832>`_ -  Fix the Czech translation for 'Refresh'.
  | `Issue #9834 <https://github.com/pgadmin-org/pgadmin4/issues/9834>`_ -  Bump runtime dependencies and upgrade ESLint to v10.
  | `Issue #9839 <https://github.com/pgadmin-org/pgadmin4/issues/9839>`_ -  Update the Russian translation.
  | `Issue #9870 <https://github.com/pgadmin-org/pgadmin4/issues/9870>`_ -  Bump runtime and development dependencies.
  | `Issue #9873 <https://github.com/pgadmin-org/pgadmin4/issues/9873>`_ -  Use an ``<OWNER>`` placeholder in resql tests instead of a hardcoded 'postgres' role to support non-default superuser names.
  | `Issue #9893 <https://github.com/pgadmin-org/pgadmin4/issues/9893>`_ -  Update the Spanish translation.

Bug fixes
*********

  | `Issue #9656 <https://github.com/pgadmin-org/pgadmin4/issues/9656>`_ -  Use absolute paths for ``a2enmod`` and ``a2enconf`` in the Debian setup script so it works when ``/usr/sbin`` is not on PATH.
  | `Issue #9830 <https://github.com/pgadmin-org/pgadmin4/issues/9830>`_ -  Fix cross-user data access and shared-server privilege escalation in server mode (CVE pending). Also applies the ``@with_object_filters`` access-control decorator to ``ServerNode.list``.
  | `Issue #9835 <https://github.com/pgadmin-org/pgadmin4/issues/9835>`_ -  Tighten Shared Server feature parity, owner-only field handling, and write guards as a follow-up to the data-isolation hardening (CVE pending).
  | `Issue #9865 <https://github.com/pgadmin-org/pgadmin4/issues/9865>`_ -  Fix stored cross-site scripting (XSS) via crafted PostgreSQL object names rendered in the Browser Tree and Explain Visualizer (CVE pending). Reported by Fahar Abbas.
  | `Issue #9898 <https://github.com/pgadmin-org/pgadmin4/issues/9898>`_ -  Fix SQL injection in Maintenance tool option values (CVE pending). Reported by j3seer.
  | `Issue #9899 <https://github.com/pgadmin-org/pgadmin4/issues/9899>`_ -  Fix OS command injection in Import/Export query export (CVE pending). Reported by Chung Kim (chungkn), OneMount Group.
  | `Issue #9900 <https://github.com/pgadmin-org/pgadmin4/issues/9900>`_ -  Fix local-file inclusion and server-side request forgery in LLM API configuration endpoints (CVE pending). Reported by j3seer.
  | `Issue #9901 <https://github.com/pgadmin-org/pgadmin4/issues/9901>`_ -  Fix unsafe deserialization in the session manager that could lead to remote code execution (CVE pending). Also encrypts session files at rest using Fernet, restricts session-file permissions to 0o600, switches the session-digest default from SHA-1 to SHA-256, drops several non-roundtrippable live objects from the session (``AuthSourceManager`` and the Azure, RDS, Google Cloud, and BigAnimal cloud-provider instances), tightens DATA_DIR file and directory permissions at creation, creates ``pgadmin4.log`` with mode 0o600, hardens ``EnhancedRotatingFileHandler._open`` against rotation failures, and bounds the ``user_info_server`` prompt retry loop so a non-interactive caller cannot spin forever. Reported by Fernando Bortotti.
  | `Issue #9902 <https://github.com/pgadmin-org/pgadmin4/issues/9902>`_ -  Fix symlink-based path traversal in the file manager (CVE pending). Reported by Fernando Bortotti.

Additional changes (no associated issue)
****************************************

The commits below did not have a dedicated GitHub issue. They are listed here for transparency.

Bug fixes
---------

  | ``1518b0828`` - Restore the SERVER_MODE python-test path and fix two endpoint regressions surfaced by it.
  | ``d57acce35`` - Harden validation, preference, and connection-params paths against pre-existing edge cases.

Test-suite stability
--------------------

  | ``a11d289bd`` - Harden ``click_modal`` backdrop wait and ``open_query_tool`` stale-element retry in feature tests.
  | ``a50a553b0`` - Feature tests use ``sys.executable``; sync ``yarn.lock`` to ``package.json``.
  | ``0fad04de8`` - PSQL socket tests use the authenticated tester; the role-dependencies test skips cleanly on auth failure.
  | ``1f7194924`` - Harden six regression tests against environmental drift.
  | ``dc61039e9`` - Quote the username in the views/mview test helper for dotted local roles.
  | ``9b29bc203`` - Quote the username in the types/compound-triggers test helpers for dotted local roles.
  | ``504775de8`` - Quote the username in the user-mappings test helper for dotted local roles.

Refactoring
-----------

  | ``6f4f28def`` - Factor the WTForms-error-to-JSON conversion into a helper and drop a dead import.
