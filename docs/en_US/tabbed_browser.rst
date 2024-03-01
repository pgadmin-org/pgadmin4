.. _tabbed_browser:

***********************
`Tabbed Browser`:index:
***********************

The right pane of the *pgAdmin* window features a collection of tabs that
display information about the object currently selected in the *pgAdmin* tree
control in the left window.  Select a tab to access information about the
highlighted object in the tree control.

.. image:: images/main_dashboard_general.png
    :alt: Dashboard panel
    :align: center

The graphs and tables on the *Dashboard* tab provides an active analysis of system statistics and the usage
statistics for the selected server or database.

Click the *General* tab to get the usage statistics for the selected server or database:

* The *Server sessions* or *Database sessions* graph displays the interactions
  with the server or database.
* The *Transactions per second* graph displays the commits, rollbacks, and
  total transactions per second that are taking place on the server or database.
* The *Tuples in* graph displays the number of tuples inserted, updated, and
  deleted on the server or database.
* The *Tuples out* graph displays the number of tuples fetched and returned
  from the server or database.
* The *Block I/O* graph displays the number of blocks read from the filesystem
  or fetched from the buffer cache (but not the operating system's file system
  cache) for the server or database.

The *Server activity* panel displays information about sessions, locks, prepared
transactions, and server configuration (if applicable). The information is
presented in context-sensitive tables.  Use controls located above the table to:

* Click the *Refresh* button to update the information displayed in each table.
* Select *Active sessions only* checkbox to get the information about active sessions only from the list of all the sessions.
* Enter a value in the *Search* box to restrict the table content to one or more
  sessions that satisfy the search criteria.  For example, you can enter a
  process ID to locate a specific session, or a session state (such as *idle*)
  to locate all of the sessions that are in an idle state.

You can use icons in the *Sessions* table to review or control the state of a
session:

* Use the *Terminate* icon (located in the first column) to stop a session and
  remove the session from the table.  Before the server terminates the session,
  you will be prompted to confirm your selection.
* Use the *Cancel* icon (located in the second column) to terminate an active
  query without closing the session.  Before canceling the query, the server
  will prompt you to confirm your selection.  When you cancel a query, the
  value displayed in the *State* column of the table will be updated from
  *Active* to *Idle*.  The session will remain in the table until the session is
  terminated.
* Use the *Details* icon (located in the third column) to open the *Details*
  tab; the tab displays information about the selected session.

Click the *System Statistics* tab to get the statistics for the system:

.. image:: images/main_dashboard_sys_statistics_summary.png
    :alt: Summary panel
    :align: center

Click the *Summary* tab to get the summary of the system:

* The *OS Information* table displays the basic information about the operating system.
* The *CPU Information* table displays the information about system CPU.
* The *Process & Handle Count* graph displays the total count of processes running and handles opened for the system.

.. image:: images/main_dashboard_sys_statistics_cpu.png
    :alt: CPU panel
    :align: center

Click the *CPU* tab to get the detailed usage statistics of the system CPU:

* The *CPU Usage* graph displays the percentage of time spent by CPU for user normal process, user niced process, kernel mode process, idle mode.
* The *Load average* graph displays the average load of the system over 1, 5, 10, and 15 minute intervals.
* The *Process CPU Usage* table displays information about CPU for each process ID. Enter a value like process ID or name in the Search box to restrict the table content to one or more processes that satisfy the search criteria.

.. image:: images/main_dashboard_sys_statistics_memory.png
    :alt: Memory panel
    :align: center

Click the *Memory* tab to get the detailed usage statistics of the system memory:

* The *Memory Usage* graph displays the size of total, free and used memory per seconds in Gigabytes.
* The *Swap Memory* graph displays the size of total, free and used swap memory per seconds in Gigabytes.
* The *Process Memory Usage* table displays information about memory for each process ID. Enter a value like process ID or name in the Search box to restrict the table content to one or more processes that satisfy the search criteria.

.. image:: images/main_dashboard_sys_statistics_storage.png
    :alt: Storage panel
    :align: center

Click the *Storage* tab to get the detailed information of the system storage:

* The *Disk Information* table displays the information about the disk, such as file system type, mount point, total space, used space and free space and count of total, free, used inodes. The pie graph shows the total spaces in Gigabytes and stacked bar graph shows the used and available space in Gigabytes, for different mount points for file system.
* The *Swap Memory* graph displays the size of total, free and used swap memory per seconds in Gigabytes.

The *disk0* panel displays statistics about the only I/O block device of system:

* The *I/O Operations Count* graph displays the count of read and write operations per second.
* The *Data Transfer* graph displays the size of read and writes happened in Gigabytes per second.
* The *Time spent in I/O operations* graph displays the time spent by the device for reading and writing in minutes per second.


.. image:: images/main_properties_table.png
    :alt: Properties panel
    :align: center

The *Properties* tab displays information about the object selected.

Click the *Delete* icon in the toolbar under the browser tab to delete the
selected objects in the Properties panel.

Click the *Drop Cascade* icon in the toolbar under the browser tab to delete the
selected objects and all dependent objects in the Properties panel.

.. image:: images/main_properties_icons.png
    :alt: Object editor icon
    :align: center

Click the *Edit* icon in the toolbar under the browser tabs to launch the
*Properties* dialog for the selected object.

