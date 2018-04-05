.. _editgrid:


***********************************
`Reviewing and Editing Data`:index:
***********************************

To review or modify data, right click on a table or view name in the *Browser* tree control.  When the context menu opens, use the *View/Edit Data* menu to specify the number of rows you would like to display in the editor panel.

.. image:: images/editgrid.png
    :alt: Edit grid window

To modify the content of a table, each row in the table must be uniquely identifiable. If the table definition does not include an OID or a primary key, the displayed data is read only. Note that views cannot be edited; updatable views (using rules) are not supported.

The editor features a toolbar that allows quick access to frequently used options, and a work environment divided into two panels:

* The upper panel displays the SQL command that was used to select the content displayed in the lower panel.
* The lower panel (the Data Grid) displays the data selected from the table or view.

**The View/Edit Data Toolbar**

The toolbar includes context-sensitive icons that provide shortcuts to frequently performed tasks.

.. image:: images/editgrid_toolbar.png
    :alt: Edit grid toolbar

Hover over an icon to display a tooltip that describes the icon's functionality.

+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| Icon                 | Behavior                                                                                          | Shortcut    |
+======================+===================================================================================================+=============+
| *Save*               | Use the *Save* icon to save your changes to the currently displayed table contents.               |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *Find*               | Use options on the *Find* menu to access Search and Replace functionality or to Jump to another   | Ctrl/Cmd +F |
|                      | line.                                                                                             |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *Copy*               | Click the *Copy* icon to copy the currently selected data.                                        | Ctrl+C      |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *Paste Row*          | Click the *Paste Row* icon to paste the content that is currently on the clipboard.               |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *Delete Row*         | Use the *Delete Row* icon to add a new row in the output panel.                                   |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *Filter*             | Click the *Filter* icon to open a dialog that allows you to write and apply a filter for the      |             |
|                      | content currently displayed in the output panel.  Click the down arrow to open the *Filter* drop- |             |
|                      | down menu and select from pre-defined options:                                                    |             |
|                      |                                                                                                   |             |
|                      |  Use options on the *Filter* menu to quick-sort or quick-filter the data set:                     |             |
|                      |                                                                                                   |             |
|                      |    * Filter: This option opens a dialog that allows you to define a filter.  A filter is a        |             |
|                      |      condition that is supplied to an arbitrary WHERE clause that restricts the result set.       |             |
|                      |                                                                                                   |             |
|                      |    * Remove Filter: This option removes all selection / exclusion filter conditions.              |             |
|                      |                                                                                                   |             |
|                      |    * By Selection: This option refreshes the data set and displays only those rows whose          |             |
|                      |      column value matches the value in the cell currently selected.                               |             |
|                      |                                                                                                   |             |
|                      |    * Exclude Selection: This option refreshes the data set and excludes those rows whose          |             |
|                      |      column value matches the value in the cell currently selected.                               |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *No limit*           | Use the *No limit* drop-down listbox to specify how many rows to display in the output panel.     |             |
|                      | Select from: *No limit* (the default), *1000 rows*, *500 rows*, or *100 rows*.                    |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *Execute/Refresh*    | Click the *Execute/Refresh* icon to execute the SQL command that is displayed in the top panel.   | F5          |
|                      | If you have not saved modifications to the content displayed in the data grid, you will be        |             |
|                      | prompted to confirm the execution.  To preserve your changes before refreshing the content, click |             |
|                      | the *Save* toolbar button before executing the refresh.                                           |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *Stop*               | Click the *Stop* icon to cancel the execution of the currently running query.                     |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *Clear query window* | Use the *Clear query window* drop-down menu to erase the contents of the *History* tab.           |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+
| *Download as CSV*    | Click the *Download as CSV* icon to download the result set of the current query to a             | F8          |
|                      | comma-separated list. You can control the CSV settings through                                    |             |
|                      | *Preferences -> SQL Editor -> CSV output* dialogue.                                               |             |
+----------------------+---------------------------------------------------------------------------------------------------+-------------+

**The Data Grid**

The top row of the data grid displays the name of each column, the data type, and if applicable, the number of characters allowed. A column that is part of the primary key will additionally be marked with [PK].

To modify the displayed data:

* To change a numeric value within the grid, double-click the value to select the field.  Modify the content in the square in which it is displayed.
* To change a non-numeric value within the grid, double-click the content to access the edit bubble.  After modifying the contentof the edit bubble, click the *Save* button to display your changes in the data grid, or *Cancel* to exit the edit bubble without saving.

To enter a newline character, click Ctrl-Enter or Shift-Enter.  Newline formatting is only displayed when the field content is accessed via an edit bubble.

To add a new row to the table, enter data into the last (unnumbered) row of the table. As soon as you store the data, the row is assigned a row number, and a fresh empty line is added to the data grid.

To write a SQL NULL to the table, simply leave the field empty. When you store the new row, the will server fill in the default value for that column. If you store a change to an existing row, the value NULL will explicitly be written.

To write an empty string to the table, enter the special string '' (two single quotes) in the field. If you want to write a string containing solely two single quotes to the table, you need to escape these quotes, by typing \'\'

To delete a row, press the *Delete* toolbar button.  A popup will open, asking you to confirm the deletion.

To commit the changes to the server, select the *Save* toolbar button.  Modifications to a row are written to the server automatically when you select a different row.

**Sort/Filter options dialog**

You can access *Sort/Filter options dialog* by clicking on Sort/Filter button. This allows you to specify an SQL Filter to limit the data displayed and data sorting options in the edit grid window:

.. image:: images/editgrid_filter_dialog.png
    :alt: Edit grid filter dialog window

* Use *SQL Filter* to provide SQL filtering criteria. These will be added to the "WHERE" clause of the query used to retrieve the data. For example, you might enter:

.. code-block:: sql

    id > 25 AND created > '2018-01-01'

* Use *Data Sorting* to sort the data in the output grid

To add new column(s) in data sorting grid, click on the [+] icon.

* Use the drop-down *Column* to select the column you want to sort.
* Use the drop-down *Order* to select the sort order for the column.

To delete a row from the grid, click the trash icon.

* Click the *Help* button (?) to access online help.
* Click the *Ok* button to save work.
* Click the *Close* button to discard current changes and close the dialog.

