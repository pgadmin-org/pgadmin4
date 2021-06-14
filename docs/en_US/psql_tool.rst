.. _psql_tool:

******************
`PSQL Tool`:index:
******************

PSQL tool allows user to connect to PostgreSQL/EDB Advanced server using psql terminal.

* Open PSQL Tool from Tools menu or PSQL tool button from browser tree or from context menu.

* PSQL will connect to the current connected database from browser tree.

* PSQL utility does support execution of OS meta-commands by using "\\!". Due
  to security concerns, we have disabled the execution of such commands in
  pgAdmin. To enable OS meta-commands set ALLOW_PSQL_SHELL_COMMANDS = True in configuration.

.. image:: images/psql_tool.png
    :alt: PSQL tool window
    :align: center

You can open multiple instance of the PSQL tool in individual tabs simultaneously.
To close the PSQL tool, click the *X* in the upper-right hand corner of the tab bar.

**Note:** For the Windows platform, this feature is available on Windows 10 (1809 version) and onwards.

