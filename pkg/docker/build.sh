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

mkdir -p docker-build/pgadmin4

# Build the clean tree
echo Copying source tree...
git archive HEAD -- docs web requirements.txt | tar xvf - -C docker-build/pgadmin4

# Copy the Docker specific assets into place
cp pkg/docker/Dockerfile \
    pkg/docker/entrypoint.sh \
    pkg/docker/config_distro.py \
    pkg/docker/run_pgadmin.py \
    pkg/docker/.dockerignore \
    docker-build/

# Build the container
docker build docker-build -t $CONTAINER_NAME \
                          -t $CONTAINER_NAME:latest \
                          -t $CONTAINER_NAME:$APP_RELEASE \
                          -t $CONTAINER_NAME:$APP_LONG_VERSION
