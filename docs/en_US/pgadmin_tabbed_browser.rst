.. _pgadmin_tabbed_browser:

**************************
The pgAdmin Tabbed Browser 
**************************

The right pane of the *pgAdmin* window features a collection of tabs that display information about the object currently selected in the *pgAdmin* tree control in the left window.  
   
Permanent tabs are named *Dashboard, *Properties*, *SQL*, *Statistics*, *Dependencies* and *Dependents*; each tab may be repositioned as a floating window. Select a tab to access information about the highlighted object in the tree control. 

.. image:: images/main_dashboard.png 

The *Dashboard* tab provides a graphical analysis of the usage statistics for the selected server or database:

* The *Server sessions* or *Database sessions* graph displays the interactions with the server or database.
* The *Transactions per second* graph displays the commits, rollbacks, and total transactions per second that are taking place on the server or database.
* The *Tuples In* graph displays the number of tuples inserted, updated, and deleted on the server or database.
* The *Tuples out* graph displays the number of tuples fetched and returned from the server or database.
* The *Block I/O* graph displays the number of blocks read from the filesystem or fetched from the buffer cache (but not the operating system's file system cache) for the server or database.

The *Server activity* panel displays information about sessions, locks, prepared transactions and configuration. The information is presented in context-sensitive tables.

Click the *Properties* tab to continue.

.. image:: images/main_properties_table.png

Review properties on expandable windows specific to the *Object* selected. If multiple boxes are displayed, you can click the arrow to the left on the blue bar at the top of each box:

 * Point the arrow to the right to contract the box.
 * Point the arrow down to expand the window. 

.. image:: images/main_properties_edit.png 

Click the *Edit* icon in the toolbar under the browser tabs to launch a dialog. 

.. image:: images/main_properties_icons.png

If you change properties in the opened dialog, save your work. The *Properties* tab updates to show recent modifications. 

Click the *SQL* tab to continue.

.. image:: images/main_sql.png

The SQL pane on the *SQL* tab contains an SQL script that creates the highlighted object, and if applicable, a (commented out) SQL statement that will *DROP* the selected object. You can copy the SQL statements to an editor of your choice using cut & paste shortcuts.

Click the *Statistics* tab to continue.

.. image:: images/main_statistics.png

The *Statistics* tab displays the statistics gathered for each object on the tree control; the statistics displayed in the table vary by the type of object that is selected. Click a column heading to sort the table by the data displayed in the column; click again to reverse the sort order.  The following table lists some of the statistics that are available:  

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

Click the *Dependencies* tab to continue.

.. image:: images/main_dependencies.png 

The *Dependencies* tab displays the objects on which the currently selected object depends. If a dependency is dropped, the object currently selected in the pgAdmin tree control will be affected. To ensure the integrity of the entire database structure, the database server makes sure that you do not accidentally drop objects that other objects depend on; you must use DROP CASCADE to remove an object with a dependency.

The *Dependencies* table displays the following information:

* The *Type* field specifies the parent object type.
* The *Name* field specifies the identifying name of the parent object.
* The *Restriction* field describes the dependency relationship between the currently selected object and the parent.
   * If the field is *auto*, the selected object can be dropped separately from the parent object, and will be dropped if the parent object is dropped.
   * If the field is *internal*, the selected object was created during the creation of the parent object, and will be dropped if the parent object is dropped.
   * If the field is *normal*, the selected object can be dropped without dropping the parent object.
   * If the field is *blank*, the selected object is required by the system, and cannot be dropped.
     
Click the *Dependents* tab to continue.

.. image:: images/main_dependents.png

The *Dependents* tab displays a table of objects that depend on the object currently selected in the *pgAdmin* browser. A dependent object can be dropped without affecting the object currently selected in the *pgAdmin* tree control.

* The *Type* field specifies the dependent object type.
* The *Name* field specifies the identifying name for the dependent object.
* The *Database* field specifies the database in which the object resides.

**Feature Tabs**

Additional *feature tabs* will open in the *pgAdmin* tabbed browser when you access the extended functionality offered by pgAdmin tools. For example, if you select the *Query tool* from *Tools* in the menu bar, pgAdmin will open the Query tool on a tab labeled *Query-1*. These feature tabs are not permanent and you can close them when you are finished using the tool. Like permanent tabs, these tabs may be repositioned.

.. image:: images/main_query_tool.png

