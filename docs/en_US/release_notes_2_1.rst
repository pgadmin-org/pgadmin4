***********
Version 2.1
***********

Release date: 2018-01-11

This release contains a number of features and fixes reported since the release
of pgAdmin4 2.0


Features
********

| `Issue #1383 <https://redmine.postgresql.org/issues/1383>`_ - Allow connections to be coloured in the treeview and Query Tool
| `Issue #1489 <https://redmine.postgresql.org/issues/1489>`_ - Improve user interface for selection query in Data Filter window
| `Issue #2368 <https://redmine.postgresql.org/issues/2368>`_ - Improve data entry in Query Tool
| `Issue #2781 <https://redmine.postgresql.org/issues/2781>`_ - Allow configuration of CSV and clipboard formatting of query results
| `Issue #2802 <https://redmine.postgresql.org/issues/2802>`_ - Allow connections to be coloured in the treeview and Query Tool.
| `Issue #2810 <https://redmine.postgresql.org/issues/2810>`_ - Allow files to be opened by double clicking on them within Query Tool
| `Issue #2845 <https://redmine.postgresql.org/issues/2845>`_ - Make the "Save Changes" prompts in the Query Tool optional
| `Issue #2849 <https://redmine.postgresql.org/issues/2849>`_ - Add support for editing data in tables with OIDs but no primary keys and updates the editor to retrieve all row values on save, thus immediately showing default values and allowing subsequent editing without a refresh



Bug fixes
*********

