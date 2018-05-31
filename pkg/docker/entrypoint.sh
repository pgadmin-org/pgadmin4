#!/bin/sh

if [ ! -f /var/lib/pgadmin/pgadmin4.db ]; then
    if [ -z "${PGADMIN_DEFAULT_EMAIL}" -o -z "${PGADMIN_DEFAULT_PASSWORD}" ]; then
        echo 'You need to specify PGADMIN_DEFAULT_EMAIL and PGADMIN_DEFAULT_PASSWORD environment variables'
        exit 1
    fi

    # Set the default username and password in a
    # backwards compatible way
    export PGADMIN_SETUP_EMAIL=${PGADMIN_DEFAULT_EMAIL}
    export PGADMIN_SETUP_PASSWORD=${PGADMIN_DEFAULT_PASSWORD}

    # Initialize DB before starting Gunicorn
    # Importing pgadmin4 (from this script) is enough
    python run_pgadmin.py
fi

# NOTE: currently pgadmin can run only with 1 worker due to sessions implementation
# Using --threads to have multi-threaded single-process worker

if [ ! -z ${PGADMIN_ENABLE_TLS} ]; then
    exec gunicorn --bind [::]:${PGADMIN_LISTEN_PORT:-443} -w 1 --threads ${GUNICORN_THREADS:-25} --access-logfile - --keyfile /certs/server.key --certfile /certs/server.cert run_pgadmin:app
else
    exec gunicorn --bind [::]:${PGADMIN_LISTEN_PORT:-80} -w 1 --threads ${GUNICORN_THREADS:-25} --access-logfile - run_pgadmin:app
fi
