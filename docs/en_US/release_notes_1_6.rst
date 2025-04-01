***********
Version 1.6
***********

Release date: 2017-07-13

This release contains a number of features and fixes reported since the release
of pgAdmin4 1.5


Features
********

| `Issue #1344 <https://redmine.postgresql.org/issues/1344>`_ - Allow the Query Tool, Debugger and web browser tabs to be moved to different monitors as desired
| `Issue #1533 <https://redmine.postgresql.org/issues/1533>`_ - Set focus on the first enabled field when a dialogue is opened
| `Issue #1535 <https://redmine.postgresql.org/issues/1535>`_ - Teach dialogues about Escape to cancel, Enter to Save/OK, and F1 for help
| `Issue #1971 <https://redmine.postgresql.org/issues/1971>`_ - Retain column sizing in the Query Tool results grid when the same query is re-run multiple times in a row
| `Issue #1972 <https://redmine.postgresql.org/issues/1972>`_ - Prompt the user to save dirty queries rather than discard them for a more natural workflow
| `Issue #2137 <https://redmine.postgresql.org/issues/2137>`_ - On-demand loading for the Query Tool results
| `Issue #2191 <https://redmine.postgresql.org/issues/2191>`_ - Add support for the hostaddr connection parameter. This helps us play nicely with Kerberos/SSPI and friends
| `Issue #2282 <https://redmine.postgresql.org/issues/2282>`_ - Overhaul the query history tab to allow browsing of the history and full query text
| `Issue #2379 <https://redmine.postgresql.org/issues/2379>`_ - Support inserting multiple new rows into a table without clicking Save for each row
| `Issue #2485 <https://redmine.postgresql.org/issues/2485>`_ - Add a shortcut to reset the zoom level in the runtime
| `Issue #2506 <https://redmine.postgresql.org/issues/2506>`_ - Allow the user to close the dashboard panel
| `Issue #2513 <https://redmine.postgresql.org/issues/2513>`_ - Add preferences to enable brace matching and brace closing in the SQL editors



Bug fixes
*********

