***********
Version 2.1
***********

Release date: 2018-01-11

This release contains a number of features and fixes reported since the release of pgAdmin4 2.0


Features
********

| `Feature #1383 <https://redmine.postgresql.org/issues/1383>`_ - Allow connections to be coloured in the treeview and query tool
| `Feature #1489 <https://redmine.postgresql.org/issues/1489>`_ - Improve user interface for selection query in Data Filter window
| `Feature #2368 <https://redmine.postgresql.org/issues/2368>`_ - Improve data entry in Query Tool
| `Feature #2781 <https://redmine.postgresql.org/issues/2781>`_ - Allow configuration of CSV and clipboard formatting of query results
| `Feature #2802 <https://redmine.postgresql.org/issues/2802>`_ - Allow connections to be coloured in the treeview and query tool.
| `Feature #2810 <https://redmine.postgresql.org/issues/2810>`_ - Allow files to be opened by double clicking on them within Query Tool
| `Feature #2845 <https://redmine.postgresql.org/issues/2845>`_ - Make the "Save Changes" prompts in the query tool optional
| `Feature #2849 <https://redmine.postgresql.org/issues/2849>`_ - Add support for editing data in tables with OIDs but no primary keys and updates the editor to retrieve all row values on save, thus immediately showing default values and allowing subsequent editing without a refresh



Bug fixes
*********

