#!/bin/sh

echo "################################################################################"
echo "Starting virtual frame buffer..."
echo "################################################################################"
echo

Xvfb -ac :99 -screen 0 1280x1024x16 &
FB_PID=$!
export DISPLAY=:99

echo "################################################################################"
echo "Creating Python ${PYTHON_VERSION} virtual environment..."
echo "################################################################################"
echo

/usr/bin/virtualenv -p /usr/local/python-$PYTHON_VERSION/bin/python $WORKSPACE/pgadmin-venv
. $WORKSPACE/pgadmin-venv/bin/activate
$WORKSPACE/pgadmin-venv/bin/pip install -r requirements.txt
$WORKSPACE/pgadmin-venv/bin/pip install -r web/regression/requirements.txt

echo "################################################################################"
echo "Executing regression tests..."
echo "################################################################################"
echo

$WORKSPACE/pgadmin-venv/bin/python $WORKSPACE/web/regression/runtests.py --exclude feature_tests

echo "################################################################################"
echo "Cleaning up..."
echo "################################################################################"
echo

kill $FB_PID
