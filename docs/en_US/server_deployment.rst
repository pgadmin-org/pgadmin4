*****************
Server Deployment
*****************

pgAdmin may be deployed as a web application by configuring the app to run in
server mode and then deploying it either behind a webserver running as a reverse
proxy, or using the WSGI interface.

The following instructions demonstrate how pgAdmin may be run as a WSGI 
application under ``Apache HTTP``, using ``mod_wsgi``.

Requirements
------------

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
    
Apache HTTPD Configuration (Linux/Unix)
---------------------------------------

Once Apache HTTP has been configured to support ``mod_wsgi``, the pgAdmin
application may be configured similarly to the example below:

.. code-block:: apache

    <VirtualHost *>
        ServerName pgadmin.example.com

        WSGIDaemonProcess pgadmin processes=1
        WSGIScriptAlias / /opt/pgAdmin4/web/pgAdmin4.wsgi

        <Directory /opt/pgAdmin4/web>
            WSGIProcessGroup pgadmin
            WSGIApplicationGroup %{GLOBAL}
            Order deny,allow
            Allow from all
        </Directory>
    </VirtualHost>