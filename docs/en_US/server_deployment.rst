.. _server_deployment:

**************************
`Server Deployment`:index:
**************************

pgAdmin may be deployed as a web application by configuring the app to run in
server mode and then deploying it either behind a webserver running as a reverse
proxy, or using the WSGI interface.

When deployed in server mode, there are two notable differences for users:

* Users must login before they can use pgAdmin. An initial superuser account
  is created when server mode is initialised, and this user can add additional
  superusers and non-superusers as required.
* File storage is restricted to a virtual root directory for each individual
  user under the directory configured using the ``STORAGE_DIR`` configuration
  parameter. Users do not have access to the complete filesystem of the server.

The following instructions demonstrate how pgAdmin may be run as a WSGI 
application under ``Apache HTTPD``, using ``mod_wsgi``, standalone using ``uWSGI``
or ``Gunicorn``, or under ``NGINX`` using using ``uWSGI`` or ``Gunicorn``.


.. seealso:: For detailed instructions on building and configuring pgAdmin from
    scratch, please see the README file in the top level directory of the source code.
    For convenience, you can find the latest version of the file
    `here <https://github.com/pgadmin-org/pgadmin4/blob/master/README.md>`_,
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

See :ref:`config_py` for more information on configuration settings.

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
   the user that the web server processes will be running as, e.g. apache or www-data.
   You may specify DATA_DIR in order to create all required directories and files
   under DATA_DIR folder.*

   .. code-block:: python

       LOG_FILE = '/var/log/pgadmin4/pgadmin4.log'
       SQLITE_PATH = '/var/lib/pgadmin4/pgadmin4.db'
       SESSION_DB_PATH = '/var/lib/pgadmin4/sessions'
       STORAGE_DIR = '/var/lib/pgadmin4/storage'
       AZURE_CREDENTIAL_CACHE_DIR = '/var/lib/pgadmin4/azurecredentialcache'
       KERBEROS_CCACHE_DIR = '/var/lib/pgadmin4/kerberoscache'

4. Run the following command to create the configuration database:

   .. code-block:: bash

       # python setup.py setup-db

5. Change the ownership of the configuration database to the user that the web server
   processes will run as, for example, assuming that the web server runs as user
   www-data in group www-data, and that the SQLite path is ``/var/lib/pgadmin4/pgadmin4.db``:

   .. code-block:: bash

       # chown www-data:www-data /var/lib/pgadmin4/pgadmin4.db

Hosting
*******

There are many possible ways to host pgAdmin in server mode. Some examples are
given below:

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
    exec(open(activate_this).read())

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

Standalone Gunicorn Configuration
---------------------------------

pgAdmin may be hosted by Gunicorn directly simply by running a command such as
the one shown below. Note that this example assumes pgAdmin was installed using
the Python Wheel (you may need to adjust the path to suit your installation):

.. code-block:: bash

    gunicorn  --bind 0.0.0.0:80 \
              --workers=1 \
              --threads=25 \
              --chdir /usr/lib/python3.13/dist-packages/pgadmin4 \
              pgAdmin4:app

Standalone uWSGI Configuration
------------------------------

pgAdmin may be hosted by uWSGI directly simply by running a command such as
the one shown below. Note that this example assumes pgAdmin was installed using
the Python Wheel (you may need to adjust the path to suit your installation):

.. code-block:: bash

    uwsgi --http-socket 0.0.0.0:80 \
          --processes 1 \
          --threads 25 \
          --chdir /usr/lib/python3.13/dist-packages/pgadmin4/ \
          --mount /=pgAdmin4:app

.. _sub_directory_hosting:

Hosting in a Sub-Directory
--------------------------

Any of the reverse proxy configurations described below can host pgAdmin in a
sub-directory of the server (``/pgadmin4`` in each of the examples) rather than
at its root, but doing so requires that the ``SCRIPT_NAME`` environment
variable is set for the Gunicorn or uWSGI process, whichever is in use.

