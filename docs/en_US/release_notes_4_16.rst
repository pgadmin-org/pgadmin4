************
Version 4.16
************

Release date: 2019-12-12

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.15.

.. warning:: Warning: This release includes a change to the container
    distribution to run pgAdmin as a non-root user. Those users of the
    container who are running with mapped storage directories may need to
    change the ownership on the host machine, for example:

    .. code-block:: bash

        sudo chown -R 5050:5050 <host_directory>

New features
************

| `Issue #4396 <https://redmine.postgresql.org/issues/4396>`_ -  Warn the user on changing the definition of Materialized View about the loss of data and its dependent objects.
| `Issue #4435 <https://redmine.postgresql.org/issues/4435>`_ -  Allow drag and drop functionality for all the nodes under the database node, excluding collection nodes.
| `Issue #4711 <https://redmine.postgresql.org/issues/4711>`_ -  Use a 'play' icon for the Execute Query button in the Query Tool for greater consistency with other applications.
| `Issue #4772 <https://redmine.postgresql.org/issues/4772>`_ -  Added aria-label to provide an invisible label where a visible label cannot be used.
| `Issue #4773 <https://redmine.postgresql.org/issues/4773>`_ -  Added role="status" attribute to all the status messages for accessibility.
| `Issue #4939 <https://redmine.postgresql.org/issues/4939>`_ -  Run pgAdmin in the container as a non-root user (pgadmin, UID: 5050)
| `Issue #4944 <https://redmine.postgresql.org/issues/4944>`_ -  Allow Gunicorn logs in the container to be directed to a file specified through GUNICORN_ACCESS_LOGFILE.
| `Issue #4990 <https://redmine.postgresql.org/issues/4990>`_ -  Changed the open query tool and data filter icons.

Housekeeping
************

| `Issue #4696 <https://redmine.postgresql.org/issues/4696>`_ -  Add Reverse Engineered and Modified SQL tests for Materialized Views.
| `Issue #4807 <https://redmine.postgresql.org/issues/4807>`_ -  Refactored code of table and it's child nodes.
| `Issue #4938 <https://redmine.postgresql.org/issues/4938>`_ -  Refactored code of columns node.

Bug fixes
*********

| `Issue #3538 <https://redmine.postgresql.org/issues/3538>`_ -  Fix issue where the Reset button does not get enabled till all the mandatory fields are provided in the dialog.
| `Issue #4220 <https://redmine.postgresql.org/issues/4220>`_ -  Fix scrolling issue in 'Users' dialog.
| `Issue #4516 <https://redmine.postgresql.org/issues/4516>`_ -  Remove the sorting of table headers with no labels.
| `Issue #4659 <https://redmine.postgresql.org/issues/4659>`_ -  Updated documentation for default privileges to clarify more on the grantor.
| `Issue #4674 <https://redmine.postgresql.org/issues/4674>`_ -  Fix query tool launch error if user name contains HTML characters. It's a regression.
| `Issue #4724 <https://redmine.postgresql.org/issues/4724>`_ -  Fix network disconnect issue while establishing the connection via SSH Tunnel and it impossible to expand the Servers node.
| `Issue #4761 <https://redmine.postgresql.org/issues/4761>`_ -  Fix an issue where the wrong type is displayed when changing the datatype from timestamp with time zone to timestamp without time zone.
| `Issue #4792 <https://redmine.postgresql.org/issues/4792>`_ -  Ensure that the superuser should be able to create database, as the superuser overrides all the access restrictions.
| `Issue #4818 <https://redmine.postgresql.org/issues/4818>`_ -  Fix server connection drops out issue in query tool.
| `Issue #4836 <https://redmine.postgresql.org/issues/4836>`_ -  Updated the json file name from 'servers.json' to 'pgadmin4/servers.json' in the container deployment section of the documentation.
| `Issue #4878 <https://redmine.postgresql.org/issues/4878>`_ -  Ensure that the superuser should be able to create role, as the superuser overrides all the access restrictions.
| `Issue #4893 <https://redmine.postgresql.org/issues/4893>`_ -  Fix reverse engineering SQL issue for partitions when specifying digits as comments.
| `Issue #4923 <https://redmine.postgresql.org/issues/4923>`_ -  Enhance the logic to change the label from 'Delete/Drop' to 'Remove' for the server and server group node.
| `Issue #4925 <https://redmine.postgresql.org/issues/4925>`_ -  Shown some text on process watcher till the initial logs are loaded.
| `Issue #4926 <https://redmine.postgresql.org/issues/4926>`_ -  Fix VPN network disconnect issue where pgAdmin4 hangs on expanding the Servers node.
| `Issue #4930 <https://redmine.postgresql.org/issues/4930>`_ -  Fix main window tab navigation accessibility issue.
| `Issue #4933 <https://redmine.postgresql.org/issues/4933>`_ -  Ensure that the Servers collection node should expand independently of server connections.
| `Issue #4934 <https://redmine.postgresql.org/issues/4934>`_ -  Fix the help button link on the User Management dialog.
| `Issue #4935 <https://redmine.postgresql.org/issues/4935>`_ -  Fix accessibility issues.
| `Issue #4947 <https://redmine.postgresql.org/issues/4947>`_ -  Fix XSS issue in explain and explain analyze for table and type which contain HTML.
| `Issue #4952 <https://redmine.postgresql.org/issues/4952>`_ -  Fix an issue of retrieving properties for Compound Triggers. It's a regression of #4006.
| `Issue #4953 <https://redmine.postgresql.org/issues/4953>`_ -  Fix an issue where pgAdmin4 unable to retrieve table node if the trigger is already disabled and the user clicks on Enable All.
| `Issue #4958 <https://redmine.postgresql.org/issues/4958>`_ -  Fix reverse engineering SQL issue for triggers when passed a single argument to trigger function.
| `Issue #4964 <https://redmine.postgresql.org/issues/4964>`_ -  Fix an issue where length and precision are not removed from table/column dialog.
| `Issue #4965 <https://redmine.postgresql.org/issues/4965>`_ -  Fix an issue where the Interval data type is not displayed in the properties dialog of table/column.
| `Issue #4966 <https://redmine.postgresql.org/issues/4966>`_ -  Fix 'Could not find the object on the server.' error while refreshing the check constraint.
| `Issue #4975 <https://redmine.postgresql.org/issues/4975>`_ -  Fix issue where the user can not switch the UI language. It's a regression of #4348.
| `Issue #4976 <https://redmine.postgresql.org/issues/4976>`_ -  Fix reverse engineering SQL issue where when clause is not visible for PG/EPAS 12.
| `Issue #4978 <https://redmine.postgresql.org/issues/4978>`_ -  Fix pgAdmin4 failed to start issue after upgrading to version 4.15.
| `Issue #4982 <https://redmine.postgresql.org/issues/4982>`_ -  Added statistics and storage information in reverse engineering SQL of table/column.
| `Issue #4985 <https://redmine.postgresql.org/issues/4985>`_ -  Fix an issue where the inherited table name with quotes did not escape correctly.
| `Issue #4991 <https://redmine.postgresql.org/issues/4991>`_ -  Fix an issue where context menu is open along with submenu and the focus is not on context menu or submenu.
