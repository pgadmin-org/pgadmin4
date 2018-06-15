.. _backup_server_dialog:

*****************************
`Backup Server Dialog`:index:
*****************************

Use the *Backup Server* dialog to create a plain-text script that will recreate the selected server. You can use the pgAdmin *Query Tool* to play back a plain-text script, and recreate the server.

.. image:: images/backup_server_general.png
    :alt: Backup server dialog

Use the fields in the *General* tab to specify the following:

* Enter the name of the backup file in the *Filename* field.  Optionally, select the *Browser* icon (ellipsis) to the right to navigate into a directory and select a file that will contain the archive.
* Use the drop-down listbox next to *Role name* to specify a role with connection privileges on the selected server.  The role will be used for authentication during the backup.

Move switches in the *Miscellaneous* box to specify the type of statements that should be included in the backup.

* Move the *Verbose messages* switch to the *No* position to exclude status messages from the backup. The default is *Yes*.
* Move the *Force double quote on identifiers* switch to the *Yes* position to name identifiers without changing case. The default is *No*.

Click the *Backup* button to build and execute a command based on your selections; click the *Cancel* button to exit without saving work.

.. image:: images/backup_server_messages.png
    :alt: Backup server success notification popup

If the backup is successful, a popup window will confirm success. Click *Click here for details* on the popup window to launch the *Process Watcher*. The *Process Watcher* logs all the activity associated with the backup and provides additional information for troubleshooting.

.. image:: images/backup_server_process_watcher.png
    :alt:  Backup server process watcher

If the backup is unsuccessful, review the error message returned by the *Process Watcher* to resolve any issue.