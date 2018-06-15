.. _server_deployment:

**************************
`Server Deployment`:index:
**************************

pgAdmin may be deployed as a web application by configuring the app to run in
server mode and then deploying it either behind a webserver running as a reverse
proxy, or using the WSGI interface.

The following instructions demonstrate how pgAdmin may be run as a WSGI 
application under ``Apache HTTP``, using ``mod_wsgi``.

.. seealso:: For detailed instructions on building and configuring pgAdmin from
    scratch, please see the README file in the top level directory of the source code.
    For convenience, you can find the latest version of the file
    `here <https://git.postgresql.org/gitweb/?p=pgadmin4.git;a=blob_plain;f=README>`_,
    but be aware that this may differ from the version included with the source code
    for a specific version of pgAdmin.

Requirements
************

**Important**: Some components of pgAdmin require the ability to maintain affinity
between client sessions and a specific database connection (for example, the 
Query Tool in which the user might run a BEGIN command followed by a number of
DML SQL statements, and then a COMMIT). pgAdmin has been designed with built-in
connection management to handle this, however it requires that only a single
Python process is used because it is not easily possible to maintain affinity
between a client session and one of multiple WSGI worker processes.

On Windows systems, the Apache HTTP server uses a single process, multi-threaded
architecture. WSGI applications run in ``embedded`` mode, which means that only
a single process will be present on this platform in all cases.

On Unix systems, the Apache HTTP server typically uses a multi-process, single
threaded architecture (this is dependent on the ``MPM`` that is chosen at 
compile time). If ``embedded`` mode is chosen for the WSGI application, then
there will be one Python environment for each Apache process, each with it's own
connection manager which will lead to loss of connection affinity. Therefore
one should use ``mod_wsgi``'s ``daemon`` mode, configured to use a single
process. This will launch a single instance of the WSGI application which is 
utilised by all the Apache worker processes.

Whilst it is true that this is a potential performance bottleneck, in reality
pgAdmin is not a web application that's ever likely to see heavy traffic 
unlike a busy website, so in practice should not be an issue.

Future versions of pgAdmin may introduce a shared connection manager process to
overcome this limitation, however that is a significant amount of work for 
little practical gain.

Configuration
*************

In order to configure pgAdmin to run in server mode, it may be necessary to
configure the Python code to run in multi-user mode, and then to configure the
web server to find and execute the code.

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

From pgAdmin 4 v2 onwards, server mode is the default configuration. If running under
the desktop runtime, this is overridden automatically. There should typically be no
need to modify the configuration simply to enable server mode to work, however it may
be desirable to adjust some of the paths used.

In order to configure the Python code, follow these steps:

1. Create a ``config_local.py`` file alongside the existing ``config.py`` file.

2. Edit ``config_local.py`` and add the following settings. In most cases, the default
   file locations should be appropriate:

   *NOTE: You must ensure the directories specified are writeable by
   the user that the web server processes will be running as, e.g. apache or www-data.*

   .. code-block:: python

       LOG_FILE = '/var/log/pgadmin4/pgadmin4.log'
       SQLITE_PATH = '/var/lib/pgadmin4/pgadmin4.db'
       SESSION_DB_PATH = '/var/lib/pgadmin4/sessions'
       STORAGE_DIR = '/var/lib/pgadmin4/storage'

4. Run the following command to create the configuration database:

   .. code-block:: bash

       # python setup.py

5. Change the ownership of the configuration database to the user that the web server
   processes will run as, for example, assuming that the web server runs as user
   www-data in group www-data, and that the SQLite path is ``/var/lib/pgadmin4/pgadmin4.db``:

   .. code-block:: bash

       # chown www-data:www-data /var/lib/pgadmin4/pgadmin4.db

Apache HTTPD Configuration (Windows)
------------------------------------

Once Apache HTTP has been configured to support ``mod_wsgi``, the pgAdmin
application may be configured similarly to the example below:

.. code-block:: apache

    <VirtualHost *>
        ServerName pgadmin.example.com
        WSGIScriptAlias / "C:\Program Files\pgAdmin4\web\pgAdmin4.wsgi"
        <Directory "C:\Program Files\pgAdmin4\web">
                Order deny,allow
                Allow from all
        </Directory>
    </VirtualHost>

Now open the file ``C:\Program Files\pgAdmin4\web\pgAdmin4.wsgi`` with your favorite editor and add the code
below which will activate Python virtual environment when Apache server runs.

.. code-block:: python

    activate_this = 'C:\Program Files\pgAdmin4\venv\Scripts\activate_this.py'
    execfile(activate_this, dict(__file__=activate_this))

**Note:** The changes made in ``pgAdmin4.wsgi`` file will revert when pgAdmin4 is either upgraded or downgraded.
    
Apache HTTPD Configuration (Linux/Unix)
---------------------------------------

Once Apache HTTP has been configured to support ``mod_wsgi``, the pgAdmin
application may be configured similarly to the example below:

.. code-block:: apache

    <VirtualHost *>
        ServerName pgadmin.example.com

        WSGIDaemonProcess pgadmin processes=1 threads=25 python-home=/path/to/python/virtualenv
        WSGIScriptAlias / /opt/pgAdmin4/web/pgAdmin4.wsgi

        <Directory /opt/pgAdmin4/web>
            WSGIProcessGroup pgadmin
            WSGIApplicationGroup %{GLOBAL}
            Order deny,allow
            Allow from all
        </Directory>
    </VirtualHost>

**Note:** If you're using Apache HTTPD 2.4 or later, replace the lines:

.. code-block:: apache

            Order deny,allow
            Allow from all

with:

.. code-block:: apache

            Require all granted

Adjust as needed to suit your access control requirements.
