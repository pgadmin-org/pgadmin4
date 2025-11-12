***********
Version 3.0
***********

Release date: 2018-03-22

This release contains a number of features and fixes reported since the release
of pgAdmin4 2.1


Features
********

| `Issue #1894 <https://redmine.postgresql.org/issues/1894>`_ - Allow sorting when viewing/editing data
| `Issue #1978 <https://redmine.postgresql.org/issues/1978>`_ - Add the ability to enable/disable UI animations
| `Issue #2895 <https://redmine.postgresql.org/issues/2895>`_ - Add keyboard navigation options for the main browser windows
| `Issue #2896 <https://redmine.postgresql.org/issues/2896>`_ - Add keyboard navigation in Query tool module via Tab/Shift-Tab key
| `Issue #2897 <https://redmine.postgresql.org/issues/2897>`_ - Support keyboard navigation in the debugger
| `Issue #2898 <https://redmine.postgresql.org/issues/2898>`_ - Support tab navigation in dialogs
| `Issue #2899 <https://redmine.postgresql.org/issues/2899>`_ - Add configurable shortcut keys for various common options in the main window
| `Issue #2901 <https://redmine.postgresql.org/issues/2901>`_ - Configurable shortcuts in the Debugger
| `Issue #2904 <https://redmine.postgresql.org/issues/2904>`_ - Ensure clickable images/buttons have appropriate tooltips for screen readers
| `Issue #2950 <https://redmine.postgresql.org/issues/2950>`_ - Add a marker (/*pga4dash*/) to the dashboard queries to allow them to be more easily filtered from server logs
| `Issue #2951 <https://redmine.postgresql.org/issues/2951>`_ - Allow dashboard tables and charts to be enabled/disabled
| `Issue #3004 <https://redmine.postgresql.org/issues/3004>`_ - Support server and database statistics on Greenplum
| `Issue #3036 <https://redmine.postgresql.org/issues/3036>`_ - Display partitions in Greenplum
| `Issue #3044 <https://redmine.postgresql.org/issues/3044>`_ - Display functions in Greenplum
| `Issue #3086 <https://redmine.postgresql.org/issues/3086>`_ - Rewrite the runtime as a tray-based server which can launch a web browser
| `Issue #3097 <https://redmine.postgresql.org/issues/3097>`_ - Support EXPLAIN on Greenplum
| `Issue #3098 <https://redmine.postgresql.org/issues/3098>`_ - Unvendorize REACT so no longer required in our source tree
| `Issue #3107 <https://redmine.postgresql.org/issues/3107>`_ - Hide tablespace node on GPDB
| `Issue #3140 <https://redmine.postgresql.org/issues/3140>`_ - Add support for connecting using pg_service.conf files
| `Issue #3168 <https://redmine.postgresql.org/issues/3168>`_ - Support for external tables in GPDB
| `Issue #3182 <https://redmine.postgresql.org/issues/3182>`_ - Update Jasmine to v3
| `Issue #3184 <https://redmine.postgresql.org/issues/3184>`_ - Add a French translation
| `Issue #3195 <https://redmine.postgresql.org/issues/3195>`_ - Pass the service name to external processes
| `Issue #3246 <https://redmine.postgresql.org/issues/3246>`_ - Update container build to use Alpine Linux and Gunicorn instead of CentOS/Apache

| `In addition, various changes were made for PEP8 compliance`


Bug fixes
*********

