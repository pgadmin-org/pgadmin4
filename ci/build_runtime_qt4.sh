#!/bin/sh

echo "EXECUTING: Build runtime - QT4"
echo

if [ ${PYTHON_VERSION:0:1} == "3" ]; then
    CONFIG=/usr/local/python-${PYTHON_VERSION}/bin/python3-config
else
    CONFIG=/usr/local/python-${PYTHON_VERSION}/bin/python-config
fi

cd ${WORKSPACE}/runtime

make clean
PATH=/usr/local/python-${PYTHON_VERSION}/bin:$PATH PYTHON_CONFIG=${CONFIG} /bin/qmake-qt4 || { echo 'ERROR: Failed to run the QT4 qmake step.' ; exit 1; }
make all || { echo 'ERROR: Failed to build the QT4 runtime.' ; exit 1; }
