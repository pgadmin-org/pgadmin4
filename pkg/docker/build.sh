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
CONTAINER_NAME=`echo $APP_NAME | sed 's/ //g' | awk '{print tolower($0)}'`

# Output basic details to show we're working
echo Building Docker Container for $APP_NAME version $APP_LONG_VERSION...

# Create/clearout the build directory
echo Creating/cleaning required directories...
if [ -d docker-build ]; then
    rm -rf docker-build
fi

mkdir docker-build

# Create the output directory if not present
if [ ! -d dist ]; then
    mkdir dist
fi

# Build the clean tree
for FILE in `git ls-files web`
do
    echo Adding $FILE
    # We use tar here to preserve the path, as Mac (for example) doesn't support cp --parents
    tar cf - $FILE | (cd docker-build; tar xf -)
done

pushd web
    yarn install
    yarn run bundle

    rm -rf pgadmin/static/js/generated/.cache

    for FILE in `ls -d pgadmin/static/js/generated/*`
    do
        echo Adding $FILE
        tar cf - $FILE | (cd ../docker-build/web; tar xf -)
    done
popd

# Build the docs
if [ -d docs/en_US/_build/html ]; then
    rm -rf docs/en_US/_build/html
fi

LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 make -C docs/en_US -f Makefile.sphinx html

mkdir docker-build/web/docs
cp -R docs/en_US/_build/html/* docker-build/web/docs/

# Configure pgAdmin
echo "HELP_PATH = '../../docs/'" >> docker-build/web/config_distro.py
echo "DEFAULT_BINARY_PATHS = {" >> docker-build/web/config_distro.py
echo "    'pg':   ''," >> docker-build/web/config_distro.py
echo "    'ppas': ''," >> docker-build/web/config_distro.py
echo "    'gpdb': ''" >> docker-build/web/config_distro.py
echo "}" >> docker-build/web/config_distro.py

# Copy the Docker specific assets into place
cp pkg/docker/Dockerfile docker-build/
cp pkg/docker/entry.sh docker-build/
cp pkg/docker/pgadmin4.conf.j2 docker-build/
cp requirements.txt docker-build/

# Build the container
docker build docker-build -t $CONTAINER_NAME \
                          -t $CONTAINER_NAME:latest \
                          -t $CONTAINER_NAME:$APP_RELEASE \
                          -t $CONTAINER_NAME:$APP_LONG_VERSION