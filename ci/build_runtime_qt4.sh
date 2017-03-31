#!/bin/sh

echo "EXECUTING: Build runtime - QT4"
echo

cd $WORKSPACE/runtime

make clean
PATH=/usr/local/python-$PYTHON_VERSION/bin:$PATH /bin/qmake-qt4
make all
