***********
Version 1.1
***********

Release date: 2016-10-27

This release contains a number of features and fixes reported since the release
of pgAdmin4 1.0;

Features
********

| `Issue #1328 <https://redmine.postgresql.org/issues/1328>`_ - Add Python 3.5 Support
| `Issue #1859 <https://redmine.postgresql.org/issues/1859>`_ - Include wait information on the activity tab of the dashboards

Bug fixes
*********

| `Issue #1155 <https://redmine.postgresql.org/issues/1155>`_ - Display the start value when the user creates sequence
| `Issue #1531 <https://redmine.postgresql.org/issues/1531>`_ - Fix to update privileges for Views and Materials Views where "string indices must be integers error" displayed
| `Issue #1574 <https://redmine.postgresql.org/issues/1574>`_ - Display SQL in SQL pane for security label in PG and EPAS server
| `Issue #1576 <https://redmine.postgresql.org/issues/1576>`_ - Make security label option available in procedure properties
| `Issue #1577 <https://redmine.postgresql.org/issues/1577>`_ - Make debug option available for package function and procedure
| `Issue #1596 <https://redmine.postgresql.org/issues/1596>`_ - Correct spelling error from evnt_turncate to evnt_truncate
| `Issue #1599 <https://redmine.postgresql.org/issues/1599>`_ - Ensure the grant wizard works with objects with special characters in the name
| `Issue #1622 <https://redmine.postgresql.org/issues/1622>`_ - Fix issue using special characters when creating synonym
| `Issue #1728 <https://redmine.postgresql.org/issues/1728>`_ - Properties refreshing after objects are edited
| `Issue #1739 <https://redmine.postgresql.org/issues/1739>`_ - Prevent the user from trying to.....
| `Issue #1785 <https://redmine.postgresql.org/issues/1785>`_ - Correctly identify server type upon first connection
| `Issue #1786 <https://redmine.postgresql.org/issues/1786>`_ - Ensure errorModel unset property is set correctly when adding a new server
| `Issue #1808 <https://redmine.postgresql.org/issues/1808>`_ - Set seconds to valid value in pgAgent job schedule
| `Issue #1817 <https://redmine.postgresql.org/issues/1817>`_ - Display message "server does not support ssl" if server with ca-cert or ca-full added
| `Issue #1821 <https://redmine.postgresql.org/issues/1821>`_ - Optionally sign both the Mac app bundle and the disk image
| `Issue #1822 <https://redmine.postgresql.org/issues/1822>`_ - Handle non-ascii responses from the server when connecting
| `Issue #1823 <https://redmine.postgresql.org/issues/1823>`_ - Attempt to sign the Windows installer, failing with a warning if there's no cert available
| `Issue #1824 <https://redmine.postgresql.org/issues/1824>`_ - Add documenation for pgAgent
| `Issue #1835 <https://redmine.postgresql.org/issues/1835>`_ - Allow users to choose SELECT permissions for tables and sequences in the grant wizard
| `Issue #1837 <https://redmine.postgresql.org/issues/1837>`_ - Fix refreshing of FTS dictionaries which was causing error "Connection to the server has been lost"
| `Issue #1838 <https://redmine.postgresql.org/issues/1838>`_ - Don't append new objects with the wrong parent in tree browser if the correct one isn't loaded
| `Issue #1843 <https://redmine.postgresql.org/issues/1843>`_ - Function definition matches value returned from pg_get_functiondef()
| `Issue #1845 <https://redmine.postgresql.org/issues/1845>`_ - Allow refreshing synonym node.  Does not display message "Unimplemented method (node) for this url (/browser/synonym/nodes/1/7/14301/2200/test)"
| `Issue #1847 <https://redmine.postgresql.org/issues/1847>`_ - Identify the collation correctly when reverse engineering table SQL.  ERROR:  schema "default" does not exist no longer displayed
| `Issue #1849 <https://redmine.postgresql.org/issues/1849>`_ - Remove security keys from config.py/config_local.py
| `Issue #1857 <https://redmine.postgresql.org/issues/1857>`_ - Fix error while renaming FTS dictionary and FTS template nodes
| `Issue #1858 <https://redmine.postgresql.org/issues/1858>`_ - Ensure the File Manager honours the file type while traversing the directories.
| `Issue #1861 <https://redmine.postgresql.org/issues/1861>`_ - Properly generate exclusion constraint SQL.
| `Issue #1863 <https://redmine.postgresql.org/issues/1863>`_ - Correctly quote type names in reverse engineered SQL for tables
| `Issue #1864 <https://redmine.postgresql.org/issues/1864>`_ - Fix layout of DateTimePicker control help message.
| `Issue #1867 <https://redmine.postgresql.org/issues/1867>`_ - Allow package bodies to be dropped.
| `Issue #1868 <https://redmine.postgresql.org/issues/1868>`_ - Resolved issue where Integer type of preferences are not updated
| `Issue #1872 <https://redmine.postgresql.org/issues/1872>`_ - Fix the file manager when used under Python 3.
| `Issue #1877 <https://redmine.postgresql.org/issues/1877>`_ - Ensure preferences values are stored properly.
| `Issue #1878 <https://redmine.postgresql.org/issues/1878>`_ - Ensure steps and schedules can be created in empty jobs.  ProgrammingError: can't adapt type 'Undefined' was displayed
| `Issue #1880 <https://redmine.postgresql.org/issues/1880>`_ - Add new indexes to the correct parent on the treeview.