| `Bug #1365 <https://redmine.postgresql.org/issues/1365>`_ - Prevent the Windows installer accepting paths containing invalid characters
| `Bug #1366 <https://redmine.postgresql.org/issues/1366>`_ - Fix /NOICONS switch in the windows installer
| `Bug #1436 <https://redmine.postgresql.org/issues/1436>`_ - Fix issue with debugger which is failing for sub - procedure on PPAS 9.6
| `Bug #1749 <https://redmine.postgresql.org/issues/1749>`_ - Fixes in pgAgent module including; 1) allowing start date earlier than end date when scheduling job, 2) Datetime picker not displaying in grid and 3) validation error not displaying propertly for Datetime control
| `Bug #2094 <https://redmine.postgresql.org/issues/2094>`_ - Display relevant error messages when access is denied creating a schema
| `Bug #2098 <https://redmine.postgresql.org/issues/2098>`_ - Cleanup some inconsistent error dialog titles
| `Bug #2258 <https://redmine.postgresql.org/issues/2258>`_ - Fix handling of DATERANGE[] type
| `Bug #2278 <https://redmine.postgresql.org/issues/2278>`_ - Display long names appropriately in dialogue headers
| `Bug #2443 <https://redmine.postgresql.org/issues/2443>`_ - Confirm with the user before exiting the runtime
| `Bug #2524 <https://redmine.postgresql.org/issues/2524>`_ - Fix debugging of self-referencing functions
| `Bug #2566 <https://redmine.postgresql.org/issues/2566>`_ - Fix the Pause/Resume Replay of WAL files for PostgreSQL 10
| `Bug #2624 <https://redmine.postgresql.org/issues/2624>`_ - Ensure the switch animation is consistent on the table dialogue and avoid displaying an error incorrectly
| `Bug #2651 <https://redmine.postgresql.org/issues/2651>`_ - Ensure estimated rows are included correctly in CREATE script for functions
| `Bug #2679 <https://redmine.postgresql.org/issues/2679>`_ - Getting started links does not open second time if User open any URL and Click on Close button with cross bar
| `Bug #2705 <https://redmine.postgresql.org/issues/2705>`_ - User can add expirty date on Windows
| `Bug #2715 <https://redmine.postgresql.org/issues/2715>`_ - Ensure we can download large files and keep the user informed about progress
| `Bug #2720 <https://redmine.postgresql.org/issues/2720>`_ - Ensure password changes are successful if authenticating using a pgpass file
| `Bug #2726 <https://redmine.postgresql.org/issues/2726>`_ - Ensure the auto-complete selection list can display longer names
| `Bug #2738 <https://redmine.postgresql.org/issues/2738>`_ - Ensure line numbers form CodeMirror don't appear on top of menus
| `Bug #2748 <https://redmine.postgresql.org/issues/2748>`_ - Format JSON/JSONB nicely when displaying it in the grid editor pop-up
| `Bug #2760 <https://redmine.postgresql.org/issues/2760>`_ - When selecting an SSL cert or key, update only the expected path in the UI, not all of them
| `Bug #2765 <https://redmine.postgresql.org/issues/2765>`_ - Do not decrypt the password when the password is 'None'.  This should avoid the common but harmless exception "ValueError: IV must be 16 bytes long while decrypting the password."
| `Bug #2768 <https://redmine.postgresql.org/issues/2768>`_ - Only allow specification of a pgpass file if libpq >= 10
| `Bug #2769 <https://redmine.postgresql.org/issues/2769>`_ - Correct keyboard shortcut. Don't un-comment code with alt+. in the query tool. It's only supposed to respond to ctrl/cmd+
| `Bug #2772 <https://redmine.postgresql.org/issues/2772>`_ - Remove external links from Panel's context menu
| `Bug #2778 <https://redmine.postgresql.org/issues/2778>`_ - Ensure the datatype cache is updated when a domain is added
| `Bug #2779 <https://redmine.postgresql.org/issues/2779>`_ - Ensure column collation isn't lost when changing field size
| `Bug #2780 <https://redmine.postgresql.org/issues/2780>`_ - Ensure auto-indent honours the spaces/tabs config setting
| `Bug #2782 <https://redmine.postgresql.org/issues/2782>`_ - Re-hash the way that we handle rendering of special types such as arrays
| `Bug #2787 <https://redmine.postgresql.org/issues/2787>`_ - Quote the owner name when creating types
| `Bug #2806 <https://redmine.postgresql.org/issues/2806>`_ - Attempt to decode database errors based on lc_messages
| `Bug #2811 <https://redmine.postgresql.org/issues/2811>`_ - Display process output as it happens
| `Bug #2820 <https://redmine.postgresql.org/issues/2820>`_ - Logs available when executing backup and restore
| `Bug #2821 <https://redmine.postgresql.org/issues/2821>`_ - Attempt to decode database errors based on lc_messages
| `Bug #2822 <https://redmine.postgresql.org/issues/2822>`_ - Re-hash the way that we handle rendering of special types such as arrays.
| `Bug #2824 <https://redmine.postgresql.org/issues/2824>`_ - Fix a number of graphical explain rendering issues
| `Bug #2836 <https://redmine.postgresql.org/issues/2636>`_ - Fix counted rows display in table properties
| `Bug #2842 <https://redmine.postgresql.org/issues/2842>`_ - Fix a number of graphical explain rendering issues
| `Bug #2846 <https://redmine.postgresql.org/issues/2846>`_ - Add an option to manually count rows in tables to render the properties
| `Bug #2854 <https://redmine.postgresql.org/issues/2854>`_ - Fix utility output capture encoding
| `Bug #2859 <https://redmine.postgresql.org/issues/2859>`_ - Allow form validation messages to be close in case the eclipse anything on the form
| `Bug #2866 <https://redmine.postgresql.org/issues/2866>`_ - Ensure we don't show the full path on the server when using virtual filesystem roots in server mode for SSL certs
| `Bug #2875 <https://redmine.postgresql.org/issues/2875>`_ - Ensure the scroll location is retains in the query tool data grid if the user changes tab and then returns
| `Bug #2877 <https://redmine.postgresql.org/issues/2877>`_ - Remove the artificial limit of 4000 characters from text areas
| `Bug #2880 <https://redmine.postgresql.org/issues/2880>`_ - Honour whitespace properly in the data grid
| `Bug #2881 <https://redmine.postgresql.org/issues/2881>`_ - Fix support for time without timezone
| `Bug #2886 <https://redmine.postgresql.org/issues/2886>`_ - Resolve issue where Insert failed when tried with default primary key value
| `Bug #2891 <https://redmine.postgresql.org/issues/2891>`_ - Allow changing of the users password without leaving the app
| `Bug #2892 <https://redmine.postgresql.org/issues/2892>`_ - Refuse password changes (and tell the user) if the notification email cannot be sent
| `Bug #2908 <https://redmine.postgresql.org/issues/2908>`_ - Fix bundle creation on Windows which was failing due to \r\n line endings in code mirror
| `Bug #2918 <https://redmine.postgresql.org/issues/2918>`_ - Add missing init.py to backports.csv when building the MSVC windows build
| `Bug #2920 <https://redmine.postgresql.org/issues/2920>`_ - Push HTTPD logs to container stdout/stderr as appropriate
| `Bug #2921 <https://redmine.postgresql.org/issues/2921>`_ - Fixes in pgAgent module including; 1) allowing start date earlier than end date when scheduling job, 2) Datetime picker not displaying in grid and 3) validation error not displaying propertly for Datetime control
| `Bug #2922 <https://redmine.postgresql.org/issues/2922>`_ - Don't login the user with every request in desktop mode. Just do it once
| `Bug #2923 <https://redmine.postgresql.org/issues/2923>`_ - Prevent the user pressing the select button in the file manager when it is supposed to be disabled
| `Bug #2924 <https://redmine.postgresql.org/issues/2924>`_ - Cleanup the layout of the filter data dialogue
| `Bug #2928 <https://redmine.postgresql.org/issues/2928>`_ - Prevent multiple connections to new slow-to-respond servers being initiated in error
| `Bug #2934 <https://redmine.postgresql.org/issues/2934>`_ - Fix a reference before assignment error in the file dialogue
| `Bug #2937 <https://redmine.postgresql.org/issues/2937>`_ - Prevent attempts to select directories as files in the file dialogue
| `Bug #2945 <https://redmine.postgresql.org/issues/2945>`_ - Ensure invalid options can't be selected on triggers on views
| `Bug #2949 <https://redmine.postgresql.org/issues/2949>`_ - Display complete SQL for FTS dictionaries
| `Bug #2952 <https://redmine.postgresql.org/issues/2952>`_ - Don't try to render security URLs in desktop mode
| `Bug #2954 <https://redmine.postgresql.org/issues/2954>`_ - Allow selection of validation error text
| `Bug #2974 <https://redmine.postgresql.org/issues/2974>`_ - Clear the messages tab when running EXPLAIN/EXPLAIN ANALYZE
| `Bug #2993 <https://redmine.postgresql.org/issues/2993>`_ - Fix view data for views/mat views