| `Issue #1126 <https://redmine.postgresql.org/issues/1126>`_ - Various FTS dictionary cleanups
| `Issue #1229 <https://redmine.postgresql.org/issues/1229>`_ - Fix default values and SQL formatting for event triggers
| `Issue #1466 <https://redmine.postgresql.org/issues/1466>`_ - Prevent attempts to debug procedures with variadic arguments
| `Issue #1525 <https://redmine.postgresql.org/issues/1525>`_ - Make $ quoting consistent
| `Issue #1575 <https://redmine.postgresql.org/issues/1575>`_ - Properly display security labels on EPAS 9.2+
| `Issue #1795 <https://redmine.postgresql.org/issues/1795>`_ - Fix validation for external and range types
| `Issue #1813 <https://redmine.postgresql.org/issues/1813>`_ - List packages in PPAS 9.2-9.4 when creating synonyms
| `Issue #1831 <https://redmine.postgresql.org/issues/1831>`_ - Fix server stats display for EPAS 9.2, where inet needs casting to text for concatenation
| `Issue #1851 <https://redmine.postgresql.org/issues/1851>`_ - Reverse engineer SQL for table-returning functions correctly
| `Issue #1860 <https://redmine.postgresql.org/issues/1860>`_ - Ensure default values are honoured when adding/editing columns
| `Issue #1888 <https://redmine.postgresql.org/issues/1888>`_ - Fix various issues with pgAgent job steps and schedules
| `Issue #1889 <https://redmine.postgresql.org/issues/1889>`_ - Fix various issues with pgAgent job steps and schedules
| `Issue #1890 <https://redmine.postgresql.org/issues/1890>`_ - Fix various issues with pgAgent job steps and schedules
| `Issue #1920 <https://redmine.postgresql.org/issues/1920>`_ - Ensure saved passwords are effective immediately, not just following a restart when first saved
| `Issue #1928 <https://redmine.postgresql.org/issues/1928>`_ - Fix the handling of double precision[] type
| `Issue #1934 <https://redmine.postgresql.org/issues/1934>`_ - Fix import/export to work as expected with TSV data
| `Issue #1999 <https://redmine.postgresql.org/issues/1999>`_ - Handle warning correctly when saving query results to an unmounted USB drive
| `Issue #2013 <https://redmine.postgresql.org/issues/2013>`_ - Increase the default size of the Grant Wizard to enable it to properly display privileges at the default size on smaller displays
| `Issue #2014 <https://redmine.postgresql.org/issues/2014>`_ - To fix unexpected behaviour displayed if user stops debugging on package/procedure fire_emp
| `Issue #2043 <https://redmine.postgresql.org/issues/2043>`_ - Properly handle trigger functions with parameters
| `Issue #2078 <https://redmine.postgresql.org/issues/2078>`_ - Refresh the SQL editor view on resize to ensure the contents are re-rendered for the new viewport
| `Issue #2086 <https://redmine.postgresql.org/issues/2086>`_ - Allow editing of the WITH ADMIN option of role membership
| `Issue #2113 <https://redmine.postgresql.org/issues/2113>`_ - Correct the validation logic when modifying indexes/exclusion constraints
| `Issue #2116 <https://redmine.postgresql.org/issues/2116>`_ - Enable dialogue help buttons on Language and Foreign Table dialogues
| `Issue #2142 <https://redmine.postgresql.org/issues/2142>`_ - Fix canceling of Grant Wizard on Windows
| `Issue #2155 <https://redmine.postgresql.org/issues/2155>`_ - Fix removal of sizes from column definitions
| `Issue #2162 <https://redmine.postgresql.org/issues/2162>`_ - Allow non-superusers to debug their own functions and prevent them from setting global breakpoints
| `Issue #2242 <https://redmine.postgresql.org/issues/2242>`_ - Fix an issue in NodeAjaxControl caching with cache-node field and add cache-node field in Trigger & Event trigger node so that whenever the user creates new Trigger Function we get new data from server in NodeAjaxControl
| `Issue #2280 <https://redmine.postgresql.org/issues/2280>`_ - Handle procedure flags (IMMUTABLE STRICT SECURITY DEFINER PARALLEL RESTRICTED) properly in RE-SQL on EPAS
| `Issue #2324 <https://redmine.postgresql.org/issues/2324>`_ - Fix the PostGIS Datatypes in SQL tab, Create / Update dialogues for Table, Column, Foreign Table and Type node
| `Issue #2344 <https://redmine.postgresql.org/issues/2344>`_ - Fix issue with ctrl-c / ctrl-v not working in Query Tool
| `Issue #2348 <https://redmine.postgresql.org/issues/2348>`_ - Fix issue when resizing columns in Query Too/View Data where all row/colums will select/deselect
| `Issue #2355 <https://redmine.postgresql.org/issues/2355>`_ - Properly refresh the parent node when renaming children
| `Issue #2357 <https://redmine.postgresql.org/issues/2355>`_ - Cache statistics more reliably
| `Issue #2381 <https://redmine.postgresql.org/issues/2381>`_ - Fix the RE-SQL for for views to properly qualify trigger function names
| `Issue #2386 <https://redmine.postgresql.org/issues/2386>`_ - Display and allow toggling of trigger enable/disable status from the trigger dialogue
| `Issue #2398 <https://redmine.postgresql.org/issues/2398>`_ - Bypass the proxy server for local addresses on Windows
| `Issue #2400 <https://redmine.postgresql.org/issues/2400>`_ - Cleanup handling of default/null values when data editing
| `Issue #2414 <https://redmine.postgresql.org/issues/2414>`_ - Improve error handling in cases where the user tries to rename or create a server group that would duplicate an existing group
| `Issue #2417 <https://redmine.postgresql.org/issues/2417>`_ - Order columns in multi-column pkeys correctly
| `Issue #2422 <https://redmine.postgresql.org/issues/2422>`_ - Fix RE-SQL for rules which got the table name wrong in the header and DROP statement
| `Issue #2425 <https://redmine.postgresql.org/issues/2425>`_ - Handle composite primary keys correctly when deleting rows in the Edit Grid
| `Issue #2426 <https://redmine.postgresql.org/issues/2426>`_ - Allow creation of ENUM types with no members
| `Issue #2427 <https://redmine.postgresql.org/issues/2427>`_ - Add numerous missing checks to ensure objects really exist when we think they do
| `Issue #2435 <https://redmine.postgresql.org/issues/2435>`_ - Pass the database ID to the Query Tool when using the Script options
| `Issue #2436 <https://redmine.postgresql.org/issues/2436>`_ - Ensure the last placeholder is included when generating UPDATE scripts for tables
| `Issue #2448 <https://redmine.postgresql.org/issues/2448>`_ - Ensure that boolean checkboxes cycle values in the correct order
| `Issue #2450 <https://redmine.postgresql.org/issues/2450>`_ - Fix error on the stats tab with PG10. Also, rename the 10.0_plus template directory to 10_plus to match the new versioning
| `Issue #2461 <https://redmine.postgresql.org/issues/2461>`_ - Allow users to remove default values from columns properly
| `Issue #2468 <https://redmine.postgresql.org/issues/2468>`_ - Fix issue where function create script won't compile
| `Issue #2470 <https://redmine.postgresql.org/issues/2470>`_ - Fix an intermittent error seen during result polling
| `Issue #2476 <https://redmine.postgresql.org/issues/2476>`_ - Improvements to the Query Results grid including improvements to the UI and allow copy/paste from sets of rows, columns or arbitrary blocks of cells
| `Issue #2477 <https://redmine.postgresql.org/issues/2477>`_ - Ensure text editors render in an appropriate place on the results grid
| `Issue #2479 <https://redmine.postgresql.org/issues/2479>`_ - No need for the menu icon to link to the homepage, as pgAdmin is a SPA
| `Issue #2482 <https://redmine.postgresql.org/issues/2482>`_ - Use a more sensible name for Query Tool tabs
| `Issue #2486 <https://redmine.postgresql.org/issues/2486>`_ - Ensure the feature tests use the correct test settings database
| `Issue #2487 <https://redmine.postgresql.org/issues/2487>`_ - Maintain a client-side cache of preference values, populated using an async call
| `Issue #2489 <https://redmine.postgresql.org/issues/2489>`_ - Fix clipboard handling with large datasets
| `Issue #2492 <https://redmine.postgresql.org/issues/2492>`_ - Ensure the initial password is properly hashed during setup in web mode
| `Issue #2498 <https://redmine.postgresql.org/issues/2498>`_ - Properly handle bytea[], and 'infinity'::real/real[]
| `Issue #2502 <https://redmine.postgresql.org/issues/2502>`_ - Properly handle bytea[], and 'infinity'::real/real[]
| `Issue #2503 <https://redmine.postgresql.org/issues/2503>`_ - Handle missing/dropped synonyms gracefully
| `Issue #2504 <https://redmine.postgresql.org/issues/2504>`_ - Update MatView and pgAgent modules to work with recent integer/numeric changes
| `Issue #2507 <https://redmine.postgresql.org/issues/2507>`_ - Ensure revoked public privileges are displayed in the RE-SQL for functions
| `Issue #2518 <https://redmine.postgresql.org/issues/2518>`_ - Fix encoding issue when saving servers
| `Issue #2522 <https://redmine.postgresql.org/issues/2522>`_ - Improve speed of Select All in the results grid
| `Issue #2527 <https://redmine.postgresql.org/issues/2527>`_ - Fix deletion of table rows with the column definition having NOT NULL TRUE and HAS NO DEFAULT VALUE
| `Issue #2528 <https://redmine.postgresql.org/issues/2528>`_ - Allow breakpoints to be set on triggers on views
| `Issue #2529 <https://redmine.postgresql.org/issues/2529>`_ - Resolve a number of issues with domains and domain constraints
| `Issue #2532 <https://redmine.postgresql.org/issues/2532>`_ - Refresh nodes correctly when there is a single child that is updated
| `Issue #2534 <https://redmine.postgresql.org/issues/2534>`_ - Fix handling of CREATE TABLE OF <type>
| `Issue #2535 <https://redmine.postgresql.org/issues/2535>`_ - Fix clear history functionality
| `Issue #2540 <https://redmine.postgresql.org/issues/2540>`_ - Ensure the save password option is enabled when creating a server