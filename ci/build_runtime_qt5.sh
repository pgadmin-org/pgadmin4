#!/bin/sh

echo "################################################################################"
echo "Building runtime - QT5..."
echo "################################################################################"
echo

make clean
cd $WORKSPACE/runtime
PATH=/usr/local/python-$PYTHON_VERSION/bin:$PATH /bin/qmake-qt5 DEFINES+=PGADMIN4_USE_WEBKIT
make all
