#!/usr/bin/env bash

# Fixup the passwd file, in case we're on OpenShift
if ! whoami > /dev/null 2>&1; then
  if [ "$(id -u)" -ne 5050 ]; then
    if [ -w /etc/passwd ]; then
      echo "${USER_NAME:-pgadminr}:x:$(id -u):0:${USER_NAME:-pgadminr} user:${HOME}:/sbin/nologin" >> /etc/passwd
    fi
  fi
fi

# usage: file_env VAR [DEFAULT] ie: file_env 'XYZ_DB_PASSWORD' 'example'
# (will allow for "$XYZ_DB_PASSWORD_FILE" to fill in the value of
#  "$XYZ_DB_PASSWORD" from a file, for Docker's secrets feature)
function file_env() {
	local var="$1"
	local fileVar="${var}_FILE"
	local def="${2:-}"
	if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
		printf >&2 'error: both %s and %s are set (but are exclusive)\n' "$var" "$fileVar"
		exit 1
	fi
	local val="$def"
	if [ "${!var:-}" ]; then
		val="${!var}"
	elif [ "${!fileVar:-}" ]; then
		val="$(< "${!fileVar}")"
	fi
	export "$var"="$val"
	unset "$fileVar"
}

# Set values for config variables that can be passed using secrets
if [ -n "${PGADMIN_CONFIG_CONFIG_DATABASE_URI_FILE}" ]; then
  file_env PGADMIN_CONFIG_CONFIG_DATABASE_URI
fi
file_env PGADMIN_DEFAULT_PASSWORD

# TO enable custom path for config_distro, pass config distro path via environment variable.
export CONFIG_DISTRO_FILE_PATH="${PGADMIN_CUSTOM_CONFIG_DISTRO_FILE:-/pgadmin4/config_distro.py}"
# Populate config_distro.py. This has some default config, as well as anything
# provided by the user through the PGADMIN_CONFIG_* environment variables.
# Only update the file on first launch. The empty file is created during the
# container build so it can have the required ownership.
if [ "$(wc -m "${CONFIG_DISTRO_FILE_PATH}" | awk '{ print $1 }')" = "0" ]; then
    cat << EOF > "${CONFIG_DISTRO_FILE_PATH}"
