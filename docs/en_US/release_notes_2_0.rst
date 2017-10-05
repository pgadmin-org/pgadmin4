***********
Version 2.0
***********

Release date: 2017-10-05

This release contains a number of features and fixes reported since the release of pgAdmin4 1.6


Features
********

| `Feature #1918 <https://redmine.postgresql.org/issues/1918>`_ - Add a field to the Server Dialogue allowing users to specify a subset of databases they'd like to see in the treeview
| `Feature #2135 <https://redmine.postgresql.org/issues/2135>`_ - Significantly speed up loading of the application
| `Feature #2556 <https://redmine.postgresql.org/issues/2556>`_ - Allow for slow vs. fast connection failures
| `Feature #2579 <https://redmine.postgresql.org/issues/2579>`_ - Default the file browser view to list, and make it configurable
| `Feature #2597 <https://redmine.postgresql.org/issues/2597>`_ - Allow queries to be cancelled from the dashboard and display additional info in the subnode control
| `Feature #2649 <https://redmine.postgresql.org/issues/2649>`_ - Support use of SSL certificates for authentication
| `Feature #2650 <https://redmine.postgresql.org/issues/2650>`_ - Support use of pgpass files
| `Feature #2662 <https://redmine.postgresql.org/issues/2662>`_ - Ship with pre-configured paths that can work in both Server and Desktop modes out of the box
| `Feature #2689 <https://redmine.postgresql.org/issues/2689>`_ - Update icons with new designs and remove from menus to de-clutter the UI

Bug fixes
*********

