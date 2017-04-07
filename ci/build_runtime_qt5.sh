#!/bin/sh

echo "EXECUTING: Build runtime - QT5"
echo

cd $WORKSPACE/runtime

make clean
PATH=/usr/local/python-$PYTHON_VERSION/bin:$PATH /bin/qmake-qt5 DEFINES+=PGADMIN4_USE_WEBKIT || { echo 'ERROR: Failed to run the QT5 qmake step.' ; exit 1; }
make all || { echo 'ERROR: Failed to build the QT4 runtime.' ; exit 1; }
