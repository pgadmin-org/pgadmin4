#!/bin/sh

echo "################################################################################"
echo "Executing jasmine tests..."
echo "################################################################################"
echo

cd $WORKSPACE/web/

/bin/npm install
./node_modules/.bin/karma start --single-run
