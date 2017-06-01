***********
Version 1.4
***********

Release date: 2017-04-13

This release contains a number of features and fixes reported since the release of pgAdmin4 1.3.

Features
********

| `Feature #2232 <https://redmine.postgresql.org/issues/2232>`_ - Add the ability to gray-out/disable the "Save Password" option when creating a connection to a server
| `Feature #2261 <https://redmine.postgresql.org/issues/2261>`_ - Display table DDL for Greenplum in SQL tab
| `Feature #2320 <https://redmine.postgresql.org/issues/2163>`_ - Added German translation

Bug fixes
*********

| `Bug #2077 <https://redmine.postgresql.org/issues/2077>`_ - Add missing "Run Now" option for pgAdmin jobs
| `Bug #2105 <https://redmine.postgresql.org/issues/2105>`_ - Fix validation on the table dialogue so the Save button isn't enabled if the name is removed and autovac custom settings are enabled
| `Bug #2145 <https://redmine.postgresql.org/issues/2145>`_ - Resolve the issue for restoring the table from the backup
| `Bug #2187 <https://redmine.postgresql.org/issues/2187>`_ - Ensure the web/ directory is cleared before upgrading Windows installations
| `Bug #2190 <https://redmine.postgresql.org/issues/2190>`_ - Allow users to select UI language at login or from Preferences rather than unpredictable behaviour from browsers
| `Bug #2226 <https://redmine.postgresql.org/issues/2226>`_ - Show tooltips for disabled buttons to help user learning
| `Bug #2241 <https://redmine.postgresql.org/issues/2241>`_ - Fix numeric control validation in nested schemas
| `Bug #2243 <https://redmine.postgresql.org/issues/2243>`_ - Fix dropping of databases with Unicode names
| `Bug #2244 <https://redmine.postgresql.org/issues/2244>`_ - Prevent an error being displayed if the user views data on a table with no columns
| `Bug #2246 <https://redmine.postgresql.org/issues/2246>`_ - Add missing braces to reverse engineered SQL header block for Functions
| `Bug #2258 <https://redmine.postgresql.org/issues/2258>`_ - Fix handling of DATERANGE[] type
| `Bug #2264 <https://redmine.postgresql.org/issues/2264>`_ - Resolve error message *ExtDeprecationWarning* displayed on new pgAdmin4 setup for Python 3.4 on ubuntu 14.04 Linux 64
| `Bug #2265 <https://redmine.postgresql.org/issues/2265>`_ - Resolved import/Export issue for a table
| `Bug #2274 <https://redmine.postgresql.org/issues/2274>`_ - Properly handle truncated table names
| `Bug #2277 <https://redmine.postgresql.org/issues/2277>`_ - Resolved various file-system encoding/decoding related cases
| `Bug #2281 <https://redmine.postgresql.org/issues/2281>`_ - Ensure menus are updated after disconnecting a server
| `Bug #2283 <https://redmine.postgresql.org/issues/2283>`_ - Check if cell is in multiselect mode before setting default selection of multiple values
| `Bug #2287 <https://redmine.postgresql.org/issues/2287>`_ - Properly handle EXPLAIN queries entered directly by the user in the query tool
| `Bug #2291 <https://redmine.postgresql.org/issues/2291>`_ - Fix error highlighting in the query tool
| `Bug #2299 <https://redmine.postgresql.org/issues/2299>`_ - Fix usage of QString
| `Bug #2303 <https://redmine.postgresql.org/issues/2303>`_ - Fix ascending/descending sort order in backgrid while clicking on the headers
| `Bug #2304 <https://redmine.postgresql.org/issues/2304>`_ - Resolve the issue for restoring the table from the backup
| `Bug #2305 <https://redmine.postgresql.org/issues/2305>`_ - Resolve the issue where Generic function qtLiteral was not adapting values properly when they contain non ascii characters
| `Bug #2310 <https://redmine.postgresql.org/issues/2310>`_ - Fix Dialog Help where query tool/Debugger opens in new browser tab
| `Bug #2319 <https://redmine.postgresql.org/issues/2319>`_ - Resolve issue where Click on pgAdmin4 logo leads to unauthorized error
| `Bug #2321 <https://redmine.postgresql.org/issues/2321>`_ - Improved functionality of browser tree when adding new nodes if parent collection node has not loaded
| `Bug #2330 <https://redmine.postgresql.org/issues/2330>`_ - Ensure the query tool displays but does not render HTML returned by the server in the results grid
