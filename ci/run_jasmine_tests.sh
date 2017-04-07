#!/bin/sh

echo "EXECUTING: Jasmine tests"
echo

cd $WORKSPACE/web/

/bin/npm install || { echo 'ERROR: Failed to install the required Javascript modules.' ; exit 1; }
./node_modules/.bin/karma start --single-run || { echo 'ERROR: Error detected when running the Jasmine tests.' ; exit 1; }
