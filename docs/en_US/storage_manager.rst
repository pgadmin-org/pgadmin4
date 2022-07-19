.. _storage_manager:

************************
`Storage Manager`:index:
************************

*Storage Manager* is a feature that helps you manage your systems storage device. You can use *Storage Manager* to:

* Download, upload, or manage operating system files. To use this feature, *pgAdmin* must be running in *Server Mode* on your client machine.
* Download *backup* or *export* files (custom, tar and plain text format) on a client machine.
* Download *export* dump files of tables.

You can access *Storage Manager* from the *Tools* Menu.

.. image:: images/storage_manager.png
    :alt: Storage Manager
    :align: center

Use icons on the top of the *Storage Manager* window to manage storage:

Use the ``Home`` icon |home| to return to the home directory.

.. |home| image:: images/sm_home.png

Use the ``Up Arrow`` icon |uparrow| to return to the previous directory.

.. |uparrow| image:: images/sm_go_back.png

Use the ``Refresh`` icon |refresh| to display the most-recent files available.

.. |refresh| image:: images/sm_refresh.png

Select the ``Download`` icon |download| to download the selected file.

.. |download| image:: images/sm_download.png

Use the ``New Folder`` icon |folder| to add a new folder.

.. |folder| image:: images/sm_new_folder.png

Use the *Format* drop down list to select the format of the files to be displayed; choose from *sql*, *csv*, or *All Files*.

Other Options
*********************

.. image:: images/sm_options.png
    :alt: Other options
    :align: center

.. table::
   :class: longtable
   :widths: 1 5

   +----------------------+---------------------------------------------------------------------------------------------------+
   | Menu                 | Behavior                                                                                          |
   +======================+===================================================================================================+
   | *Rename*             | Click the *Rename* option to rename a file/folder.                                                |
   +----------------------+---------------------------------------------------------------------------------------------------+   
   | *Delete*             | Click the *Delete* option to rename a file/folder.                                                |
   +----------------------+---------------------------------------------------------------------------------------------------+
   | *Upload*             | Click the *Upload* option to upload multiple files to the current folder.                         |
   +----------------------+---------------------------------------------------------------------------------------------------+
   | *List View*          | Click the *List View* option to to display all the files and folders in a list view.              |
   +----------------------+---------------------------------------------------------------------------------------------------+
   | *Grid View*          | Click the *Grid View* option to to display all the files and folders in a grid view.              |
   +----------------------+---------------------------------------------------------------------------------------------------+
   | *Show Hidden Files*  | Click the *Show Hidden Files* option to view hidden files and folders.                            |
   +----------------------+---------------------------------------------------------------------------------------------------+


You can also download backup files through *Storage Manager* at the successful completion of the backups taken through :ref:`Backup Dialog <backup_dialog>`, :ref:`Backup Global Dialog <backup_globals_dialog>`, or :ref:`Backup Server Dialog <backup_server_dialog>`.

At the successful completion of a backup, click on the icon to open the current backup file in *Storage Manager* on the *process watcher* window.

.. image:: images/process_watcher_storage_manager.png
    :alt: Process watcher with storage manager icon
    :align: center
