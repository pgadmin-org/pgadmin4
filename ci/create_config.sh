#!/bin/sh

echo "################################################################################"
echo "Creating pgAdmin configuration..."
echo "################################################################################"
echo

cd $WORKSPACE

cp $JENKINS_HOME/pgadmin-configs/config_local.py $WORKSPACE/web/config_local.py
echo LOG_FILE = \"$WORKSPACE/var/pgadmin4.log\" >> $WORKSPACE/web/config_local.py
echo SESSION_DB_PATH = \"$WORKSPACE/var/sessions\" >> $WORKSPACE/web/config_local.py
echo STORAGE_DIR = \"$WORKSPACE/var/storage\" >> $WORKSPACE/web/config_local.py
echo SQLITE_PATH = \"$WORKSPACE/var/pgadmin4.db\" >> $WORKSPACE/web/config_local.py
echo TEST_SQLITE_PATH = \"$WORKSPACE/var/pgadmin4.db\" >> $WORKSPACE/web/config_local.py

cp $JENKINS_HOME/pgadmin-configs/test_config.json $WORKSPACE/web/regression/test_config.json