pgAdmin reads ``SCRIPT_NAME`` from the process environment once, at startup,
and uses it to set ``APPLICATION_ROOT`` and ``SESSION_COOKIE_PATH``, so that
URLs, redirects (including the one issued after a successful login) and
session cookies are all generated relative to the sub-directory rather than to
the root of the server. Without it, a successful login redirects to the root of
the server, which typically presents to the user as a redirect loop.

This is a separate mechanism from the per-request ``X-Script-Name`` header that
the NGINX Gunicorn example below sets, and neither substitutes for the other.
It is also separate from uWSGI's ``--manage-script-name``, which only affects
the per-request WSGI environment that uWSGI builds; the uWSGI examples below
set ``SCRIPT_NAME`` alongside it so that both mechanisms agree, and so that the
session cookie is confined to the sub-directory rather than being issued for
the root of the server.

.. _proxy_headers:

Reverse Proxy Headers
---------------------

pgAdmin honours the ``X-Script-Name`` and ``X-Scheme`` request headers
unconditionally, unlike the ``X-Forwarded-*`` headers, which are trusted only
to the depth configured by the ``PROXY_X_*_COUNT`` settings. A client that
supplied its own ``X-Script-Name`` could therefore change every URL pgAdmin
generates, so the reverse proxy must always either overwrite both headers with
values of its own or remove them outright, rather than passing on whatever the
client sent. Each of the examples below does one or the other, and a proxy
configuration not derived from them should do the same.

NGINX Configuration with Gunicorn
---------------------------------

pgAdmin can be hosted by Gunicorn, with NGINX in front of it. Note that these
examples assume pgAdmin was installed using the Python Wheel (you may need to
adjust the path to suit your installation).

To run with pgAdmin in the root directory of the server, start Gunicorn using a
command similar to:

.. code-block:: bash

    gunicorn --bind unix:/tmp/pgadmin4.sock \
             --workers=1 \
             --threads=25 \
             --chdir /usr/lib/python3.13/dist-packages/pgadmin4 \
             pgAdmin4:app

And configure NGINX:

.. code-block:: nginx

    location / {
        include proxy_params;
        proxy_pass http://unix:/tmp/pgadmin4.sock;
        proxy_set_header X-Script-Name "";
        proxy_set_header X-Scheme "";
    }

Alternatively, pgAdmin can be hosted in a sub-directory (/pgadmin4 in this case)
on the server. Start Gunicorn as when using the root directory, but also set the
``SCRIPT_NAME`` environment variable for the Gunicorn process, as described in
:ref:`sub_directory_hosting`:

.. code-block:: bash

    SCRIPT_NAME=/pgadmin4 gunicorn --bind unix:/tmp/pgadmin4.sock \
                                   --workers=1 \
                                   --threads=25 \
                                   --chdir /usr/lib/python3.13/dist-packages/pgadmin4 \
                                   pgAdmin4:app

Then configure NGINX:

.. code-block:: nginx

    location /pgadmin4/ {
        include proxy_params;
        proxy_pass http://unix:/tmp/pgadmin4.sock;
        proxy_set_header X-Script-Name /pgadmin4;
        proxy_set_header X-Scheme "";
    }

NGINX Configuration with uWSGI
------------------------------

pgAdmin can be hosted by uWSGI, with NGINX in front of it. Note that these
examples assume pgAdmin was installed using the Python Wheel (you may need to
adjust the path to suit your installation).

To run with pgAdmin in the root directory of the server, start uWSGI using a
command similar to:

.. code-block:: bash

    uwsgi --socket /tmp/pgadmin4.sock \
          --processes 1 \
          --threads 25 \
          --chdir /usr/lib/python3.13/dist-packages/pgadmin4/ \
          --manage-script-name \
          --mount /=pgAdmin4:app

And configure NGINX:

