#!/bin/sh

echo "EXECUTING: Python tests"
echo

echo "Starting virtual frame buffer..."
echo

Xvfb -ac :99 -screen 0 1280x1024x16 &
FB_PID=$!
export DISPLAY=:99

echo "Creating Python ${PYTHON_VERSION} virtual environment..."
echo

cd $WORKSPACE/

PYTHON_SUFFIX=""

if [[ "$PYTHON_VERSION" == 3* ]]; then
    PYTHON_SUFFIX="3"
fi

/usr/bin/virtualenv -p /usr/local/python-$PYTHON_VERSION/bin/python$PYTHON_SUFFIX $WORKSPACE/pgadmin-venv
. $WORKSPACE/pgadmin-venv/bin/activate
$WORKSPACE/pgadmin-venv/bin/pip install -r requirements.txt
$WORKSPACE/pgadmin-venv/bin/pip install -r web/regression/requirements.txt

echo "Running regression tests..."
echo

$WORKSPACE/pgadmin-venv/bin/python $WORKSPACE/web/regression/runtests.py

echo "Cleaning up..."
echo

kill $FB_PID
