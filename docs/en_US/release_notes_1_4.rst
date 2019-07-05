***********
Version 1.4
***********

Release date: 2017-04-13

This release contains a number of features and fixes reported since the release
of pgAdmin4 1.3.

Features
********

| `Issue #2232 <https://redmine.postgresql.org/issues/2232>`_ - Add the ability to gray-out/disable the "Save Password" option when creating a connection to a server
| `Issue #2261 <https://redmine.postgresql.org/issues/2261>`_ - Display table DDL for Greenplum in SQL tab
| `Issue #2320 <https://redmine.postgresql.org/issues/2163>`_ - Added German translation

Bug fixes
*********

| `Issue #2077 <https://redmine.postgresql.org/issues/2077>`_ - Add missing "Run Now" option for pgAdmin jobs
| `Issue #2105 <https://redmine.postgresql.org/issues/2105>`_ - Fix validation on the table dialogue so the Save button isn't enabled if the name is removed and autovac custom settings are enabled
| `Issue #2145 <https://redmine.postgresql.org/issues/2145>`_ - Resolve the issue for restoring the table from the backup
| `Issue #2187 <https://redmine.postgresql.org/issues/2187>`_ - Ensure the web/ directory is cleared before upgrading Windows installations
| `Issue #2190 <https://redmine.postgresql.org/issues/2190>`_ - Allow users to select UI language at login or from Preferences rather than unpredictable behaviour from browsers
| `Issue #2226 <https://redmine.postgresql.org/issues/2226>`_ - Show tooltips for disabled buttons to help user learning
| `Issue #2241 <https://redmine.postgresql.org/issues/2241>`_ - Fix numeric control validation in nested schemas
| `Issue #2243 <https://redmine.postgresql.org/issues/2243>`_ - Fix dropping of databases with Unicode names
| `Issue #2244 <https://redmine.postgresql.org/issues/2244>`_ - Prevent an error being displayed if the user views data on a table with no columns
| `Issue #2246 <https://redmine.postgresql.org/issues/2246>`_ - Add missing braces to reverse engineered SQL header block for Functions
| `Issue #2258 <https://redmine.postgresql.org/issues/2258>`_ - Fix handling of DATERANGE[] type
| `Issue #2264 <https://redmine.postgresql.org/issues/2264>`_ - Resolve error message *ExtDeprecationWarning* displayed on new pgAdmin4 setup for Python 3.4 on ubuntu 14.04 Linux 64
| `Issue #2265 <https://redmine.postgresql.org/issues/2265>`_ - Resolved import/Export issue for a table
| `Issue #2274 <https://redmine.postgresql.org/issues/2274>`_ - Properly handle truncated table names
| `Issue #2277 <https://redmine.postgresql.org/issues/2277>`_ - Resolved various file-system encoding/decoding related cases
| `Issue #2281 <https://redmine.postgresql.org/issues/2281>`_ - Ensure menus are updated after disconnecting a server
| `Issue #2283 <https://redmine.postgresql.org/issues/2283>`_ - Check if cell is in multiselect mode before setting default selection of multiple values
| `Issue #2287 <https://redmine.postgresql.org/issues/2287>`_ - Properly handle EXPLAIN queries entered directly by the user in the Query Tool
| `Issue #2291 <https://redmine.postgresql.org/issues/2291>`_ - Fix error highlighting in the Query Tool
| `Issue #2299 <https://redmine.postgresql.org/issues/2299>`_ - Fix usage of QString
| `Issue #2303 <https://redmine.postgresql.org/issues/2303>`_ - Fix ascending/descending sort order in backgrid while clicking on the headers
| `Issue #2304 <https://redmine.postgresql.org/issues/2304>`_ - Resolve the issue for restoring the table from the backup
| `Issue #2305 <https://redmine.postgresql.org/issues/2305>`_ - Resolve the issue where Generic function qtLiteral was not adapting values properly when they contain non ascii characters
| `Issue #2310 <https://redmine.postgresql.org/issues/2310>`_ - Fix Dialog Help where Query Tool/Debugger opens in new browser tab
| `Issue #2319 <https://redmine.postgresql.org/issues/2319>`_ - Resolve issue where Click on pgAdmin4 logo leads to unauthorized error
| `Issue #2321 <https://redmine.postgresql.org/issues/2321>`_ - Improved functionality of browser tree when adding new nodes if parent collection node has not loaded
| `Issue #2330 <https://redmine.postgresql.org/issues/2330>`_ - Ensure the Query Tool displays but does not render HTML returned by the server in the results grid
