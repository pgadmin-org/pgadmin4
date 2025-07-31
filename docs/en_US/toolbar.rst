.. _toolbar:

****************
`Toolbar`:index:
****************

The pgAdmin toolbar provides shortcut buttons for frequently used features like
the Query Tool, View/Edit Data, Search Object and the PSQL Tool. This
toolbar is visible on the Object explorer panel. Buttons get enabled/disabled based on
the selected object node.

.. image:: /images/toolbar.png
    :alt: pgAdmin Toolbar
    :align: center

* Use the :ref:`Object filter <object-explorer-filter>` button to access
  the Object Filter popup. It helps you filter objects in the Object Explorer tree.
* Use the :ref:`Query Tool <query_tool>` button to open the Query Tool in the
  current database context.
* Use the :ref:`View Data <editgrid>` button to view/edit the data stored in a
  selected table.
* Use the :ref:`Filtered Rows <viewdata_filter>` button to access the Data Filter popup
  to apply a filter to a set of data for viewing/editing.
* Use the :ref:`Search objects <search_objects>` button to access the search objects
  dialog. It helps you search any database object.
* Use the :ref:`PSQL Tool <psql_tool>` button to open the PSQL in the current
  database context.



.. _object-explorer-filter:

*******************************
`Object Explorer Filter`:index:
*******************************
.. image:: /images/object_explorer_filter.png
  :alt: Object Explorer Filter Dialog
  :align: center

Use this tool to filter objects in the Object Explorer by
following fields:

* Use the *Tags* field to filter the servers with one or more server tags. The
  servers with any of the selected tags will be displayed in the Object Explorer.
  You can also create a new tag by typing in the field and pressing Enter.

Click the **Apply** button to apply the filter. Please note the object explorer will
refresh after applying the filter.