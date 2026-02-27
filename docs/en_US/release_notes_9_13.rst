************
Version 9.13
************

Release date: 2026-03-05

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.12.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.0


New features
************

  | `Issue #229 <https://github.com/pgadmin-org/pgadmin4/issues/229>`_   - Allow users to customize "OF TYPE" columns during table creation.
  | `Issue #5578 <https://github.com/pgadmin-org/pgadmin4/issues/5578>`_ - No FK are shown in diagram created from existing tables in the ERD Tool.
  | `Issue #6386 <https://github.com/pgadmin-org/pgadmin4/issues/6386>`_ - Add support for 'ONLY' in Index creation dialog.
  | `Issue #8198 <https://github.com/pgadmin-org/pgadmin4/issues/8198>`_ - Allow "drag-n-drop" for only user chosen tables, and show relations between them.
  | `Issue #9229 <https://github.com/pgadmin-org/pgadmin4/issues/9229>`_ - Load predefined users from a JSON file through command line.
  | `Issue #9641 <https://github.com/pgadmin-org/pgadmin4/issues/9641>`_ - Core LLM integration infrastructure, AI reports for security, schema, and performance, AI chat for the Query Tool, and AI Insights for EXPLAIN.
  | `Issue #9657 <https://github.com/pgadmin-org/pgadmin4/issues/9657>`_ - Customize container user permissions using PUID and PGID.

Housekeeping
************

Bug fixes
*********

  | `Issue #7578 <https://github.com/pgadmin-org/pgadmin4/issues/7578>`_ - Fixed an issue where the 'Quote strings only' configuration was ignored when downloading the result set.
  | `Issue #8988 <https://github.com/pgadmin-org/pgadmin4/issues/8988>`_ - Fixed an issue where tools settings changed by the users were not restored on application relaunch.
  | `Issue #9258 <https://github.com/pgadmin-org/pgadmin4/issues/9258>`_ - Fixed an issue where modifying a shared server incorrectly updated the original server details.
  | `Issue #9484 <https://github.com/pgadmin-org/pgadmin4/issues/9484>`_ - Fixed an issue where a long name in ERD table node was not breaking into multiple lines.
  | `Issue #9486 <https://github.com/pgadmin-org/pgadmin4/issues/9486>`_ - Fixed an issue where column comments were not displayed in the SQL tab for materialised views.
  | `Issue #9572 <https://github.com/pgadmin-org/pgadmin4/issues/9572>`_ - Fix an issue where deployment of helm chart crashing with operation not permitted.
  | `Issue #9583 <https://github.com/pgadmin-org/pgadmin4/issues/9583>`_ - Fix translation compilation.
  | `Issue #9649 <https://github.com/pgadmin-org/pgadmin4/issues/9649>`_ - Fix broken checkbox selection in backup dialog objects tree.
  | `Issue #9651 <https://github.com/pgadmin-org/pgadmin4/issues/9651>`_ - Fixed an issue in file dialog where rename was not working.


