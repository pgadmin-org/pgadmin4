***********
Version 1.1
***********

Release date: 2016-10-27

This release contains a number of features and fixes reported since the release of pgAdmin4 1.0;

Features
********

| `Feature #1328 <https://redmine.postgresql.org/issues/1328>`_ - Add Python 3.5 Support
| `Feature #1859 <https://redmine.postgresql.org/issues/1859>`_ - Include wait information on the activity tab of the dashboards

Bug fixes
*********

| `Bug #1155 <https://redmine.postgresql.org/issues/1155>`_ - Display the start value when the user creates sequence
| `Bug #1531 <https://redmine.postgresql.org/issues/1531>`_ - Fix to update privileges for Views and Materials Views where "string indices must be integers error" displayed
| `Bug #1574 <https://redmine.postgresql.org/issues/1574>`_ - Display SQL in SQL pane for security label in PG and EPAS server
| `Bug #1576 <https://redmine.postgresql.org/issues/1576>`_ - Make security label option available in procedure properties
| `Bug #1577 <https://redmine.postgresql.org/issues/1577>`_ - Make debug option available for package function and procedure
| `Bug #1596 <https://redmine.postgresql.org/issues/1596>`_ - Correct spelling error from evnt_turncate to evnt_truncate
| `Bug #1599 <https://redmine.postgresql.org/issues/1599>`_ - Ensure the grant wizard works with objects with special characters in the name
| `Bug #1622 <https://redmine.postgresql.org/issues/1622>`_ - Fix issue using special characters when creating synonym
| `Bug #1728 <https://redmine.postgresql.org/issues/1728>`_ - Properties refreshing after objects are edited
| `Bug #1739 <https://redmine.postgresql.org/issues/1739>`_ - Prevent the user from trying to.....
| `Bug #1785 <https://redmine.postgresql.org/issues/1785>`_ - Correctly identify server type upon first connection
| `Bug #1786 <https://redmine.postgresql.org/issues/1786>`_ - Ensure errorModel unset property is set correctly when adding a new server
| `Bug #1808 <https://redmine.postgresql.org/issues/1808>`_ - Set seconds to valid value in pgAgent job schedule
| `Bug #1817 <https://redmine.postgresql.org/issues/1817>`_ - Display message "server does not support ssl" if server with ca-cert or ca-full added
| `Bug #1821 <https://redmine.postgresql.org/issues/1821>`_ - Optionally sign both the Mac app bundle and the disk image
| `Bug #1822 <https://redmine.postgresql.org/issues/1822>`_ - Handle non-ascii responses from the server when connecting
| `Bug #1823 <https://redmine.postgresql.org/issues/1823>`_ - Attempt to sign the Windows installer, failing with a warning if there's no cert available
| `Bug #1824 <https://redmine.postgresql.org/issues/1824>`_ - Add documenation for pgAgent
| `Bug #1835 <https://redmine.postgresql.org/issues/1835>`_ - Allow users to choose SELECT permissions for tables and sequences in the grant wizard
| `Bug #1837 <https://redmine.postgresql.org/issues/1837>`_ - Fix refreshing of FTS dictionaries which was causing error "Connection to the server has been lost"
| `Bug #1838 <https://redmine.postgresql.org/issues/1838>`_ - Don't append new objects with the wrong parent in tree browser if the correct one isn't loaded
| `Bug #1843 <https://redmine.postgresql.org/issues/1843>`_ - Function definition matches value returned from pg_get_functiondef()
| `Bug #1845 <https://redmine.postgresql.org/issues/1845>`_ - Allow refreshing synonym node.  Does not display message "Unimplemented method (node) for this url (/browser/synonym/nodes/1/7/14301/2200/test)"
| `Bug #1847 <https://redmine.postgresql.org/issues/1847>`_ - Identify the collation correctly when reverse engineering table SQL.  ERROR:  schema "default" does not exist no longer displayed
| `Bug #1849 <https://redmine.postgresql.org/issues/1849>`_ - Remove security keys from config.py/config_local.py
| `Bug #1857 <https://redmine.postgresql.org/issues/1857>`_ - Fix error while renaming FTS dictionary and FTS template nodes
| `Bug #1858 <https://redmine.postgresql.org/issues/1858>`_ - Ensure the File Manager honours the file type while traversing the directories.
| `Bug #1861 <https://redmine.postgresql.org/issues/1861>`_ - Properly generate exclusion constraint SQL.
| `Bug #1863 <https://redmine.postgresql.org/issues/1863>`_ - Correctly quote type names in reverse engineered SQL for tables
| `Bug #1864 <https://redmine.postgresql.org/issues/1864>`_ - Fix layout of DateTimePicker control help message.
| `Bug #1867 <https://redmine.postgresql.org/issues/1867>`_ - Allow package bodies to be dropped.
| `Bug #1868 <https://redmine.postgresql.org/issues/1868>`_ - Resolved issue where Integer type of preferences are not updated
| `Bug #1872 <https://redmine.postgresql.org/issues/1872>`_ - Fix the file manager when used under Python 3.
| `Bug #1877 <https://redmine.postgresql.org/issues/1877>`_ - Ensure preferences values are stored properly.
| `Bug #1878 <https://redmine.postgresql.org/issues/1878>`_ - Ensure steps and schedules can be created in empty jobs.  ProgrammingError: can't adapt type 'Undefined' was displayed
| `Bug #1880 <https://redmine.postgresql.org/issues/1880>`_ - Add new indexes to the correct parent on the treeview.


