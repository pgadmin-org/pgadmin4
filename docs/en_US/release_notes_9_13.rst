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
  | `Issue #9641 <https://github.com/pgadmin-org/pgadmin4/issues/9641>`_ - Core LLM integration infrastructure to allow pgAdmin to connect to AI providers.

Housekeeping
************

Bug fixes
*********

  | `Issue #7578 <https://github.com/pgadmin-org/pgadmin4/issues/7578>`_ - Fixed an issue where the 'Quote strings only' configuration was ignored when downloading the result set.
  | `Issue #8988 <https://github.com/pgadmin-org/pgadmin4/issues/8988>`_ - Fixed an issue where tools settings changed by the users were not restored on application relaunch.
  | `Issue #9484 <https://github.com/pgadmin-org/pgadmin4/issues/9484>`_ - Fixed an issue where a long name in ERD table node was not breaking into multiple lines.
  | `Issue #9486 <https://github.com/pgadmin-org/pgadmin4/issues/9486>`_ - Fixed an issue where column comments were not displayed in the SQL tab for materialised views.
  | `Issue #9572 <https://github.com/pgadmin-org/pgadmin4/issues/9572>`_ - Fix an issue where deployment of helm chart crashing with operation not permitted.


