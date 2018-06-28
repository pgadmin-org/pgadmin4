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
DOC_TARBALL_NAME=`echo $APP_NAME-$APP_LONG_VERSION-docs | sed 's/ //g' | awk '{print tolower($0)}'`

# Output basic details to show we're working
echo Building tarballs for $APP_NAME version $APP_LONG_VERSION...

# Create/clearout the build directory
echo Creating/cleaning required directories...
if [ ! -d src-build ]; then
    mkdir src-build
fi

if [ -d src-build/$TARBALL_NAME ]; then
    rm -rf src-build/$TARBALL_NAME
fi

mkdir src-build/$TARBALL_NAME

# Create the output directory if not present
if [ ! -d dist ]; then
    mkdir dist
fi

if [ -f dist/$TARBALL_NAME.tar.gz ]; then
    rm -f dist/$TARBALL_NAME.tar.gz
fi

if [ -f dist/$DOC_TARBALL_NAME.tar.gz ]; then
    rm -f dist/$DOC_TARBALL_NAME.tar.gz
fi

# Build the clean tree
for FILE in `git ls-files`
do
    echo Adding $FILE
    # We use tar here to preserve the path, as Mac (for example) doesn't support cp --parents
    tar cf - $FILE | (cd src-build/$TARBALL_NAME; tar xf -)
done

pushd web
    yarn install
    yarn run bundle

    for FILE in `ls -d pgadmin/static/js/generated/*`
    do
        echo Adding $FILE
        tar cf - $FILE | (cd ../src-build/$TARBALL_NAME/web; tar xf -)
    done
popd

# Create the tarball
echo Creating tarball...
cd src-build
tar zcvf ../dist/$TARBALL_NAME.tar.gz $TARBALL_NAME
cd ..

# Create the docs
echo Creating docs...
cd src-build/$TARBALL_NAME/docs/en_US
make -f Makefile.sphinx html
cd _build
mv html $DOC_TARBALL_NAME
tar zcvf ../../../../../dist/$DOC_TARBALL_NAME.tar.gz $DOC_TARBALL_NAME
cd ../../../../../

# Fin!
echo Created tarball dist/$TARBALL_NAME.tar.gz and dist/$DOC_TARBALL_NAME.tar.gz
