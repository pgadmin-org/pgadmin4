#!/bin/sh

echo "################################################################################"
echo "Building runtime - QT4..."
echo "################################################################################"
echo

cd $WORKSPACE/runtime
make clean
PATH=/usr/local/python-$PYTHON_VERSION/bin:$PATH /bin/qmake-qt4
make all
