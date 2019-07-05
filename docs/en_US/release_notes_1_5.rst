***********
Version 1.5
***********

Release date: 2017-05-19

This release contains a number of features and fixes reported since the release
of pgAdmin4 1.4.

Features
********

| `Issue #2216 <https://redmine.postgresql.org/issues/2216>`_ - Allow column or row selection in the Query Tool

Bug fixes
*********

| `Issue #2225 <https://redmine.postgresql.org/issues/2225>`_ - Hide menu options for creating objects, if the object type is set to hidden. Includes Jasmine tests
| `Issue #2253 <https://redmine.postgresql.org/issues/2253>`_ - Fix various issues in CSV file download feature
| `Issue #2257 <https://redmine.postgresql.org/issues/2257>`_ - Improve handling of nulls and default values in the data editor
| `Issue #2271 <https://redmine.postgresql.org/issues/2271>`_ - Don't change the trigger icon back to "enabled" when the trigger is updated when it's disabled
| `Issue #2284 <https://redmine.postgresql.org/issues/2284>`_ - Allow creation of tables with pure numeric names
| `Issue #2292 <https://redmine.postgresql.org/issues/2292>`_ - Only reconnect to databases that were previously connected
| `Issue #2314 <https://redmine.postgresql.org/issues/2314>`_ - Fix various issues in CSV file download feature
| `Issue #2315 <https://redmine.postgresql.org/issues/2315>`_ - Fix sorting of sizes on the statistics views by sorting raw values and prettifying on the client side. Includes Jasmine tests for the prettyfying function
| `Issue #2318 <https://redmine.postgresql.org/issues/2318>`_ - Order foreign table columns correctly
| `Issue #2331 <https://redmine.postgresql.org/issues/2331>`_ - Fix binary search algorithm so new treeview nodes are added in the correct position
| `Issue #2336 <https://redmine.postgresql.org/issues/2336>`_ - Update inode info when refreshing treeview nodes.
| `Issue #2339 <https://redmine.postgresql.org/issues/2339>`_ - Ensure the treeview can be scrolled horizontally
| `Issue #2350 <https://redmine.postgresql.org/issues/2350>`_ - Fix handling of default parameters ordering in functions
| `Issue #2354 <https://redmine.postgresql.org/issues/2354>`_ - Fix the Backup module where it was not working if user changes its preference language other than English
| `Issue #2356 <https://redmine.postgresql.org/issues/2356>`_ - Ensure errors thrown when deleting rows in the Query Tool in edit mode are shown properly
| `Issue #2360 <https://redmine.postgresql.org/issues/2360>`_ - Fix various issues in CSV file download feature
| `Issue #2369 <https://redmine.postgresql.org/issues/2369>`_ - Support loading files with Unicode BOMs
| `Issue #2377 <https://redmine.postgresql.org/issues/2377>`_ - Update psycopg2 version for PostgreSQL 10 compatibility
| `Issue #2379 <https://redmine.postgresql.org/issues/2379>`_ - Make various improvements to the NULL/DEFAULT handling in the data editor
| `Issue #2405 <https://redmine.postgresql.org/issues/2405>`_ - Ensure object names are properly escaped for external process management
| `Issue #2410 <https://redmine.postgresql.org/issues/2410>`_ - Fix PostgreSQL 10.0 compatibility issues
