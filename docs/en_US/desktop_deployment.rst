.. _desktop_deployment:

******************
Desktop Deployment
******************

pgAdmin may be deployed as a desktop application by configuring the application
to run in desktop mode and then utilising the desktop runtime to host and
display the program on a supported Windows, Mac OS X or Linux installation.

**Note: Pre-compiled and configured installation packages are available for
a number of platforms. These packages should be used by end-users whereever
possible - the following information is useful for the maintainers of those
packages and users interested in understanding how pgAdmin works.**

Configuration
*************

From pgAdmin 4 v2 onwards, the default configuration mode is server, however,
this is overridden by the desktop runtime at startup. In most environments, no
Python configuration is required unless you wish to override other default
settings.

There are multiple configuration files that are read at startup by pgAdmin. These
are as follows:

* ``config.py``: This is the main configuration file, and should not be modified.
  It can be used as a reference for configuration settings, that may be overridden
  in one of the following files.

* ``config_distro.py``: This file is read after ``config.py`` and is intended for
  packagers to change any settings that are required for their pgAdmin distribution.
  This may typically include certain paths and file locations.

* ``config_local.py``: This file is read after ``config_distro.py`` and is intended
  for end users to change any default or packaging specific settings that they may
  wish to adjust to meet local preferences or standards.

NOTE: If the SERVER_MODE setting is changed in ``config_distro.py`` or ``config_local.py``,
you will most likely need to re-set the LOG_FILE, SQLITE_PATH, SESSION_DB_PATH
and STORAGE_DIR values as well as they will have been set based on the default
configuration or overridden by the runtime.

Runtime
-------

When executed, the runtime will automatically try to execute the pgAdmin Python
application. If execution fails, it will prompt you to adjust the Python Path
to include the directories containing the pgAdmin code as well as any additional
Python dependencies. You can enter a list of paths by separating them with a
semi-colon character, for example:

.. code-block:: bash

     /Users/dpage/.virtualenvs/pgadmin4/lib/python2.7/site-packages/;/Users/dpage/python-libs/
    
The configuration settings are stored using the QSettings class in Qt, which
will use an INI file on Unix systems (~/.config/pgadmin/pgadmin4.conf),
a plist file on Mac OS X (~/Library/Preferences/org.pgadmin.pgadmin4.plist),
and the registry on Windows (HKEY_CURRENT_USER\\Software\\pgadmin\\pgadmin4).

The configuration settings:

+--------------------------+--------------------+---------------------------------------------------------------+
| Key                      | Type               | Purpose                                                       |
+==========================+====================+===============================================================+
| ApplicationPath          | String             | The directory containing pgAdmin4.py                          |
+--------------------------+--------------------+---------------------------------------------------------------+
| ConnectionTimeout        | Integer            | The number of seconds to wait for application server startup. |
+--------------------------+--------------------+---------------------------------------------------------------+
| PythonPath               | String             | The Python module search path                                 |
+--------------------------+--------------------+---------------------------------------------------------------+
| Browser/Geometry         | Binary             | The runtime window's size/shape                               |
+--------------------------+--------------------+---------------------------------------------------------------+
| Browser/WindowState      | Binary             | The runtime window's state                                    |
+--------------------------+--------------------+---------------------------------------------------------------+
| Browser/Zoom             | String             | The runtime window's zoom level (zoom % / 100)                |
+--------------------------+--------------------+---------------------------------------------------------------+