| `Bug #1165 <https://redmine.postgresql.org/issues/1165>`_ - Prevent continual polling for graph data on the dashboard if the server is disconnected
| `Bug #1697 <https://redmine.postgresql.org/issues/1697>`_ - Update CodeMirror version
| `Bug #2043 <https://redmine.postgresql.org/issues/2043>`_ - Properly handle trigger functions with parameters
| `Bug #2074 <https://redmine.postgresql.org/issues/2074>`_ - Make $ quoting consistent
| `Bug #2080 <https://redmine.postgresql.org/issues/2080>`_ - Fix issue where Browser hangs/crashes when loading data (using sql editor) from table which contains large blob data
| `Bug #2153 <https://redmine.postgresql.org/issues/2153>`_ - Fix handline of large file uploads and properly show any errors that may occur
| `Bug #2168 <https://redmine.postgresql.org/issues/2168>`_ - Update CodeMirror version
| `Bug #2170 <https://redmine.postgresql.org/issues/2170>`_ - Support SSL in the regression tests
| `Bug #2324 <https://redmine.postgresql.org/issues/2324>`_ - Fix PostGIS Datatypes in SQL tab, Create / Update dialogues for Table, Column, Foreign Table and Type node
| `Bug #2447 <https://redmine.postgresql.org/issues/2447>`_ - Update CodeMirror version
| `Bug #2452 <https://redmine.postgresql.org/issues/2452>`_ - Install pgadmin4-v1 1.5 on Centos7
| `Bug #2501 <https://redmine.postgresql.org/issues/2501>`_ - Fix collation tests on Windows, replace use of default 'POSIX' collation with 'C' collation for testing
| `Bug #2541 <https://redmine.postgresql.org/issues/2541>`_ - Fix issues using special keys on MacOS
| `Bug #2544 <https://redmine.postgresql.org/issues/2544>`_ - Correct malformed query generated when using custom type
| `Bug #2551 <https://redmine.postgresql.org/issues/2551>`_ - Show tablespace on partitions
| `Bug #2555 <https://redmine.postgresql.org/issues/2555>`_ - Fix issue in query tool where messages were not displaying from functions/procedures properly
| `Bug #2557 <https://redmine.postgresql.org/issues/2557>`_ - Tidy up tab styling
| `Bug #2558 <https://redmine.postgresql.org/issues/2558>`_ - Prevent the tab bar being hidden when detached tabs are being closed
| `Bug #2559 <https://redmine.postgresql.org/issues/2559>`_ - Stop tool buttons from changing their styling unexpectedly
| `Bug #2560 <https://redmine.postgresql.org/issues/2560>`_ - Fix View 'CREATE Script' Problem
| `Bug #2562 <https://redmine.postgresql.org/issues/2562>`_ - Update CodeMirror version
| `Bug #2563 <https://redmine.postgresql.org/issues/2563>`_ - Fix paths under non-standard virtual directories
| `Bug #2566 <https://redmine.postgresql.org/issues/2566>`_ - Fix Pause/Resume Replay of WAL files for PostgreSQL 10
| `Bug #2567 <https://redmine.postgresql.org/issues/2567>`_ - Use the proper database connection to fetch the default priviledges in the properties tab of the database
| `Bug #2582 <https://redmine.postgresql.org/issues/2582>`_ - Unset compression ratio if it is an empty string in Backup module
| `Bug #2586 <https://redmine.postgresql.org/issues/2586>`_ - Cleanup feature tests
| `Bug #2590 <https://redmine.postgresql.org/issues/2590>`_ - Allow navigation of query history using the arrow keys
| `Bug #2592 <https://redmine.postgresql.org/issues/2592>`_ - Stop Flask from initialising service twice in Debug mode
| `Bug #2593 <https://redmine.postgresql.org/issues/2593>`_ - Ensure babel-polyfill is loaded in older qWebKits
| `Bug #2594 <https://redmine.postgresql.org/issues/2594>`_ - Fix disconnection of new databases
| `Bug #2596 <https://redmine.postgresql.org/issues/2596>`_ - Define the proper NODE_ENV environment during running the webpack
| `Bug #2606 <https://redmine.postgresql.org/issues/2606>`_ - Ensure role names are escaped in the membership control
| `Bug #2616 <https://redmine.postgresql.org/issues/2616>`_ - Domain create dialog do not open and Font size issue in Security label control
| `Bug #2617 <https://redmine.postgresql.org/issues/2617>`_ - Add missing pgagent file in webpack.config.js
| `Bug #2619 <https://redmine.postgresql.org/issues/2619>`_ - Fix quoting of index column names on tables
| `Bug #2620 <https://redmine.postgresql.org/issues/2620>`_ - Set database name to blank('') when job type is set to batch, while creating pgAgent job
| `Bug #2631 <https://redmine.postgresql.org/issues/2631>`_ - Change mapping of cell from 'numeric' to 'integer' for integer control as numeric cell has been removed from the code
| `Bug #2633 <https://redmine.postgresql.org/issues/2633>`_ - Fix pgAgent job step issues
| `Bug #2634 <https://redmine.postgresql.org/issues/2634>`_ - Add New Server through Quick links
| `Bug #2637 <https://redmine.postgresql.org/issues/2637>`_ - Fix Copy so it still works after query results have been copied
| `Bug #2641 <https://redmine.postgresql.org/issues/2641>`_ - User management issues - styling and inability to edit users properly
| `Bug #2644 <https://redmine.postgresql.org/issues/2644>`_ - Fix alertify notification messages where checkmark box disconnected from frame
| `Bug #2646 <https://redmine.postgresql.org/issues/2646>`_ - Fix the path reference of load-node.gif which was referencing to vendor directory
| `Bug #2654 <https://redmine.postgresql.org/issues/2654>`_ - Update datetime picker
| `Bug #2655 <https://redmine.postgresql.org/issues/2655>`_ - Fix connection string validation for pgAgent jobs
| `Bug #2656 <https://redmine.postgresql.org/issues/2656>`_ - Change Datetimepicker to expand from bottom in pgAgent so calendar does not get hidden
| `Bug #2657 <https://redmine.postgresql.org/issues/2657>`_ - Fix syntax error while saving changes for start/end time, weekdays, monthdays, month, hours, minutes while updating the pgAgent Job
| `Bug #2659 <https://redmine.postgresql.org/issues/2659>`_ - Fix issue where unable to add/update variables for columns of a table
| `Bug #2660 <https://redmine.postgresql.org/issues/2660>`_ - Not able to select rows in History Tab
| `Bug #2668 <https://redmine.postgresql.org/issues/2668>`_ - Fix RE-SQL for triggers with a single arg
| `Bug #2670 <https://redmine.postgresql.org/issues/2670>`_ - Improve datamodel validations for default Validator if user (developer) does not implement validate function in datamodel
| `Bug #2671 <https://redmine.postgresql.org/issues/2671>`_ - Fix array data type formating for bigint, real, float, double precision
| `Bug #2681 <https://redmine.postgresql.org/issues/2681>`_ - Reset query tool options before running tests
| `Bug #2684 <https://redmine.postgresql.org/issues/2684>`_ - Fix layout of password prompt dialogue
| `Bug #2691 <https://redmine.postgresql.org/issues/2691>`_ - View data option is missing from pgAdmin4 2.0 version
| `Bug #2692 <https://redmine.postgresql.org/issues/2692>`_ - Base type is missing for Domain on pgAdmin4
| `Bug #2693 <https://redmine.postgresql.org/issues/2693>`_ - User list is not available on User mapping pgAdmin4
| `Bug #2698 <https://redmine.postgresql.org/issues/2698>`_ - User can not create function due to missing return type
| `Bug #2699 <https://redmine.postgresql.org/issues/2699>`_ - Filtered Rows issue on pgAdmin4
| `Bug #2700 <https://redmine.postgresql.org/issues/2700>`_ - Cancel button is visible after query executed succesfully
| `Bug #2707 <https://redmine.postgresql.org/issues/2707>`_ - Disable trigger button does not work on pgAdmin4
| `Bug #2708 <https://redmine.postgresql.org/issues/2708>`_ - Tablespace name should displayed instead of %s(new_tablespace)s with Move Objects to another tablespace
| `Bug #2709 <https://redmine.postgresql.org/issues/2709>`_ - Display user relations in schema prefixed by 'pg'
| `Bug #2713 <https://redmine.postgresql.org/issues/2713>`_ - Fix an exception seen sometimes when the server is restarted
| `Bug #2742 <https://redmine.postgresql.org/issues/2742>`_ - Ensure using an alternate role to connect to a database doesn't cause an error when checking recovery state.
