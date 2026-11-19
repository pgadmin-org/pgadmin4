.. _tabbed_browser:

***********************
`Tabbed Browser`:index:
***********************

The right pane of the *pgAdmin* window features a collection of tabs that
display information about the object currently selected in the *pgAdmin* tree
control in the left window.  Select a tab to access information about the
highlighted object in the tree control.

The *Dashboard* tab provides an active analysis of system statistics and usage
statistics for the selected server or database.  See the
:ref:`Dashboard <dashboard>` page for details.

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