| `Issue #1365 <https://redmine.postgresql.org/issues/1365>`_ - Prevent the Windows installer accepting paths containing invalid characters
| `Issue #1366 <https://redmine.postgresql.org/issues/1366>`_ - Fix /NOICONS switch in the windows installer
| `Issue #1436 <https://redmine.postgresql.org/issues/1436>`_ - Fix issue with debugger which is failing for sub - procedure on PPAS 9.6
| `Issue #1749 <https://redmine.postgresql.org/issues/1749>`_ - Fixes in pgAgent module including; 1) allowing start date earlier than end date when scheduling job, 2) Datetime picker not displaying in grid and 3) validation error not displaying propertly for Datetime control
| `Issue #2094 <https://redmine.postgresql.org/issues/2094>`_ - Display relevant error messages when access is denied creating a schema
| `Issue #2098 <https://redmine.postgresql.org/issues/2098>`_ - Cleanup some inconsistent error dialog titles
| `Issue #2258 <https://redmine.postgresql.org/issues/2258>`_ - Fix handling of DATERANGE[] type
| `Issue #2278 <https://redmine.postgresql.org/issues/2278>`_ - Display long names appropriately in dialogue headers
| `Issue #2443 <https://redmine.postgresql.org/issues/2443>`_ - Confirm with the user before exiting the runtime
| `Issue #2524 <https://redmine.postgresql.org/issues/2524>`_ - Fix debugging of self-referencing functions
| `Issue #2566 <https://redmine.postgresql.org/issues/2566>`_ - Fix the Pause/Resume Replay of WAL files for PostgreSQL 10
| `Issue #2624 <https://redmine.postgresql.org/issues/2624>`_ - Ensure the switch animation is consistent on the table dialogue and avoid displaying an error incorrectly
| `Issue #2651 <https://redmine.postgresql.org/issues/2651>`_ - Ensure estimated rows are included correctly in CREATE script for functions
| `Issue #2679 <https://redmine.postgresql.org/issues/2679>`_ - Getting started links does not open second time if User open any URL and Click on Close button with cross bar
| `Issue #2705 <https://redmine.postgresql.org/issues/2705>`_ - User can add expirty date on Windows
| `Issue #2715 <https://redmine.postgresql.org/issues/2715>`_ - Ensure we can download large files and keep the user informed about progress
| `Issue #2720 <https://redmine.postgresql.org/issues/2720>`_ - Ensure password changes are successful if authenticating using a pgpass file
| `Issue #2726 <https://redmine.postgresql.org/issues/2726>`_ - Ensure the auto-complete selection list can display longer names
| `Issue #2738 <https://redmine.postgresql.org/issues/2738>`_ - Ensure line numbers form CodeMirror don't appear on top of menus
| `Issue #2748 <https://redmine.postgresql.org/issues/2748>`_ - Format JSON/JSONB nicely when displaying it in the grid editor pop-up
| `Issue #2760 <https://redmine.postgresql.org/issues/2760>`_ - When selecting an SSL cert or key, update only the expected path in the UI, not all of them
| `Issue #2765 <https://redmine.postgresql.org/issues/2765>`_ - Do not decrypt the password when the password is 'None'.  This should avoid the common but harmless exception "ValueError: IV must be 16 bytes long while decrypting the password."
| `Issue #2768 <https://redmine.postgresql.org/issues/2768>`_ - Only allow specification of a pgpass file if libpq >= 10
| `Issue #2769 <https://redmine.postgresql.org/issues/2769>`_ - Correct keyboard shortcut. Don't un-comment code with alt+. in the Query Tool. It's only supposed to respond to ctrl/cmd+
| `Issue #2772 <https://redmine.postgresql.org/issues/2772>`_ - Remove external links from Panel's context menu
| `Issue #2778 <https://redmine.postgresql.org/issues/2778>`_ - Ensure the datatype cache is updated when a domain is added
| `Issue #2779 <https://redmine.postgresql.org/issues/2779>`_ - Ensure column collation isn't lost when changing field size
| `Issue #2780 <https://redmine.postgresql.org/issues/2780>`_ - Ensure auto-indent honours the spaces/tabs config setting
| `Issue #2782 <https://redmine.postgresql.org/issues/2782>`_ - Re-hash the way that we handle rendering of special types such as arrays
| `Issue #2787 <https://redmine.postgresql.org/issues/2787>`_ - Quote the owner name when creating types
| `Issue #2806 <https://redmine.postgresql.org/issues/2806>`_ - Attempt to decode database errors based on lc_messages
| `Issue #2811 <https://redmine.postgresql.org/issues/2811>`_ - Display process output as it happens
| `Issue #2820 <https://redmine.postgresql.org/issues/2820>`_ - Logs available when executing backup and restore
| `Issue #2821 <https://redmine.postgresql.org/issues/2821>`_ - Attempt to decode database errors based on lc_messages
| `Issue #2822 <https://redmine.postgresql.org/issues/2822>`_ - Re-hash the way that we handle rendering of special types such as arrays.
| `Issue #2824 <https://redmine.postgresql.org/issues/2824>`_ - Fix a number of graphical explain rendering issues
| `Issue #2836 <https://redmine.postgresql.org/issues/2636>`_ - Fix counted rows display in table properties
| `Issue #2842 <https://redmine.postgresql.org/issues/2842>`_ - Fix a number of graphical explain rendering issues
| `Issue #2846 <https://redmine.postgresql.org/issues/2846>`_ - Add an option to manually count rows in tables to render the properties
| `Issue #2854 <https://redmine.postgresql.org/issues/2854>`_ - Fix utility output capture encoding
| `Issue #2859 <https://redmine.postgresql.org/issues/2859>`_ - Allow form validation messages to be close in case the eclipse anything on the form
| `Issue #2866 <https://redmine.postgresql.org/issues/2866>`_ - Ensure we don't show the full path on the server when using virtual filesystem roots in server mode for SSL certs
| `Issue #2875 <https://redmine.postgresql.org/issues/2875>`_ - Ensure the scroll location is retains in the Query Tool data grid if the user changes tab and then returns
| `Issue #2877 <https://redmine.postgresql.org/issues/2877>`_ - Remove the artificial limit of 4000 characters from text areas
| `Issue #2880 <https://redmine.postgresql.org/issues/2880>`_ - Honour whitespace properly in the data grid
| `Issue #2881 <https://redmine.postgresql.org/issues/2881>`_ - Fix support for time without timezone
| `Issue #2886 <https://redmine.postgresql.org/issues/2886>`_ - Resolve issue where Insert failed when tried with default primary key value
| `Issue #2891 <https://redmine.postgresql.org/issues/2891>`_ - Allow changing of the users password without leaving the app
| `Issue #2892 <https://redmine.postgresql.org/issues/2892>`_ - Refuse password changes (and tell the user) if the notification email cannot be sent
| `Issue #2908 <https://redmine.postgresql.org/issues/2908>`_ - Fix bundle creation on Windows which was failing due to \r\n line endings in code mirror
| `Issue #2918 <https://redmine.postgresql.org/issues/2918>`_ - Add missing init.py to backports.csv when building the MSVC windows build
| `Issue #2920 <https://redmine.postgresql.org/issues/2920>`_ - Push HTTPD logs to container stdout/stderr as appropriate
| `Issue #2921 <https://redmine.postgresql.org/issues/2921>`_ - Fixes in pgAgent module including; 1) allowing start date earlier than end date when scheduling job, 2) Datetime picker not displaying in grid and 3) validation error not displaying propertly for Datetime control
| `Issue #2922 <https://redmine.postgresql.org/issues/2922>`_ - Don't login the user with every request in desktop mode. Just do it once
| `Issue #2923 <https://redmine.postgresql.org/issues/2923>`_ - Prevent the user pressing the select button in the file manager when it is supposed to be disabled
| `Issue #2924 <https://redmine.postgresql.org/issues/2924>`_ - Cleanup the layout of the filter data dialogue
| `Issue #2928 <https://redmine.postgresql.org/issues/2928>`_ - Prevent multiple connections to new slow-to-respond servers being initiated in error
| `Issue #2934 <https://redmine.postgresql.org/issues/2934>`_ - Fix a reference before assignment error in the file dialogue
| `Issue #2937 <https://redmine.postgresql.org/issues/2937>`_ - Prevent attempts to select directories as files in the file dialogue
| `Issue #2945 <https://redmine.postgresql.org/issues/2945>`_ - Ensure invalid options can't be selected on triggers on views
| `Issue #2949 <https://redmine.postgresql.org/issues/2949>`_ - Display complete SQL for FTS dictionaries
| `Issue #2952 <https://redmine.postgresql.org/issues/2952>`_ - Don't try to render security URLs in desktop mode
| `Issue #2954 <https://redmine.postgresql.org/issues/2954>`_ - Allow selection of validation error text
| `Issue #2974 <https://redmine.postgresql.org/issues/2974>`_ - Clear the messages tab when running EXPLAIN/EXPLAIN ANALYZE
| `Issue #2993 <https://redmine.postgresql.org/issues/2993>`_ - Fix view data for views/mat views