.. code-block:: nginx

    location / { try_files $uri @pgadmin4; }
    location @pgadmin4 {
        include uwsgi_params;
        uwsgi_pass unix:/tmp/pgadmin4.sock;
        uwsgi_param HTTP_X_SCRIPT_NAME "";
        uwsgi_param HTTP_X_SCHEME "";
    }

Alternatively, pgAdmin can be hosted in a sub-directory (/pgadmin4 in this case)
on the server. Start uWSGI, noting that the directory name is specified in the
``mount`` parameter, and that the ``SCRIPT_NAME`` environment variable should
be set alongside it, as described in :ref:`sub_directory_hosting`:

.. code-block:: bash

    SCRIPT_NAME=/pgadmin4 uwsgi --socket /tmp/pgadmin4.sock \
                                --processes 1 \
                                --threads 25 \
                                --chdir /usr/lib/python3.13/dist-packages/pgadmin4/ \
                                --manage-script-name \
                                --mount /pgadmin4=pgAdmin4:app

Then, configure NGINX:

.. code-block:: nginx

    location = /pgadmin4 { rewrite ^ /pgadmin4/; }
    location /pgadmin4 { try_files $uri @pgadmin4; }
    location @pgadmin4 {
      include uwsgi_params;
      uwsgi_pass unix:/tmp/pgadmin4.sock;
      uwsgi_param HTTP_X_SCRIPT_NAME "";
      uwsgi_param HTTP_X_SCHEME "";
    }

Caddy Configuration with Gunicorn
----------------------------------

pgAdmin can be hosted by Gunicorn, with Caddy in front of it as a reverse
proxy. Note that these examples assume pgAdmin was installed using the Python
Wheel (you may need to adjust the path to suit your installation).

To run with pgAdmin in the root directory of the server, start Gunicorn using
a command similar to:

.. code-block:: bash

    gunicorn --bind unix:/run/pgadmin4/pgadmin4.sock \
             --workers=1 \
             --threads=25 \
             --chdir /usr/lib/python3.13/dist-packages/pgadmin4 \
             pgAdmin4:app

And configure Caddy:

.. code-block:: text

    pgadmin.example.com {
        reverse_proxy unix//run/pgadmin4/pgadmin4.sock {
            header_up -X-Script-Name
            header_up -X-Scheme
        }
    }

.. _caddy_socket_location:

.. note:: The examples deliberately avoid ``/tmp`` for the socket. The systemd
    unit shipped with Caddy sets ``PrivateTmp=true``, which gives the Caddy
    process a private ``/tmp`` directory of its own, so a socket created by
    Gunicorn or uWSGI in the system ``/tmp`` is invisible to Caddy, which will
    report a 502 error for every request. Any directory outside ``/tmp`` that
    both processes can access will do, provided the user Caddy runs as has
    permission to read and write the socket; alternatively, have Gunicorn or
    uWSGI listen on a TCP port such as ``127.0.0.1:5050`` and proxy to that
    instead. Whichever directory is used, it must exist and be writable by the
    user Gunicorn or uWSGI runs as before the socket can be bound; under
    systemd, ``RuntimeDirectory=pgadmin4`` in the unit that starts Gunicorn or
    uWSGI will create ``/run/pgadmin4`` on start and remove it on stop. The
    same applies to the uWSGI examples below.

.. _caddy_header_stripping:

.. note:: The two ``header_up`` directives remove any ``X-Script-Name`` and
    ``X-Scheme`` headers that arrive from the client, for the reasons given in
    :ref:`proxy_headers`. Each of the Caddy examples removes both, except that
    the Gunicorn sub-directory example sets ``X-Script-Name`` to the
    sub-directory instead, which likewise replaces whatever the client sent.

Alternatively, pgAdmin can be hosted in a sub-directory (/pgadmin4 in this
case) on the server. Start Gunicorn as when using the root directory, but
also set the ``SCRIPT_NAME`` environment variable for the Gunicorn process, as
described in :ref:`sub_directory_hosting`:

