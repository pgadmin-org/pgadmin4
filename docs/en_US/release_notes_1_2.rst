***********
Version 1.2
***********

Release date: 2017-02-10

This release contains a number of features and fixes reported since the release of pgAdmin4 1.1.

Features
********

| `Feature #1375 <https://redmine.postgresql.org/issues/1375>`_ - Migrate the runtime to QtWebEngine from QtWebKit
| `Feature #1765 <https://redmine.postgresql.org/issues/1765>`_ - Find and replace functionality with regexp and group replacement
| `Feature #1789 <https://redmine.postgresql.org/issues/1789>`_ - Column width of data output panel should fit to data (as pgAdmin III)
| `Feature #1790 <https://redmine.postgresql.org/issues/1790>`_ - [Web] Support setting a field's value to "null"
| `Feature #1848 <https://redmine.postgresql.org/issues/1848>`_ - macOS appbundle is missing postgresql binaries for import etc.
| `Feature #1910 <https://redmine.postgresql.org/issues/1910>`_ - Remember last used directory in the file manager
| `Feature #1911 <https://redmine.postgresql.org/issues/1911>`_ - Direct path navigation in the file manager
| `Feature #1922 <https://redmine.postgresql.org/issues/1922>`_ - Improve handling of corrupt configuration databases
| `Feature #1963 <https://redmine.postgresql.org/issues/1963>`_ - Add a Chinese (Simplified) translation
| `Feature #1964 <https://redmine.postgresql.org/issues/1964>`_ - Create a docs tarball along with the source tarball
| `Feature #2025 <https://redmine.postgresql.org/issues/2025>`_ - Allow the SQL Editors to word-wrap
| `Feature #2124 <https://redmine.postgresql.org/issues/2124>`_ - Create a template loader to simplify SQL template location, and remove duplicate templates

Bug fixes
*********

