***********
Version 1.3
***********

Release date: 2017-03-10

This release contains a number of features and fixes reported since the release
of pgAdmin4 1.2.

Features
********

| `Issue #2036 <https://redmine.postgresql.org/issues/2036>`_ - Query tool efficiency - SlickGrid result set format efficiency
| `Issue #2038 <https://redmine.postgresql.org/issues/2038>`_ - Query tool efficiency - Incremental back off when polling
| `Issue #2163 <https://redmine.postgresql.org/issues/2163>`_ - Make syntax highlighting more visible
| `Issue #2210 <https://redmine.postgresql.org/issues/2210>`_ - Build a universal Python wheel instead of per-python-version ones
| `Issue #2215 <https://redmine.postgresql.org/issues/2215>`_ - Improve visibility of syntax highlighting colours

Bug fixes
*********

| `Issue #1796 <https://redmine.postgresql.org/issues/1796>`_ - Add missing "Run Now" option for pgAdmin jobs
| `Issue #1797 <https://redmine.postgresql.org/issues/1797>`_ - Resolve encoding issues with DATA_DIR
| `Issue #1914 <https://redmine.postgresql.org/issues/1914>`_ - Resolved error utf8' codec can't decode byte
| `Issue #1983 <https://redmine.postgresql.org/issues/1983>`_ - Fix bug in Sql query contains Arabic Charaters
| `Issue #2089 <https://redmine.postgresql.org/issues/2089>`_ - Add PARALLEL SAFE|UNSAFE|RESTRICTED support
| `Issue #2115 <https://redmine.postgresql.org/issues/2115>`_ - Fix exclusion constraint reverse engineered SQL
| `Issue #2119 <https://redmine.postgresql.org/issues/2119>`_ - Fix display of long integers and decimals
| `Issue #2126 <https://redmine.postgresql.org/issues/2126>`_ - Correct node labels in Preferences for EDB functions and procedures
| `Issue #2151 <https://redmine.postgresql.org/issues/2151>`_ - Display un-sized varlen column types correctly in the Query Tool
| `Issue #2154 <https://redmine.postgresql.org/issues/2154>`_ - Fix display of long integers and decimals
| `Issue #2159 <https://redmine.postgresql.org/issues/2159>`_ - Resolve issue where Query editor is not working with Python2.6
| `Issue #2160 <https://redmine.postgresql.org/issues/2160>`_ - Various encoding fixes to allow 'ascii' codec to decode byte 0xc3 in position 66: ordinal not in range(128)
| `Issue #2166 <https://redmine.postgresql.org/issues/2166>`_ - Resolved import/Export issue for a table
| `Issue #2173 <https://redmine.postgresql.org/issues/2173>`_ - Resolved issues where Sequences API test cases are not working in PG9.2 and PPAS9.2
| `Issue #2174 <https://redmine.postgresql.org/issues/2174>`_ - Resolved various file-system encoding/decoding related cases
| `Issue #2185 <https://redmine.postgresql.org/issues/2185>`_ - Removed sorting columns on the treeview
| `Issue #2192 <https://redmine.postgresql.org/issues/2192>`_ - Fix startup complete tests to ensure we properly poll the server for completed startup
| `Issue #2198 <https://redmine.postgresql.org/issues/2198>`_ - Fix function arguments when generating create SQL
| `Issue #2200 <https://redmine.postgresql.org/issues/2200>`_ - Properly handle event trigger functions in different schemas
| `Issue #2201 <https://redmine.postgresql.org/issues/2201>`_ - Fix renaming of check constraints when the table name is changed at the same time
| `Issue #2202 <https://redmine.postgresql.org/issues/2202>`_ - Fix issue where Dependents query fails due to non ascii characters
| `Issue #2204 <https://redmine.postgresql.org/issues/2204>`_ - Fixed issue where pgadmin 4 jobs not showing any activity
| `Issue #2205 <https://redmine.postgresql.org/issues/2205>`_ - Fix display of boolean nulls in the Query Tool
| `Issue #2208 <https://redmine.postgresql.org/issues/2208>`_ - Ensure primary key column names are quoted in View Data mode of the Query Tool
| `Issue #2212 <https://redmine.postgresql.org/issues/2212>`_ - Ensure servers are deleted when their parent group is deleted
| `Issue #2213 <https://redmine.postgresql.org/issues/2213>`_ - Enable right click on browser tree
| `Issue #2218 <https://redmine.postgresql.org/issues/2218>`_ - Show the correct indeterminate state when editing new boolean values
| `Issue #2228 <https://redmine.postgresql.org/issues/2228>`_ - Authenticate the runtime to the server
| `Issue #2230 <https://redmine.postgresql.org/issues/2230>`_ - Prevent the Slonik logo obscuring the login dialogue on small displays in server mode
