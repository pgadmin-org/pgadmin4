#!/bin/sh

echo "EXECUTING: Build runtime - QT4"
echo

cd $WORKSPACE/runtime

make clean
PATH=/usr/local/python-$PYTHON_VERSION/bin:$PATH /bin/qmake-qt4 || { echo 'ERROR: Failed to run the QT4 qmake step.' ; exit 1; }
make all || { echo 'ERROR: Failed to build the QT4 runtime.' ; exit 1; }
