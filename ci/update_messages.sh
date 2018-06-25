#!/bin/sh

echo "EXECUTING: Compile messages"
echo

cd ${WORKSPACE}/web

. ${WORKSPACE}/pgadmin-venv/bin/activate || { echo 'ERROR: Failed to activate the Python virtual environment.' ; exit 1; }

pybabel extract -F babel.cfg -o pgadmin/messages.pot pgadmin || { echo 'ERROR: Failed to extract messages from the source code.' ; exit 1; }

pybabel update -i pgadmin/messages.pot -d pgadmin/translations || { echo 'ERROR: Failed to update message catalogs from the template.' ; exit 1; }

pybabel compile -d pgadmin/translations || { echo 'ERROR: Failed to compile the message catalogs.' ; exit 1; }
