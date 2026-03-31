************
Version 9.14
************

Release date: 2026-04-02

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.13.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.2


New features
************

  | `Issue #4011 <https://github.com/pgadmin-org/pgadmin4/issues/4011>`_ -  Added support to download binary data from result grid.
  | `Issue #9703 <https://github.com/pgadmin-org/pgadmin4/issues/9703>`_ -  Added support for custom LLM provider URLs for OpenAI and Anthropic, allowing use of OpenAI-compatible providers such as LM Studio, EXO, and LiteLLM.
  | `Issue #9709 <https://github.com/pgadmin-org/pgadmin4/issues/9709>`_ -  Fixed an issue where AI features (AI Assistant tab, AI Reports menus, and AI Preferences) were visible in the UI even when LLM_ENABLED is set to False.
  | `Issue #9738 <https://github.com/pgadmin-org/pgadmin4/issues/9738>`_ -  Allow copying of text from the AI Assistant chat panel.

Housekeeping
************

Bug fixes
*********

  | `Issue #8992 <https://github.com/pgadmin-org/pgadmin4/issues/8992>`_ -  Fixed an issue where selecting all in the Query Tool's Messages tab would select the entire page content.
  | `Issue #9279 <https://github.com/pgadmin-org/pgadmin4/issues/9279>`_ -  Fixed an issue where OAuth2 authentication fails with 'object has no attribute' if OAUTH2_AUTO_CREATE_USER is False.
  | `Issue #9392 <https://github.com/pgadmin-org/pgadmin4/issues/9392>`_ -  Ensure that the Geometry Viewer refreshes when re-running queries or switching geometry columns, preventing stale data from being displayed.
  | `Issue #9457 <https://github.com/pgadmin-org/pgadmin4/issues/9457>`_ -  Fixed Process Watcher garbled text on Windows with non-UTF-8 locales.
  | `Issue #9570 <https://github.com/pgadmin-org/pgadmin4/issues/9570>`_ -  Fixed an issue where ALT+F5 for executing a query in the Query Tool shows a crosshair cursor icon for rectangular selection.
  | `Issue #9648 <https://github.com/pgadmin-org/pgadmin4/issues/9648>`_ -  Fixed an issue where the default fillfactor value for B-tree indexes was incorrect.
  | `Issue #9694 <https://github.com/pgadmin-org/pgadmin4/issues/9694>`_ -  Fixed an issue where AI Reports are grayed out after setting an API key by auto-selecting the default provider.
  | `Issue #9696 <https://github.com/pgadmin-org/pgadmin4/issues/9696>`_ -  Fixed an issue where AI Assistant does not notify that No API Key or Provider is Set.
  | `Issue #9702 <https://github.com/pgadmin-org/pgadmin4/issues/9702>`_ -  Fixed misleading AI activity messages that could be mistaken for actual database operations.
  | `Issue #9719 <https://github.com/pgadmin-org/pgadmin4/issues/9719>`_ -  Fixed an issue where AI Reports fail with OpenAI models that do not support the temperature parameter.
  | `Issue #9721 <https://github.com/pgadmin-org/pgadmin4/issues/9721>`_ -  Fixed an issue where permissions page is not completely accessible on full scroll.
  | `Issue #9729 <https://github.com/pgadmin-org/pgadmin4/issues/9729>`_ -  Fixed an issue where some LLM models would not use database tools in the AI assistant, instead returning text descriptions of tool calls.
  | `Issue #9732 <https://github.com/pgadmin-org/pgadmin4/issues/9732>`_ -  Improve the AI Assistant user prompt to be more descriptive of the actual functionality.
  | `Issue #9734 <https://github.com/pgadmin-org/pgadmin4/issues/9734>`_ -  Fixed an issue where LLM responses are not streamed or rendered properly in the AI Assistant.
  | `Issue #9736 <https://github.com/pgadmin-org/pgadmin4/issues/9736>`_ -  Fix an issue where the AI Assistant was not retaining conversation context between messages, with chat history compaction to manage token budgets.
  | `Issue #9740 <https://github.com/pgadmin-org/pgadmin4/issues/9740>`_ -  Fixed an issue where the AI Assistant input textbox sometimes swallows the first character of input.
  | `Issue #9758 <https://github.com/pgadmin-org/pgadmin4/issues/9758>`_ -  Clarify where the LLM API key files should be.
  | `Issue #9789 <https://github.com/pgadmin-org/pgadmin4/issues/9789>`_ -  Fixed an issue where the Query tool kept prompting for a password when using a shared server.
  | `Issue #9795 <https://github.com/pgadmin-org/pgadmin4/issues/9795>`_ -  Support /v1/responses for OpenAI models.
