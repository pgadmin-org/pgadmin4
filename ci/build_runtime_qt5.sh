#!/bin/sh

echo "################################################################################"
echo "Building runtime - QT5..."
echo "################################################################################"
echo

cd $WORKSPACE/runtime

make clean
PATH=/usr/local/python-$PYTHON_VERSION/bin:$PATH /bin/qmake-qt5 DEFINES+=PGADMIN4_USE_WEBKIT
make all
