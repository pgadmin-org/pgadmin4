#!/bin/sh

echo "EXECUTING: Build runtime - QT5"
echo

cd $WORKSPACE/runtime

make clean
PATH=/usr/local/python-$PYTHON_VERSION/bin:$PATH /bin/qmake-qt5 DEFINES+=PGADMIN4_USE_WEBKIT
make all
