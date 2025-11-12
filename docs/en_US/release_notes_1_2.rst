***********
Version 1.2
***********

Release date: 2017-02-10

This release contains a number of features and fixes reported since the release
of pgAdmin4 1.1.

Features
********

| `Issue #1375 <https://redmine.postgresql.org/issues/1375>`_ - Migrate the runtime to QtWebEngine from QtWebKit
| `Issue #1765 <https://redmine.postgresql.org/issues/1765>`_ - Find and replace functionality with regexp and group replacement
| `Issue #1789 <https://redmine.postgresql.org/issues/1789>`_ - Column width of data output panel should fit to data (as pgAdmin III)
| `Issue #1790 <https://redmine.postgresql.org/issues/1790>`_ - [Web] Support setting a field's value to "null"
| `Issue #1848 <https://redmine.postgresql.org/issues/1848>`_ - macOS appbundle is missing postgresql binaries for import etc.
| `Issue #1910 <https://redmine.postgresql.org/issues/1910>`_ - Remember last used directory in the file manager
| `Issue #1911 <https://redmine.postgresql.org/issues/1911>`_ - Direct path navigation in the file manager
| `Issue #1922 <https://redmine.postgresql.org/issues/1922>`_ - Improve handling of corrupt configuration databases
| `Issue #1963 <https://redmine.postgresql.org/issues/1963>`_ - Add a Chinese (Simplified) translation
| `Issue #1964 <https://redmine.postgresql.org/issues/1964>`_ - Create a docs tarball along with the source tarball
| `Issue #2025 <https://redmine.postgresql.org/issues/2025>`_ - Allow the SQL Editors to word-wrap
| `Issue #2124 <https://redmine.postgresql.org/issues/2124>`_ - Create a template loader to simplify SQL template location, and remove duplicate templates

Bug fixes
*********