CA_FILE = '/etc/ssl/certs/ca-certificates.crt'
LOG_FILE = '/dev/null'
HELP_PATH = '../../docs'
DEFAULT_BINARY_PATHS = {
        'pg': '/usr/local/pgsql-17',
        'pg-17': '/usr/local/pgsql-17',
        'pg-16': '/usr/local/pgsql-16',
        'pg-15': '/usr/local/pgsql-15',
        'pg-14': '/usr/local/pgsql-14',
        'pg-13': '/usr/local/pgsql-13',
        'pg-12': '/usr/local/pgsql-12'
}
EOF

    # This is a bit kludgy, but necessary as the container uses BusyBox/ash as
    # it's shell and not bash which would allow a much cleaner implementation
    for var in $(env | grep "^PGADMIN_CONFIG_" | cut -d "=" -f 1); do
        # shellcheck disable=SC2086
        # shellcheck disable=SC2046
        echo ${var#PGADMIN_CONFIG_} = $(eval "echo \$$var") >> "${CONFIG_DISTRO_FILE_PATH}"
    done
fi

# Check whether the external configuration database exists if it is being used.
external_config_db_exists="False"
if [ -n "${PGADMIN_CONFIG_CONFIG_DATABASE_URI}" ]; then
     external_config_db_exists=$(cd /pgadmin4/pgadmin/utils && /venv/bin/python3 -c "from check_external_config_db import check_external_config_db; val = check_external_config_db("${PGADMIN_CONFIG_CONFIG_DATABASE_URI}"); print(val)")
fi

if [ ! -f /var/lib/pgadmin/pgadmin4.db ] && [ "${external_config_db_exists}" = "False" ]; then
    if [ -z "${PGADMIN_DEFAULT_EMAIL}" ] || { [ -z "${PGADMIN_DEFAULT_PASSWORD}" ] && [ -z "${PGADMIN_DEFAULT_PASSWORD_FILE}" ]; }; then
        echo 'You need to define the PGADMIN_DEFAULT_EMAIL and PGADMIN_DEFAULT_PASSWORD or PGADMIN_DEFAULT_PASSWORD_FILE environment variables.'
        exit 1
    fi

    # Validate PGADMIN_DEFAULT_EMAIL
    CHECK_EMAIL_DELIVERABILITY="False"
    if [ -n "${PGADMIN_CONFIG_CHECK_EMAIL_DELIVERABILITY}" ]; then
        CHECK_EMAIL_DELIVERABILITY=${PGADMIN_CONFIG_CHECK_EMAIL_DELIVERABILITY}
    fi
    ALLOW_SPECIAL_EMAIL_DOMAINS="[]"
    if [ -n "${PGADMIN_CONFIG_ALLOW_SPECIAL_EMAIL_DOMAINS}" ]; then
        ALLOW_SPECIAL_EMAIL_DOMAINS=${PGADMIN_CONFIG_ALLOW_SPECIAL_EMAIL_DOMAINS}
    fi
     email_config="{'CHECK_EMAIL_DELIVERABILITY': ${CHECK_EMAIL_DELIVERABILITY}, 'ALLOW_SPECIAL_EMAIL_DOMAINS': ${ALLOW_SPECIAL_EMAIL_DOMAINS}}"
    echo "email config is ${email_config}"
     is_valid_email=$(cd /pgadmin4/pgadmin/utils && /venv/bin/python3 -c "from validation_utils import validate_email; val = validate_email('${PGADMIN_DEFAULT_EMAIL}', ${email_config}); print(val)")
     if echo "${is_valid_email}" | grep "False" > /dev/null; then
         echo "'${PGADMIN_DEFAULT_EMAIL}' does not appear to be a valid email address. Please reset the PGADMIN_DEFAULT_EMAIL environment variable and try again."
         exit 1
     fi
    # Switch back to root directory for further process
    cd /pgadmin4

    # Set the default username and password in a
    # backwards compatible way
    export PGADMIN_SETUP_EMAIL="${PGADMIN_DEFAULT_EMAIL}"
    export PGADMIN_SETUP_PASSWORD="${PGADMIN_DEFAULT_PASSWORD}"

    # Initialize DB before starting Gunicorn
    # Importing pgadmin4 (from this script) is enough
    /venv/bin/python3 run_pgadmin.py

    export PGADMIN_SERVER_JSON_FILE="${PGADMIN_SERVER_JSON_FILE:-/pgadmin4/servers.json}"
    export PGADMIN_PREFERENCES_JSON_FILE="${PGADMIN_PREFERENCES_JSON_FILE:-/pgadmin4/preferences.json}"

    # Pre-load any required servers
    if [ -f "${PGADMIN_SERVER_JSON_FILE}" ]; then
        # When running in Desktop mode, no user is created
        # so we have to import servers anonymously
        if [ "${PGADMIN_CONFIG_SERVER_MODE}" = "False" ]; then
            /venv/bin/python3 /pgadmin4/setup.py load-servers "${PGADMIN_SERVER_JSON_FILE}"
        else
            /venv/bin/python3 /pgadmin4/setup.py load-servers "${PGADMIN_SERVER_JSON_FILE}" --user "${PGADMIN_DEFAULT_EMAIL}"
        fi
    fi
    # Pre-load any required preferences
    if [ -f "${PGADMIN_PREFERENCES_JSON_FILE}" ]; then
        if [ "${PGADMIN_CONFIG_SERVER_MODE}" = "False" ]; then
            DESKTOP_USER=$(cd /pgadmin4 && /venv/bin/python3 -c 'import config; print(config.DESKTOP_USER)')
            /venv/bin/python3 /pgadmin4/setup.py set-prefs "${DESKTOP_USER}" --input-file "${PGADMIN_PREFERENCES_JSON_FILE}"
        else
            /venv/bin/python3 /pgadmin4/setup.py set-prefs "${PGADMIN_DEFAULT_EMAIL}" --input-file "${PGADMIN_PREFERENCES_JSON_FILE}"
        fi
    fi
    # Copy the pgpass file passed using secrets
    if [ -f "${PGPASS_FILE}" ]; then
        if [ "${PGADMIN_CONFIG_SERVER_MODE}" = "False" ]; then
            cp ${PGPASS_FILE} /var/lib/pgadmin/.pgpass
            chmod 600 /var/lib/pgadmin/.pgpass
        else
            PGADMIN_USER_CONFIG_DIR=$(echo "${PGADMIN_DEFAULT_EMAIL}" | sed 's/@/_/g')
            mkdir -p /var/lib/pgadmin/storage/${PGADMIN_USER_CONFIG_DIR}
            cp ${PGPASS_FILE} /var/lib/pgadmin/storage/${PGADMIN_USER_CONFIG_DIR}/.pgpass
            chmod 600 /var/lib/pgadmin/storage/${PGADMIN_USER_CONFIG_DIR}/.pgpass
        fi
    fi

fi

# Start Postfix to handle password resets etc.
if [ -z "${PGADMIN_DISABLE_POSTFIX}" ]; then
    sudo /usr/sbin/postfix start
fi

# Get the session timeout from the pgAdmin config. We'll use this (in seconds)
# to define the Gunicorn worker timeout
TIMEOUT=$(cd /pgadmin4 && /venv/bin/python3 -c 'import config; print(config.SESSION_EXPIRATION_TIME * 60 * 60 * 24)')

# NOTE: currently pgadmin can run only with 1 worker due to sessions implementation
# Using --threads to have multi-threaded single-process worker

if [ -n "${PGADMIN_ENABLE_SOCK}" ]; then
    BIND_ADDRESS="unix:/run/pgadmin/pgadmin.sock"
else
    if [ -n "${PGADMIN_ENABLE_TLS}" ]; then
        BIND_ADDRESS="${PGADMIN_LISTEN_ADDRESS:-[::]}:${PGADMIN_LISTEN_PORT:-443}"
    else
        BIND_ADDRESS="${PGADMIN_LISTEN_ADDRESS:-[::]}:${PGADMIN_LISTEN_PORT:-80}"
    fi
fi

if [ -n "${PGADMIN_ENABLE_TLS}" ]; then
    exec /venv/bin/gunicorn --limit-request-line "${GUNICORN_LIMIT_REQUEST_LINE:-8190}" --timeout "${TIMEOUT}" --bind "${BIND_ADDRESS}" -w 1 --threads "${GUNICORN_THREADS:-25}" --access-logfile "${GUNICORN_ACCESS_LOGFILE:--}" --keyfile /certs/server.key --certfile /certs/server.cert -c gunicorn_config.py run_pgadmin:app
else
    exec /venv/bin/gunicorn --limit-request-line "${GUNICORN_LIMIT_REQUEST_LINE:-8190}" --timeout "${TIMEOUT}" --bind "${BIND_ADDRESS}" -w 1 --threads "${GUNICORN_THREADS:-25}" --access-logfile "${GUNICORN_ACCESS_LOGFILE:--}" -c gunicorn_config.py run_pgadmin:app
fi