| `Bug #1227 <https://redmine.postgresql.org/issues/1227>`_ - Display improved error message for Debugger listener starting error and reset between executions
| `Bug #1267 <https://redmine.postgresql.org/issues/1267>`_ - Fix issue where MINIFY_HTML doesn't work with the docs
| `Bug #1364 <https://redmine.postgresql.org/issues/1364>`_ - Ensure dialogue control buttons are consistent
| `Bug #1394 <https://redmine.postgresql.org/issues/1394>`_ - Fix Table dialogue column specification issues
| `Bug #1432 <https://redmine.postgresql.org/issues/1432>`_ - Enhanced OSX File Browser
| `Bug #1585 <https://redmine.postgresql.org/issues/1585>`_ - Cannot save scripts to the network
| `Bug #1599 <https://redmine.postgresql.org/issues/1599>`_ - Ensure the grant wizard works with objects with special characters in the name
| `Bug #1603 <https://redmine.postgresql.org/issues/1603>`_ - Fix quoting of objects names for external utilities.
| `Bug #1679 <https://redmine.postgresql.org/issues/1679>`_ - Re-engineer the background process executor to avoid using sqlite as some builds of components it relies on do not support working in forked children
| `Bug #1680 <https://redmine.postgresql.org/issues/1680>`_ - Render column headers at the correct width in the query tool under Firefox
| `Bug #1729 <https://redmine.postgresql.org/issues/1729>`_ - Improve display of role options
| `Bug #1730 <https://redmine.postgresql.org/issues/1730>`_ - Improve the display of role membership on both the properties panel and role dialogue
| `Bug #1745 <https://redmine.postgresql.org/issues/1745>`_ - Ensure breakpoints are cleared properly when working with Debugger
| `Bug #1747 <https://redmine.postgresql.org/issues/1747>`_ - Add newly created triggers to the treeview
| `Bug #1780 <https://redmine.postgresql.org/issues/1780>`_ - Properly size the SQL Editor gutter as the width of the line numbers increases
| `Bug #1792 <https://redmine.postgresql.org/issues/1792>`_ - List files and folders alphabetically
| `Bug #1800 <https://redmine.postgresql.org/issues/1800>`_ - Handle the template property on databases appropriately
| `Bug #1801 <https://redmine.postgresql.org/issues/1801>`_ - Handle databases with datallowconn == false
| `Bug #1807 <https://redmine.postgresql.org/issues/1807>`_ - Properly detect when files have changed in the query tool and set flag accordingly
| `Bug #1830 <https://redmine.postgresql.org/issues/1830>`_ - Fix a SQL error when reverse-engineering ROLE SQL on EPAS servers
| `Bug #1832 <https://redmine.postgresql.org/issues/1832>`_ - Prevent attempts to access what may be an empty list in Dependancies tab
| `Bug #1840 <https://redmine.postgresql.org/issues/1840>`_ - Enable/disable NULLs and ASC/DESC options for index columns and exclusion constraints appropriately
| `Bug #1842 <https://redmine.postgresql.org/issues/1842>`_ - Show index columns in the correct order in RE-SQL
| `Bug #1855 <https://redmine.postgresql.org/issues/1855>`_ - Ensure dialogue panels show their errors themselves, and not in the properties panel when creating Trigger Function
| `Bug #1865 <https://redmine.postgresql.org/issues/1865>`_ - Properly schema qualify domains when reverse engineering SQL
| `Bug #1874 <https://redmine.postgresql.org/issues/1874>`_ - Add file resources to the windows runtime
| `Bug #1893 <https://redmine.postgresql.org/issues/1893>`_ - Fix refreshing of Unique constraints
| `Bug #1896 <https://redmine.postgresql.org/issues/1896>`_ - Use the correct OID for retrieving properties of freshly created exclusion constraints
| `Bug #1899 <https://redmine.postgresql.org/issues/1899>`_ - Properly quote role names when specifying function ownership
| `Bug #1909 <https://redmine.postgresql.org/issues/1909>`_ - Handle startup errors more gracefully in the runtime
| `Bug #1912 <https://redmine.postgresql.org/issues/1912>`_ - Properly format arguments passed by triggers to functions
| `Bug #1919 <https://redmine.postgresql.org/issues/1919>`_ - Ensure all changes to rows are stored in the data editor
| `Bug #1924 <https://redmine.postgresql.org/issues/1924>`_ - Ensure the check_option is only set when editing views when appropriate
| `Bug #1936 <https://redmine.postgresql.org/issues/1936>`_ - Don't strip \r\n from "Download as CSV" batches of rows, as it leads to malformed data
| `Bug #1937 <https://redmine.postgresql.org/issues/1937>`_ - Generate mSQL for new schemas correctly
| `Bug #1938 <https://redmine.postgresql.org/issues/1938>`_ - Fix sorting of numerics in the statistics grids
| `Bug #1939 <https://redmine.postgresql.org/issues/1939>`_ - Updated dynamic default for the window size (90% x 90%)
| `Bug #1949 <https://redmine.postgresql.org/issues/1949>`_ - Ensure trigger function names are schema qualified in trigger RE-SQL
| `Bug #1951 <https://redmine.postgresql.org/issues/1951>`_ - Fix issue where nnable to browse table columns when oid values exceeed max int
| `Bug #1953 <https://redmine.postgresql.org/issues/1953>`_ - Add display messages and notices received in the query tool
| `Bug #1961 <https://redmine.postgresql.org/issues/1961>`_ - Fix upgrade check on Python 3
| `Bug #1962 <https://redmine.postgresql.org/issues/1962>`_ - Ensure treeview collection nodes are translated in the UI
| `Bug #1967 <https://redmine.postgresql.org/issues/1967>`_ - Store layout changes on each adjustment
| `Bug #1976 <https://redmine.postgresql.org/issues/1976>`_ - Prevent users selecting elements of the UI that shouldn't be selectable
| `Bug #1979 <https://redmine.postgresql.org/issues/1979>`_ - Deal with Function arguments correctly in the properties dialogue
| `Bug #1986 <https://redmine.postgresql.org/issues/1986>`_ - Fix various encoding issues with multibyte paths and filenames resulting in empty file save
| `Bug #1992 <https://redmine.postgresql.org/issues/1992>`_ - Quote identifiers correctly in auto-complete
| `Bug #1994 <https://redmine.postgresql.org/issues/1994>`_ - Update to show modifications in edit grid
| `Bug #2000 <https://redmine.postgresql.org/issues/2000>`_ - Allow setting of effective_io_concurrency on tablespaces in 9.6+
| `Bug #2005 <https://redmine.postgresql.org/issues/2005>`_ - Fix various mis-spellings of VACUUM
| `Bug #2006 <https://redmine.postgresql.org/issues/2006>`_ - Fix error when modifying table name or set schema on tables with postgis geometry column
| `Bug #2007 <https://redmine.postgresql.org/issues/2007>`_ - Correctly sort rows by the pkey when viewing first/last 100
| `Bug #2009 <https://redmine.postgresql.org/issues/2009>`_ - Reset the column list properly if the access method is changed on an index to ensure error handling works correctly
| `Bug #2012 <https://redmine.postgresql.org/issues/2012>`_ - Prevent attempts to create server groups with no name
| `Bug #2015 <https://redmine.postgresql.org/issues/2015>`_ - Enable trigger option when user tries to change Row trigger value through properties section
| `Bug #2024 <https://redmine.postgresql.org/issues/2024>`_ - Properly handle setting comments and other options on databases with allowconn = False
| `Bug #2026 <https://redmine.postgresql.org/issues/2026>`_ - Improve detection of the pldbgapi extension and functions before allowing debugging
| `Bug #2027 <https://redmine.postgresql.org/issues/2027>`_ - Fix inconsistent table styling
| `Bug #2028 <https://redmine.postgresql.org/issues/2028>`_ - Fix display of double scrollbars on the grant wizard
| `Bug #2032 <https://redmine.postgresql.org/issues/2032>`_ - Fix time formatting on dashboards
| `Bug #2033 <https://redmine.postgresql.org/issues/2033>`_ - Show icons for unique and exclusion constraints in the dependency/dependents panels
| `Bug #2045 <https://redmine.postgresql.org/issues/2045>`_ - Update copyright year on doc page
| `Bug #2046 <https://redmine.postgresql.org/issues/2046>`_ - Fix error when setting up regression on Windows for pgadmin4
| `Bug #2047 <https://redmine.postgresql.org/issues/2047>`_ - Ensure dialogues cannot be moved under the navbar
| `Bug #2061 <https://redmine.postgresql.org/issues/2061>`_ - Enable/disable NULLs and ASC/DESC options for index columns and exclusion constraints appropriately
| `Bug #2065 <https://redmine.postgresql.org/issues/2065>`_ - Improve display of columns of exclusion contraints and foreign keys in the properties lists
| `Bug #2069 <https://redmine.postgresql.org/issues/2069>`_ - Correct tablespace displayed in table properties
| `Bug #2076 <https://redmine.postgresql.org/issues/2076>`_ - Handle sized time/timestamp columns correctly
| `Bug #2109 <https://redmine.postgresql.org/issues/2109>`_ - Update copyright year
| `Bug #2110 <https://redmine.postgresql.org/issues/2110>`_ - Handle saved directories that no longer exist gracefully
| `Bug #2112 <https://redmine.postgresql.org/issues/2026>`_ - Enable comments on Initial database through right Click
| `Bug #2133 <https://redmine.postgresql.org/issues/2133>`_ - Fix display of graphical query plans for UPDATE/DELETE queries
| `Bug #2138 <https://redmine.postgresql.org/issues/2138>`_ - Fix display of zeros in read-only grid editors
| `Bug #2139 <https://redmine.postgresql.org/issues/2139>`_ - Fixed issue causing Message (Connection to the server has been lost.) displayed with Materialized view and view under sql tab
| `Bug #2152 <https://redmine.postgresql.org/issues/2152>`_ - Fix handling of "char" columns
| `Bug #2156 <https://redmine.postgresql.org/issues/2156>`_ - Added compatibility fixes for newer versions of Jinja2 (e.g. 2.9.5+)
