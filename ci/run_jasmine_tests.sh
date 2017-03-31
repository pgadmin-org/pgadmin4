#!/bin/sh

echo "EXECUTING: Jasmine tests"
echo

cd $WORKSPACE/web/

/bin/npm install
./node_modules/.bin/karma start --single-run
