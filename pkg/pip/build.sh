#!/bin/bash

########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

# Runtime checks
if [ ! -d runtime -a ! -d web ]; then
    echo This script must be run from the top-level directory of the source tree.
    exit 1
fi

if [ ! -d .git -a ! -f .git/config ]; then
    echo This script must be run from a git checkout of the source tree.
    exit 1
fi

# Get the required package info
APP_RELEASE=`grep "^APP_RELEASE" web/config.py | cut -d"=" -f2 | sed 's/ //g'`
APP_REVISION=`grep "^APP_REVISION" web/config.py | cut -d"=" -f2 | sed 's/ //g'`
APP_NAME=`grep "^APP_NAME" web/config.py | cut -d"=" -f2 | sed "s/'//g" | sed 's/^ //'`
APP_LONG_VERSION=$APP_RELEASE.$APP_REVISION
APP_SHORT_VERSION=`echo $APP_LONG_VERSION | cut -d . -f1,2`
APP_SUFFIX=`grep "^APP_SUFFIX" web/config.py | cut -d"=" -f2 | sed 's/ //g' | sed "s/'//g"`
if [ ! -z $APP_SUFFIX ]; then
    export APP_LONG_VERSION=$APP_LONG_VERSION-$APP_SUFFIX
fi
TARBALL_NAME=`echo $APP_NAME-$APP_LONG_VERSION | sed 's/ //g' | awk '{print tolower($0)}'`

# Output basic details to show we're working
echo Building tarballs for $APP_NAME version $APP_LONG_VERSION...

# Create/clearout the build directory
echo Creating/cleaning required directories...
if [ ! -d pip-build ]; then
    mkdir pip-build
fi

if [ -d pip-build/pgadmin4 ]; then
    rm -rf pip-build/pgadmin4
fi

mkdir pip-build/pgadmin4
mkdir pip-build/pgadmin4/docs

# Build the clean tree
cd web
for FILE in `git ls-files`
do
    echo Adding $FILE
    # We use tar here to preserve the path, as Mac (for example) doesn't support cp --parents
    tar cf - $FILE | (cd ../pip-build/pgadmin4; tar xf -)
done

yarn install
yarn run bundle

for FILE in `ls -d pgadmin/static/js/generated/*`
do
    echo Adding $FILE
    tar cf - $FILE | (cd ../pip-build/pgadmin4; tar xf -)
done

cd ../docs
for FILE in `git ls-files`
do
    echo Adding $FILE
    # We use tar here to preserve the path, as Mac (for example) doesn't support cp --parents
    tar cf - $FILE | (cd ../pip-build/pgadmin4/docs; tar xf -)
done

for DIR in `ls -d ??_??/`
do
    if [ -d $DIR/_build/html ]; then
        mkdir -p ../pip-build/pgadmin4/docs/$DIR/_build
        cp -R $DIR/_build/html ../pip-build/pgadmin4/docs/$DIR/_build
    fi
done

cd ../
for FILE in LICENSE README libraries.txt
do
    echo Adding $FILE
    # We use tar here to preserve the path, as Mac (for example) doesn't support cp --parents
    tar cf - $FILE | (cd pip-build/pgadmin4; tar xf -)
done

# Create the distro config
echo Creating distro config...
echo HELP_PATH = \'../../docs/en_US/_build/html/\' > pip-build/pgadmin4/config_distro.py
echo MINIFY_HTML = False >> pip-build/pgadmin4/config_distro.py

# Create the manifest
echo Creating manifest...
echo recursive-include pgadmin4 \* > pip-build/MANIFEST.in

# Run the build
echo Building wheel...
cd pip-build
python ../pkg/pip/setup_pip.py bdist_wheel --universal
cd ../

# Get the build
if [ ! -d dist ]; then
    mkdir dist
fi
cp pip-build/dist/*.whl dist/