| `Issue #1173 <https://redmine.postgresql.org/issues/1173>`_ - Add a comment to the existing node
| `Issue #1925 <https://redmine.postgresql.org/issues/1925>`_ - Fix issue resizing column widths not resizable in Query Tool after first query
| `Issue #2104 <https://redmine.postgresql.org/issues/2104>`_ - Runtime update display file version and copyright year under installers properties
| `Issue #2249 <https://redmine.postgresql.org/issues/2249>`_ - Application no longer hangs after reload in runtime
| `Issue #2251 <https://redmine.postgresql.org/issues/2251>`_ - Runtime fixed OSX html scroll direction ignored in MacOS setup
| `Issue #2309 <https://redmine.postgresql.org/issues/2309>`_ - Allow text selection/copying from disabled CodeMirror instances
| `Issue #2480 <https://redmine.postgresql.org/issues/2480>`_ - Runtime update fix to Context Menus on Mac that do not work
| `Issue #2578 <https://redmine.postgresql.org/issues/2578>`_ - Runtime update fix to HTML access keys that don't work
| `Issue #2581 <https://redmine.postgresql.org/issues/2581>`_ - Fix keyboard shortcut for text selection
| `Issue #2677 <https://redmine.postgresql.org/issues/2677>`_ - Update Elephant icon for pgAdmin4 on Windows
| `Issue #2776 <https://redmine.postgresql.org/issues/2776>`_ - Fix unreadable font via Remote Desktop
| `Issue #2777 <https://redmine.postgresql.org/issues/2777>`_ - Fix spacing issue on server tree
| `Issue #2783 <https://redmine.postgresql.org/issues/2783>`_ - Runtime update fixed blank screen on Windows Desktop
| `Issue #2906 <https://redmine.postgresql.org/issues/2906>`_ - Correct display issues on HiDPI screens
| `Issue #2961 <https://redmine.postgresql.org/issues/2961>`_ - Issues when creating a pgAgent Schedule
| `Issue #2963 <https://redmine.postgresql.org/issues/2963>`_ - Fix unicode handling in the external process tools and show the complete command in the process viewer
| `Issue #2980 <https://redmine.postgresql.org/issues/2980>`_ - Copy text from the Query tool into the clipboard adds invisible characters
| `Issue #2981 <https://redmine.postgresql.org/issues/2981>`_ - Support keyboard navigation in the debugger
| `Issue #2983 <https://redmine.postgresql.org/issues/2983>`_ - Fix intermittent specified_version_number ValueError issue on restart
| `Issue #2985 <https://redmine.postgresql.org/issues/2985>`_ - Fix drag and drop issues
| `Issue #2998 <https://redmine.postgresql.org/issues/2998>`_ - Don't listen on port 443 if TLS is not enabled when launching the container
| `Issue #3001 <https://redmine.postgresql.org/issues/3001>`_ - Runtime update fix scrolling with mouse wheel on mac pgAdmin 4.2.1
| `Issue #3002 <https://redmine.postgresql.org/issues/3002>`_ - Fix block indent/outdent with configurable width
| `Issue #3003 <https://redmine.postgresql.org/issues/3003>`_ - Runtime update fix copy to clipboard
| `Issue #3005 <https://redmine.postgresql.org/issues/3005>`_ - Runtime update fix unable to select tabs in pgAdmin 4.2.1
| `Issue #3013 <https://redmine.postgresql.org/issues/3013>`_ - Fix a minor UI issue on dashboard while displaying subnode control in Backgrid
| `Issue #3014 <https://redmine.postgresql.org/issues/3014>`_ - Fix validation of sequence parameters
| `Issue #3015 <https://redmine.postgresql.org/issues/3015>`_ - Support Properties on Greenplum databases
| `Issue #3016 <https://redmine.postgresql.org/issues/3016>`_ - Ensure debug messages are available in "messages" window when error occurs
| `Issue #3021 <https://redmine.postgresql.org/issues/3021>`_ - Update scan and index scan EXPLAIN icons for greater clarity
| `Issue #3027 <https://redmine.postgresql.org/issues/3027>`_ - Ensure we capture notices raised by queries
| `Issue #3031 <https://redmine.postgresql.org/issues/3031>`_ - Runtime issue causing double and single quotes not to work
| `Issue #3039 <https://redmine.postgresql.org/issues/3039>`_ - Runtime issue causing wrong row counts on count column
| `Issue #3042 <https://redmine.postgresql.org/issues/3042>`_ - Runtime issue causing empty dialog box when refreshing
| `Issue #3043 <https://redmine.postgresql.org/issues/3043>`_ - Runtime issue causing word sizing in macOS High Sierra
| `Issue #3045 <https://redmine.postgresql.org/issues/3045>`_ - Runtime issue causing copy cells issues copying cells for key binding
| `Issue #3046 <https://redmine.postgresql.org/issues/3046>`_ - Fix connection status indicator on IE/FF
| `Issue #3050 <https://redmine.postgresql.org/issues/3050>`_ - Correct display of RE-SQL for partitioned tables in Greenplum
| `Issue #3052 <https://redmine.postgresql.org/issues/3052>`_ - Don't include sizes on primitive data types that shouldn't have them when modifying columns
| `Issue #3054 <https://redmine.postgresql.org/issues/3054>`_ - Ensure the user can use keyboard shortcuts after using button controls such as Cancel, Open and Save
| `Issue #3057 <https://redmine.postgresql.org/issues/3057>`_ - Update the regression tests to fix issues with Python 3.5 and PG 9.2
| `Issue #3058 <https://redmine.postgresql.org/issues/3058>`_ - Fix on-click handling of treeview nodes that wasn't refreshing SQL/Dependencies/Dependents in some circumstances
| `Issue #3059 <https://redmine.postgresql.org/issues/3059>`_ - Fix table statistics for Greenplum
| `Issue #3060 <https://redmine.postgresql.org/issues/3060>`_ - Fix quoting of function names in RE-SQL
| `Issue #3066 <https://redmine.postgresql.org/issues/3066>`_ - Ensure column names on indexes on views are properly quoted in RE-SQL
| `Issue #3067 <https://redmine.postgresql.org/issues/3067>`_ - Prevent the filter dialog CodeMirror from overflowing onto the button bar of the dialog
| `Issue #3072 <https://redmine.postgresql.org/issues/3072>`_ - Add a (configurable) limit to the number of pgAgent job history rows displayed on the statistics tab
| `Issue #3073 <https://redmine.postgresql.org/issues/3073>`_ - Ensure the pgAgent job start/end time grid fields synchronise with the subnode control and validate correctly
| `Issue #3075 <https://redmine.postgresql.org/issues/3075>`_ - Runtime issue causing Select, Update, and Insert script generation for a table fails to load
| `Issue #3077 <https://redmine.postgresql.org/issues/3077>`_ - Remove dependency on standards_conforming_strings being enabled
| `Issue #3079 <https://redmine.postgresql.org/issues/3079>`_ - Fix handling of tie/datetime array types when adding columns to a table
| `Issue #3080 <https://redmine.postgresql.org/issues/3080>`_ - Fix alignment issues in keyboard shortcut options
| `Issue #3081 <https://redmine.postgresql.org/issues/3081>`_ - Add missing reverse-engineered SQL header and drop statement for sequences
| `Issue #3090 <https://redmine.postgresql.org/issues/3090>`_ - Ensure message severity is decoded when necessary by the driver
| `Issue #3094 <https://redmine.postgresql.org/issues/3094>`_ - Ensure all messages are retrieved from the server in the Query Tool
| `Issue #3099 <https://redmine.postgresql.org/issues/3099>`_ - Fix creation of tables and columns in GPDB
| `Issue #3105 <https://redmine.postgresql.org/issues/3105>`_ - Ensure we can properly update rows with upper-case primary key columns
| `Issue #3135 <https://redmine.postgresql.org/issues/3135>`_ - Insert rows correctly when a table has OIDs and a Primary Key in uppercase
| `Issue #3122 <https://redmine.postgresql.org/issues/3122>`_ - Ensure SSL options are pushed down to external tools like pg_dump
| `Issue #3129 <https://redmine.postgresql.org/issues/3129>`_ - Handle opening of non-UTF8 compatible files
| `Issue #3137 <https://redmine.postgresql.org/issues/3137>`_ - Allow copying of SQL from the dashboard tables
| `Issue #3138 <https://redmine.postgresql.org/issues/3138>`_ - Fix tablespace tests for Python 3.x
| `Issue #3150 <https://redmine.postgresql.org/issues/3150>`_ - Fix function reserve SQL for GPDB
| `Issue #3157 <https://redmine.postgresql.org/issues/3157>`_ - Fix unicode handling in the external process tools and show the complete command in the process viewer
| `Issue #3171 <https://redmine.postgresql.org/issues/3171>`_ - Runtime issue causing inability to scroll in File Selector with trackpad on OSX
| `Issue #3176 <https://redmine.postgresql.org/issues/3176>`_ - Disable function statistics on Greenplum
| `Issue #3180 <https://redmine.postgresql.org/issues/3180>`_ - Ensure Indexes are displayed on PG 10 tables
| `Issue #3190 <https://redmine.postgresql.org/issues/3190>`_ - Skip tests where appropriate on GPDB
| `Issue #3196 <https://redmine.postgresql.org/issues/3196>`_ - Ensure the file manager properly escapes file & directory names
| `Issue #3197 <https://redmine.postgresql.org/issues/3197>`_ - Appropriately set the cookie path
| `Issue #3200 <https://redmine.postgresql.org/issues/3200>`_ - Ensure the host parameter is correctly pickup up from the service file
| `Issue #3219 <https://redmine.postgresql.org/issues/3219>`_ - Update required ChromeDriver version for current versions of Chrome
| `Issue #3226 <https://redmine.postgresql.org/issues/3226>`_ - Move the field error indicators in front of the affected fields so they don't obscure spinners or drop downs etc.
| `Issue #3244 <https://redmine.postgresql.org/issues/3244>`_ - Show more granular timing info in the Query Tool history panel
| `Issue #3248 <https://redmine.postgresql.org/issues/3248>`_ - Ensure Alertify dialogues are modal to prevent them being closed by mis-click