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

In order to configure pgAdmin to run in desktop mode, it is first necessary to
configure the Python code to run in single-user mode, and then to configure the
runtime to find and execute the code.

Note that there are multiple configuration files that are read at startup by
pgAdmin. These are as follows:

* ``config.py``: This is the main configuration file, and should not be modified.
  It can be used as a reference for configuration settings, that may be overridden
  in one of the following files.

* ``config_distro.py``: This file is read after ``config.py`` and is intended for
  packagers to change any settings that are required for their pgAdmin distribution.
  This may typically include certain paths and file locations.

* ``config_local.py``: This file is read after ``config_distro.py`` and is intended
  for end users to change any default or packaging specific settings that they may
  wish to adjust to meet local preferences or standards.

Python
------

In order to configure the Python code, follow these steps:

1. Ensure that any existing configuration database (``pgadmin4.db``) is moved 
   out of the way in the ``web/`` directory containing the pgAdmin Python code.

2. Create a ``config_local.py`` file alongside the existing ``config.py`` file.

3. Edit ``config_local.py`` and add the following setting:

   .. code-block:: python

       SERVER_MODE = False
    
4. Run the following command to create the configuration database:

   .. code-block:: bash

       $ python setup.py

Alternatively, you can simply run ``pgAdmin4.py`` at this point or aat a later time,
and ``pgadmin4.db`` will be created automatically at first run.
    
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
will use an INI file on Unix systems, a plist file on Mac OS X, and the registry
on Windows. The Python Path setting is stored in the ``PythonPath`` key.