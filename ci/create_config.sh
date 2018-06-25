#!/bin/sh

echo "EXECUTING: Create pgAdmin config"
echo

cd ${WORKSPACE}

cp ${JENKINS_HOME}/pgadmin-configs/config_local.py ${WORKSPACE}/web/config_local.py || { echo 'ERROR: Failed to create config_local.py.' ; exit 1; }
echo LOG_FILE = \"${WORKSPACE}/var/pgadmin4.log\" >> ${WORKSPACE}/web/config_local.py || { echo 'ERROR: Failed to create config_local.py.' ; exit 1; }
echo SESSION_DB_PATH = \"${WORKSPACE}/var/sessions\" >> ${WORKSPACE}/web/config_local.py || { echo 'ERROR: Failed to create config_local.py.' ; exit 1; }
echo STORAGE_DIR = \"${WORKSPACE}/var/storage\" >> ${WORKSPACE}/web/config_local.py || { echo 'ERROR: Failed to create config_local.py.' ; exit 1; }
echo SQLITE_PATH = \"${WORKSPACE}/var/pgadmin4.db\" >> ${WORKSPACE}/web/config_local.py || { echo 'ERROR: Failed to create config_local.py.' ; exit 1; }
echo TEST_SQLITE_PATH = \"${WORKSPACE}/var/pgadmin4.db\" >> ${WORKSPACE}/web/config_local.py || { echo 'ERROR: Failed to create config_local.py.' ; exit 1; }

cp ${JENKINS_HOME}/pgadmin-configs/test_config.json ${WORKSPACE}/web/regression/test_config.json || { echo 'ERROR: Failed to copy the test configuration.' ; exit 1; }