.. code-block:: bash

    SCRIPT_NAME=/pgadmin4 gunicorn --bind unix:/run/pgadmin4/pgadmin4.sock \
                                   --workers=1 \
                                   --threads=25 \
                                   --chdir /usr/lib/python3.13/dist-packages/pgadmin4 \
                                   pgAdmin4:app

Then configure Caddy. The request path must be passed through to Gunicorn
unchanged, so do not strip the /pgadmin4 prefix; the ``X-Script-Name`` header
is set to the sub-directory, both to tell pgAdmin which requests are made
under it and to replace any value the client may have sent; and the path
matcher must include both ``/pgadmin4`` and ``/pgadmin4/*``, so that pgAdmin's
own redirect to the bare sub-directory path (with no trailing slash) is also
proxied, rather than falling through to Caddy's default (and rather unhelpful)
empty response for an unmatched path:

.. code-block:: text

    pgadmin.example.com {
        @pgadmin path /pgadmin4 /pgadmin4/*
        handle @pgadmin {
            reverse_proxy unix//run/pgadmin4/pgadmin4.sock {
                header_up X-Script-Name /pgadmin4
                header_up -X-Scheme
            }
        }
    }

Caddy Configuration with uWSGI
-------------------------------

Caddy does not speak the native uwsgi protocol used by NGINX's
``uwsgi_pass``, so uWSGI must be run in HTTP mode instead, using
``--http-socket`` rather than ``--socket``. Note that these examples assume
pgAdmin was installed using the Python Wheel (you may need to adjust the
path to suit your installation).

To run with pgAdmin in the root directory of the server, start uWSGI using a
command similar to:

.. code-block:: bash

    uwsgi --http-socket /run/pgadmin4/pgadmin4.sock \
          --processes 1 \
          --threads 25 \
          --chdir /usr/lib/python3.13/dist-packages/pgadmin4/ \
          --mount /=pgAdmin4:app

And configure Caddy, again keeping the socket out of ``/tmp`` (see
:ref:`the note above <caddy_socket_location>`) and stripping the headers
pgAdmin trusts unconditionally (see :ref:`the note above
<caddy_header_stripping>`):

.. code-block:: text

    pgadmin.example.com {
        reverse_proxy unix//run/pgadmin4/pgadmin4.sock {
            header_up -X-Script-Name
            header_up -X-Scheme
        }
    }

Alternatively, pgAdmin can be hosted in a sub-directory (/pgadmin4 in this
case) on the server. Start uWSGI, noting that the directory name is specified
in the ``mount`` parameter, and that the ``SCRIPT_NAME`` environment variable
should still be set alongside it, as described in
:ref:`sub_directory_hosting`:

.. code-block:: bash

    SCRIPT_NAME=/pgadmin4 uwsgi --http-socket /run/pgadmin4/pgadmin4.sock \
                                --processes 1 \
                                --threads 25 \
                                --chdir /usr/lib/python3.13/dist-packages/pgadmin4/ \
                                --manage-script-name \
                                --mount /pgadmin4=pgAdmin4:app

Then configure Caddy as for the Gunicorn sub-directory example above, except
that no ``X-Script-Name`` header needs to be set: ``--manage-script-name`` has
uWSGI report the mount point to pgAdmin with every request, as in the NGINX
uWSGI example above, so the header is only removed:

.. code-block:: text

    pgadmin.example.com {
        @pgadmin path /pgadmin4 /pgadmin4/*
        handle @pgadmin {
            reverse_proxy unix//run/pgadmin4/pgadmin4.sock {
                header_up -X-Script-Name
                header_up -X-Scheme
            }
        }
    }

Additional Information
----------------------

.. note:: pgAdmin will spawn additional Python processes from time to time, and
    relies on the *sys.executable* variable in Python to do this. In some cases,
    you may need to override that value to ensure the correct interpreter is
    used, instead of the WSGI host process. For example, uWSGI offers the
    *--py-sys-executable* command line option to achieve this.
