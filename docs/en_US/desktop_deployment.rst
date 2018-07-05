.. _desktop_deployment:

***************************
`Desktop Deployment`:index:
***************************

pgAdmin may be deployed as a desktop application by configuring the application
to run in desktop mode and then utilising the desktop runtime to host the
program on a supported Windows, Mac OS X or Linux installation.

The desktop runtime is a system-tray application that when launched, runs the
pgAdmin server and launches a web browser to render the user interface. If
additional instances of pgAdmin are launched, a new browser tab will be opened
and be served by the existing instance of the server in order to minimise system
resource utilisation. Clicking the icon in the system tray will present a menu
offering options to open a new pgAdmin window, configure the runtime, view the
server log and shut down the server.

.. note:: Pre-compiled and configured installation packages are available for
     a number of platforms. These packages should be used by end-users whereever
     possible - the following information is useful for the maintainers of those
     packages and users interested in understanding how pgAdmin works.

.. seealso:: For detailed instructions on building and configuring pgAdmin from
    scratch, please see the README file in the top level directory of the source code.
    For convenience, you can find the latest version of the file
    `here <https://git.postgresql.org/gitweb/?p=pgadmin4.git;a=blob_plain;f=README>`_,
    but be aware that this may differ from the version included with the source code
    for a specific version of pgAdmin.

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

.. note:: If the SERVER_MODE setting is changed in ``config_distro.py`` or ``config_local.py``,
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
| BrowserCommand           | String             | An alternate command to run instead of the default browser.   |
+--------------------------+--------------------+---------------------------------------------------------------+
| ConnectionTimeout        | Integer            | The number of seconds to wait for application server startup. |
+--------------------------+--------------------+---------------------------------------------------------------+
| PythonPath               | String             | The Python module search path                                 |
+--------------------------+--------------------+---------------------------------------------------------------+