To preserve any changes to the *Properties* dialog, click the *Save* icon; your
modifications will be displayed in the updated *Properties* tab.

.. image:: images/main_properties_edit.png
    :alt: Object editor window
    :align: center

Details about the object highlighted in the tree control are displayed in one or
more collapsible panels. You can use the arrow to the left of each panel label
to open or close a panel.

.. image:: images/main_sql.png
    :alt: SQL panel
    :align: center

The *SQL* tab displays the SQL script that created the highlighted object, and
when applicable, a (commented out) SQL statement that will *DROP* the selected
object. You can copy the SQL statements to the editor of your choice using cut
and paste shortcuts.

.. image:: images/main_statistics.png
    :alt: Statistics panel
    :align: center

The *Statistics* tab displays the statistics gathered for each object on the
tree control; the statistics displayed in the table vary by the type of object
that is selected. Click a column heading to sort the table by the data displayed
in the column; click again to reverse the sort order.  The following table lists
some of the statistics that are available:

.. table::
   :class: longtable
   :widths: 1 4

   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | Panel                      | Description                                                                                                |
   +============================+============================================================================================================+
   | *PID*                      | The process ID associated with the row.                                                                    |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *User*                     | The name of the user that owns the object.                                                                 |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Database*                 | displays the database name.                                                                                |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Backends*                 | displays the number of current connections to the database.                                                |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Backend start*            | The start time of the backend process.                                                                     |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Xact Committed*           | displays the number of transactions committed to the database within the last week.                        |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Xact Rolled Back*         | displays the number of transactions rolled back within the last week.                                      |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Blocks Read*              | displays the number of blocks read from memory (in megabytes) within the last week.                        |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Blocks Hit*               | displays the number of blocks hit in the cache (in megabytes) within the last week.                        |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Tuples Returned*          | displays the number of tuples returned within the last week.                                               |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Tuples Fetched*           | displays the number of tuples fetched within the last week.                                                |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Tuples Inserted*          | displays the number of tuples inserted into the database within the last week.                             |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Tuples Updated*           | displays the number of tuples updated in the database within the last week.                                |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Tuples Deleted*           | displays the number of tuples deleted from the database within the last week.                              |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Last statistics reset*    | displays the time of the last statistics reset for the database.                                           |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Tablespace conflicts*     | displays the number of queries canceled because of recovery conflict with dropped tablespaces in database. |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Lock conflicts*           | displays the number of queries canceled because of recovery conflict with locks in database.               |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Snapshot conflicts*       | displays the number of queries canceled because of recovery conflict with old snapshots in database.       |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Bufferpin conflicts*      | displays the number of queries canceled because of recovery conflict with pinned buffers in database.      |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Temporary files*          | displays the total number of temporary files, including those used by the statistics collector.            |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Size of temporary files*  | displays the size of the temporary files.                                                                  |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Deadlocks*                | displays the number of queries canceled because of a recovery conflict with deadlocks in database.         |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Block read time*          | displays the number of milliseconds required to read the blocks read.                                      |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Block write time*         | displays the number of milliseconds required to write the blocks read.                                     |
   +----------------------------+------------------------------------------------------------------------------------------------------------+
   | *Size*                     | displays the size (in megabytes) of the selected database.                                                 |
   +----------------------------+------------------------------------------------------------------------------------------------------------+

.. image:: images/main_dependencies.png
    :alt: Dependencies panel
    :align: center

The *Dependencies* tab displays the objects on which the currently selected
object depends. If a dependency is dropped, the object currently selected in
the pgAdmin tree control will be affected. To ensure the integrity of the entire
database structure, the database server makes sure that you do not accidentally
drop objects that other objects depend on; you must use the DROP CASCADE command
to remove an object with a dependency.

The *Dependencies* table displays the following information:

* The *Type* field specifies the parent object type.
* The *Name* field specifies the identifying name of the parent object.
* The *Restriction* field describes the dependency relationship between the
  currently selected object and the parent:

   * If the field is *auto*, the selected object can be dropped separately from
     the parent object, and will be dropped if the parent object is dropped.
   * If the field is *internal*, the selected object was created during the
     creation of the parent object, and will be dropped if the parent object
     is dropped.
   * If the field is *normal*, the selected object can be dropped without
     dropping the parent object.
   * If the field is *blank*, the selected object is required by the system,
     and cannot be dropped.

.. image:: images/main_dependents.png
    :alt: Dependents panel
    :align: center

The *Dependents* tab displays a table of objects that depend on the object
currently selected in the *pgAdmin* browser. A dependent object can be dropped
without affecting the object currently selected in the *pgAdmin* tree control.

* The *Type* field specifies the dependent object type.
* The *Name* field specifies the identifying name for the dependent object.
* The *Database* field specifies the database in which the object resides.

.. image:: images/main_query_tool.png
    :alt: Query tool panel
    :align: center

Additional tabs open when you access the extended functionality offered by
pgAdmin tools (such as the Query tool, Debugger, or SQL editor). Use the close
icon (X) located in the upper-right corner of each tab to close the tab when you
are finished using the tool. Like permanent tabs, these tabs may be repositioned
in the pgAdmin client window.

By default, each time you open a tool, pgAdmin will open a new browser tab. You
can control this behavior by modifying the *Display* node of the *Preferences*
dialog for each tool. To open the *Preferences* dialog, select *Preferences*
from the *File* menu.
