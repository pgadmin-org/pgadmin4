.. _container_deployment:

*****************************
`Container Deployment`:index:
*****************************

pgAdmin can be deployed in a container using the image at:

    https://hub.docker.com/r/dpage/pgadmin4/

PostgreSQL Utilities
********************

The PostgreSQL utilities *pg_dump*, *pg_dumpall*, *pg_restore* and *psql* are
included in the container to allow backups to be created and restored and other
maintenance functions to be executed. Multiple versions are included in the
following directories to allow use with different versions of the database
server:

* PostgreSQL 9.4: */usr/local/pgsql-9.4*
* PostgreSQL 9.5: */usr/local/pgsql-9.5*
* PostgreSQL 9.6: */usr/local/pgsql-9.6*
* PostgreSQL 10: */usr/local/pgsql-10*
* PostgreSQL 11: */usr/local/pgsql-11*

The most recent version of the utilities is used by default; this may be
changed in the :ref:`preferences`.

Environment Variables
*********************

The container will accept the following variables at startup:

*PGADMIN_DEFAULT_EMAIL*

This is the email address used when setting up the initial administrator account
to login to pgAdmin. This variable is required and must be set at launch time.

*PGADMIN_DEFAULT_PASSWORD*

This is the password used when setting up the initial administrator account to
login to pgAdmin. This variable is required and must be set at launch time.

*PGADMIN_ENABLE_TLS*

Default: <null>

If left un-set, the container will listen on port 80 for connections in plain
text. If set to any value, the container will listen on port 443 for TLS
connections.

When TLS is enabled, a certificate and key must be provided. Typically these
should be stored on the host file system and mounted from the container. The
expected paths are /certs/server.crt and /certs/server.key

*PGADMIN_LISTEN_ADDRESS*

Default: [::]

Specify the local address that the servers listens on. The default should work
for most users - in IPv4-only environments, this may need to be set to
127.0.0.1.

*PGADMIN_LISTEN_PORT*

Default: 80 or 443 (if TLS is enabled)

Allows the port that the server listens on to be set to a specific value rather
than using the default.

*GUNICORN_THREADS*

Default: 25

Adjust the number of threads the Gunicorn server uses to handle incoming
requests. This should typically be left as-is, except in highly loaded systems
where it may be increased.

Mapped Files and Directories
****************************

The following files or directories can be mapped from the container onto the
host machine to allow configuration to be customised and shared between
instances:

*/var/lib/pgadmin*

This is the working directory in which pgAdmin stores session data, user files,
configuration files, and it's configuration database. Mapping this directory
onto the host machine gives you an easy way to maintain configuration between
invocations of the container.

*/pgadmin4/config_local.py*

This file can be used to override configuration settings in pgAdmin. Settings
found in config.py can be overridden with deployment specific values if
required.

*/pgadmin4/servers.json*

If this file is mapped, server definitions found in it will be loaded at launch
time. This allows connection information to be pre-loaded into the instance of
pgAdmin in the container. Note that server definitions are only loaded on first
launch, i.e. when the configuration database is created, and not on subsequent
launches using the same configuration database.

*/certs/server.cert*

If TLS is enabled, this file will be used as the servers TLS certificate.

*/certs/server.key*

If TLS is enabled, this file will be used as the key file for the servers TLS
certificate.

Examples
********

Run a simple container over port 80:

.. code-block:: bash

    docker pull dpage/pgadmin4
    docker run -p 80:80 \
        -e "PGADMIN_DEFAULT_EMAIL=user@domain.com" \
        -e "PGADMIN_DEFAULT_PASSWORD=SuperSecret" \
        -d dpage/pgadmin4

Run a TLS secured container using a shared config/storage directory in
/private/var/lib/pgadmin on the host, and servers pre-loaded from
/tmp/servers.json on the host:

.. code-block:: bash

    docker pull dpage/pgadmin4
    docker run -p 443:443 \
        -v "/private/var/lib/pgadmin:/var/lib/pgadmin" \
        -v "/path/to/certificate.cert:/certs/server.cert" \
        -v "/path/to/certificate.key:/certs/server.key" \
        -v "/tmp/servers.json:/servers.json" \
        -e "PGADMIN_DEFAULT_EMAIL=user@domain.com" \
        -e "PGADMIN_DEFAULT_PASSWORD=SuperSecret" \
        -e "PGADMIN_ENABLE_TLS=True" \
        -d dpage/pgadmin4