#!/bin/bash

########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

# Runtime checks
if [ ! -d runtime ] && [ ! -d web ]; then
    echo This script must be run from the top-level directory of the source tree.
    exit 1
fi

if [ ! -d .git ] && [ ! -f .git/config ]; then
    echo This script must be run from a git checkout of the source tree.
    exit 1
fi

# Get the required package info
APP_RELEASE=$(grep "^APP_RELEASE" web/version.py | cut -d"=" -f2 | sed 's/ //g')
APP_REVISION=$(grep "^APP_REVISION" web/version.py | cut -d"=" -f2 | sed 's/ //g')
APP_NAME=$(grep "^APP_NAME" web/branding.py | cut -d"=" -f2 | sed "s/'//g" | sed 's/^ //')
APP_LONG_VERSION=${APP_RELEASE}.${APP_REVISION}
APP_SUFFIX=$(grep "^APP_SUFFIX" web/version.py | cut -d"=" -f2 | sed 's/ //g' | sed "s/'//g")
if [ -n "${APP_SUFFIX}" ]; then
    export APP_LONG_VERSION=${APP_LONG_VERSION}-${APP_SUFFIX}
fi
TARBALL_NAME=$(echo "${APP_NAME}-${APP_LONG_VERSION}" | sed 's/ //g' | awk '{print tolower($0)}')
DOC_TARBALL_NAME=$(echo "${APP_NAME}-${APP_LONG_VERSION}-docs" | sed 's/ //g' | awk '{print tolower($0)}')

# Get the github timestamp
git log -1 --format='%H %as' > web/commit_hash

# Output basic details to show we're working
echo "Building tarballs for ${APP_NAME} version ${APP_LONG_VERSION}..."

# Create/clearout the build directory
echo Creating/cleaning required directories...
if [ ! -d src-build ]; then
    mkdir src-build
fi

if [ -d "src-build/${TARBALL_NAME}" ]; then
    rm -rf "src-build/${TARBALL_NAME}"
fi

mkdir "src-build/${TARBALL_NAME}"

# Create the output directory if not present
if [ ! -d dist ]; then
    mkdir dist
fi

if [ -f "dist/${TARBALL_NAME}.tar.gz" ]; then
    rm -f "dist/${TARBALL_NAME}.tar.gz"
fi

if [ -f "dist/${DOC_TARBALL_NAME}.tar.gz" ]; then
    rm -f "dist/${DOC_TARBALL_NAME}.tar.gz"
fi

# Build the clean tree
for FILE in $(git ls-files)
do
    echo Adding "${FILE}"
    # We use tar here to preserve the path, as Mac (for example) doesn't support cp --parents
    # shellcheck disable=SC2164
    tar cf - "${FILE}" | (cd "src-build/${TARBALL_NAME}"; tar xf -)
done

# Copy the commit_hash file, it doesn't show up in git ls-files
echo Adding "web/commit_hash"
tar cf - "web/commit_hash" | (cd "src-build/${TARBALL_NAME}"; tar xf -)

# Create the tarball
echo Creating tarball...
cd src-build || exit
tar zcvf "../dist/${TARBALL_NAME}.tar.gz" "${TARBALL_NAME}"
cd ..

# Create the docs
echo Creating docs...
cd "src-build/${TARBALL_NAME}/docs/en_US" || exit
make -f Makefile.sphinx html
cd _build || exit
mv html "${DOC_TARBALL_NAME}"
tar zcvf "../../../../../dist/${DOC_TARBALL_NAME}.tar.gz" "${DOC_TARBALL_NAME}"
cd ../../../../../

# Fin!
echo "Created tarball dist/${TARBALL_NAME}.tar.gz and dist/${DOC_TARBALL_NAME}.tar.gz"
