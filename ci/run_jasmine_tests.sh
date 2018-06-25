#!/bin/sh

echo "EXECUTING: Jasmine tests"
echo

cd ${WORKSPACE}/web/

/usr/bin/yarn install || { echo 'ERROR: Failed to install the required Javascript modules.' ; exit 1; }
/usr/bin/yarn run linter  || { echo 'ERROR: Failed to lint the Javascript code.' ; exit 1; }
./node_modules/.bin/karma start --single-run || { echo 'ERROR: Error detected when running the Jasmine tests.' ; exit 1; }