| `Issue #1227 <https://redmine.postgresql.org/issues/1227>`_ - Display improved error message for Debugger listener starting error and reset between executions
| `Issue #1267 <https://redmine.postgresql.org/issues/1267>`_ - Fix issue where MINIFY_HTML doesn't work with the docs
| `Issue #1364 <https://redmine.postgresql.org/issues/1364>`_ - Ensure dialogue control buttons are consistent
| `Issue #1394 <https://redmine.postgresql.org/issues/1394>`_ - Fix Table dialogue column specification issues
| `Issue #1432 <https://redmine.postgresql.org/issues/1432>`_ - Enhanced OSX File Browser
| `Issue #1585 <https://redmine.postgresql.org/issues/1585>`_ - Cannot save scripts to the network
| `Issue #1599 <https://redmine.postgresql.org/issues/1599>`_ - Ensure the grant wizard works with objects with special characters in the name
| `Issue #1603 <https://redmine.postgresql.org/issues/1603>`_ - Fix quoting of objects names for external utilities.
| `Issue #1679 <https://redmine.postgresql.org/issues/1679>`_ - Re-engineer the background process executor to avoid using sqlite as some builds of components it relies on do not support working in forked children
| `Issue #1680 <https://redmine.postgresql.org/issues/1680>`_ - Render column headers at the correct width in the Query Tool under Firefox
| `Issue #1729 <https://redmine.postgresql.org/issues/1729>`_ - Improve display of role options
| `Issue #1730 <https://redmine.postgresql.org/issues/1730>`_ - Improve the display of role membership on both the properties panel and role dialogue
| `Issue #1745 <https://redmine.postgresql.org/issues/1745>`_ - Ensure breakpoints are cleared properly when working with Debugger
| `Issue #1747 <https://redmine.postgresql.org/issues/1747>`_ - Add newly created triggers to the treeview
| `Issue #1780 <https://redmine.postgresql.org/issues/1780>`_ - Properly size the SQL Editor gutter as the width of the line numbers increases
| `Issue #1792 <https://redmine.postgresql.org/issues/1792>`_ - List files and folders alphabetically
| `Issue #1800 <https://redmine.postgresql.org/issues/1800>`_ - Handle the template property on databases appropriately
| `Issue #1801 <https://redmine.postgresql.org/issues/1801>`_ - Handle databases with datallowconn == false
| `Issue #1807 <https://redmine.postgresql.org/issues/1807>`_ - Properly detect when files have changed in the Query Tool and set flag accordingly
| `Issue #1830 <https://redmine.postgresql.org/issues/1830>`_ - Fix a SQL error when reverse-engineering ROLE SQL on EPAS servers
| `Issue #1832 <https://redmine.postgresql.org/issues/1832>`_ - Prevent attempts to access what may be an empty list in Dependancies tab
| `Issue #1840 <https://redmine.postgresql.org/issues/1840>`_ - Enable/disable NULLs and ASC/DESC options for index columns and exclusion constraints appropriately
| `Issue #1842 <https://redmine.postgresql.org/issues/1842>`_ - Show index columns in the correct order in RE-SQL
| `Issue #1855 <https://redmine.postgresql.org/issues/1855>`_ - Ensure dialogue panels show their errors themselves, and not in the properties panel when creating Trigger Function
| `Issue #1865 <https://redmine.postgresql.org/issues/1865>`_ - Properly schema qualify domains when reverse engineering SQL
| `Issue #1874 <https://redmine.postgresql.org/issues/1874>`_ - Add file resources to the windows runtime
| `Issue #1893 <https://redmine.postgresql.org/issues/1893>`_ - Fix refreshing of Unique constraints
| `Issue #1896 <https://redmine.postgresql.org/issues/1896>`_ - Use the correct OID for retrieving properties of freshly created exclusion constraints
| `Issue #1899 <https://redmine.postgresql.org/issues/1899>`_ - Properly quote role names when specifying function ownership
| `Issue #1909 <https://redmine.postgresql.org/issues/1909>`_ - Handle startup errors more gracefully in the runtime
| `Issue #1912 <https://redmine.postgresql.org/issues/1912>`_ - Properly format arguments passed by triggers to functions
| `Issue #1919 <https://redmine.postgresql.org/issues/1919>`_ - Ensure all changes to rows are stored in the data editor
| `Issue #1924 <https://redmine.postgresql.org/issues/1924>`_ - Ensure the check_option is only set when editing views when appropriate
| `Issue #1936 <https://redmine.postgresql.org/issues/1936>`_ - Don't strip \r\n from "Download as CSV" batches of rows, as it leads to malformed data
| `Issue #1937 <https://redmine.postgresql.org/issues/1937>`_ - Generate mSQL for new schemas correctly
| `Issue #1938 <https://redmine.postgresql.org/issues/1938>`_ - Fix sorting of numerics in the statistics grids
| `Issue #1939 <https://redmine.postgresql.org/issues/1939>`_ - Updated dynamic default for the window size (90% x 90%)
| `Issue #1949 <https://redmine.postgresql.org/issues/1949>`_ - Ensure trigger function names are schema qualified in trigger RE-SQL
| `Issue #1951 <https://redmine.postgresql.org/issues/1951>`_ - Fix issue where nnable to browse table columns when oid values exceeed max int
| `Issue #1953 <https://redmine.postgresql.org/issues/1953>`_ - Add display messages and notices received in the Query Tool
| `Issue #1961 <https://redmine.postgresql.org/issues/1961>`_ - Fix upgrade check on Python 3
| `Issue #1962 <https://redmine.postgresql.org/issues/1962>`_ - Ensure treeview collection nodes are translated in the UI
| `Issue #1967 <https://redmine.postgresql.org/issues/1967>`_ - Store layout changes on each adjustment
| `Issue #1976 <https://redmine.postgresql.org/issues/1976>`_ - Prevent users selecting elements of the UI that shouldn't be selectable
| `Issue #1979 <https://redmine.postgresql.org/issues/1979>`_ - Deal with Function arguments correctly in the properties dialogue
| `Issue #1986 <https://redmine.postgresql.org/issues/1986>`_ - Fix various encoding issues with multibyte paths and filenames resulting in empty file save
| `Issue #1992 <https://redmine.postgresql.org/issues/1992>`_ - Quote identifiers correctly in auto-complete
| `Issue #1994 <https://redmine.postgresql.org/issues/1994>`_ - Update to show modifications in edit grid
| `Issue #2000 <https://redmine.postgresql.org/issues/2000>`_ - Allow setting of effective_io_concurrency on tablespaces in 9.6+
| `Issue #2005 <https://redmine.postgresql.org/issues/2005>`_ - Fix various mis-spellings of VACUUM
| `Issue #2006 <https://redmine.postgresql.org/issues/2006>`_ - Fix error when modifying table name or set schema on tables with postgis geometry column
| `Issue #2007 <https://redmine.postgresql.org/issues/2007>`_ - Correctly sort rows by the pkey when viewing first/last 100
| `Issue #2009 <https://redmine.postgresql.org/issues/2009>`_ - Reset the column list properly if the access method is changed on an index to ensure error handling works correctly
| `Issue #2012 <https://redmine.postgresql.org/issues/2012>`_ - Prevent attempts to create server groups with no name
| `Issue #2015 <https://redmine.postgresql.org/issues/2015>`_ - Enable trigger option when user tries to change Row trigger value through properties section
| `Issue #2024 <https://redmine.postgresql.org/issues/2024>`_ - Properly handle setting comments and other options on databases with allowconn = False
| `Issue #2026 <https://redmine.postgresql.org/issues/2026>`_ - Improve detection of the pldbgapi extension and functions before allowing debugging
| `Issue #2027 <https://redmine.postgresql.org/issues/2027>`_ - Fix inconsistent table styling
| `Issue #2028 <https://redmine.postgresql.org/issues/2028>`_ - Fix display of double scrollbars on the grant wizard
| `Issue #2032 <https://redmine.postgresql.org/issues/2032>`_ - Fix time formatting on dashboards
| `Issue #2033 <https://redmine.postgresql.org/issues/2033>`_ - Show icons for unique and exclusion constraints in the dependency/dependents panels
| `Issue #2045 <https://redmine.postgresql.org/issues/2045>`_ - Update copyright year on doc page
| `Issue #2046 <https://redmine.postgresql.org/issues/2046>`_ - Fix error when setting up regression on Windows for pgadmin4
| `Issue #2047 <https://redmine.postgresql.org/issues/2047>`_ - Ensure dialogues cannot be moved under the navbar
| `Issue #2061 <https://redmine.postgresql.org/issues/2061>`_ - Enable/disable NULLs and ASC/DESC options for index columns and exclusion constraints appropriately
| `Issue #2065 <https://redmine.postgresql.org/issues/2065>`_ - Improve display of columns of exclusion contraints and foreign keys in the properties lists
| `Issue #2069 <https://redmine.postgresql.org/issues/2069>`_ - Correct tablespace displayed in table properties
| `Issue #2076 <https://redmine.postgresql.org/issues/2076>`_ - Handle sized time/timestamp columns correctly
| `Issue #2109 <https://redmine.postgresql.org/issues/2109>`_ - Update copyright year
| `Issue #2110 <https://redmine.postgresql.org/issues/2110>`_ - Handle saved directories that no longer exist gracefully
| `Issue #2112 <https://redmine.postgresql.org/issues/2026>`_ - Enable comments on Initial database through right Click
| `Issue #2133 <https://redmine.postgresql.org/issues/2133>`_ - Fix display of graphical query plans for UPDATE/DELETE queries
| `Issue #2138 <https://redmine.postgresql.org/issues/2138>`_ - Fix display of zeros in read-only grid editors
| `Issue #2139 <https://redmine.postgresql.org/issues/2139>`_ - Fixed issue causing Message (Connection to the server has been lost.) displayed with Materialized view and view under sql tab
| `Issue #2152 <https://redmine.postgresql.org/issues/2152>`_ - Fix handling of "char" columns
| `Issue #2156 <https://redmine.postgresql.org/issues/2156>`_ - Added compatibility fixes for newer versions of Jinja2 (e.g. 2.9.5+)
