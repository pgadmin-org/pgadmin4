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

# Output basic details to show we're working
echo Building tarballs for "${APP_NAME}" version "${APP_LONG_VERSION}"...

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
cd web || exit
for FILE in $(git ls-files|grep -v regression)
do
    echo Adding "${FILE}"
    # We use tar here to preserve the path, as Mac (for example) doesn't support cp --parents
    # shellcheck disable=SC2164
    tar cf - "${FILE}" | (cd ../pip-build/pgadmin4; tar xf -)
done

yarn set version berry
yarn set version 3
yarn install
yarn run bundle

# Copy the commit_hash file, it doesn't show up in git ls-files
echo Adding "commit_hash"
tar cf - "commit_hash" | (cd ../pip-build/pgadmin4; tar xf -)

for FILE in pgadmin/static/js/generated/*
do
    echo Adding "${FILE}"
    # shellcheck disable=SC2164
    tar cf - "${FILE}" | (cd ../pip-build/pgadmin4; tar xf -)
done

cd ../docs || exit
for FILE in $(git ls-files)
do
    echo Adding "${FILE}"
    # We use tar here to preserve the path, as Mac (for example) doesn't support cp --parents
    # shellcheck disable=SC2164
    tar cf - "${FILE}" | (cd ../pip-build/pgadmin4/docs; tar xf -)
done

for DIR in ./??_??/
do
    if [ -d "${DIR}"/_build/html ]; then
        mkdir -p "../pip-build/pgadmin4/docs/${DIR}/_build"
        cp -R "${DIR}/_build/html" "../pip-build/pgadmin4/docs/${DIR}/_build"
    fi
done

cd ../
for FILE in LICENSE DEPENDENCIES README.md
do
    echo Adding ${FILE}
    # We use tar here to preserve the path, as Mac (for example) doesn't support cp --parents
    # shellcheck disable=SC2164
    tar cf - ${FILE} | (cd pip-build/pgadmin4; tar xf -)
done

# Generating SBOM
echo Generating SBOM...
cp requirements.txt pip-build/pgadmin4
syft pip-build/pgadmin4 -o cyclonedx-json > pip-build/pgadmin4/sbom.json
rm pip-build/pgadmin4/requirements.txt

# Create the distro config
echo Creating distro config...
echo HELP_PATH = \'../../docs/en_US/_build/html/\' > pip-build/pgadmin4/config_distro.py
echo MINIFY_HTML = False >> pip-build/pgadmin4/config_distro.py

# Create the manifest
echo Creating manifest...
echo recursive-include pgadmin4 \* > pip-build/MANIFEST.in

# Run the build
echo Building wheel...
cd pip-build || exit
python ../pkg/pip/setup_pip.py bdist_wheel
cd ../

# Get the build
if [ ! -d dist ]; then
    mkdir dist
fi
cp pip-build/dist/*.whl dist/
