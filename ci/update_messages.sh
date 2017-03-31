#!/bin/sh

echo "################################################################################"
echo "Extracting, merging and compiling strings..."
echo "################################################################################"
echo

cd $WORKSPACE/web

. $WORKSPACE/pgadmin-venv/bin/activate

pybabel extract -F babel.cfg -o pgadmin/messages.pot pgadmin || { echo 'Failed to extract messages from the source code.' ; exit 1; }

pybabel update -i pgadmin/messages.pot -d pgadmin/translations || { echo 'Failed to update message catalogs from the template.' ; exit 1; }

pybabel compile -d pgadmin/translations || { echo 'Failed to compile the message catalogs.' ; exit 1