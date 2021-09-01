#!/bin/bash

# Build script to create Mac App Bundle and DMG for pgAdmin4 runtime

# Exit when any command fails
set -e -E

# Debugging shizz
trap 'ERRCODE=$? && if [ ${ERRCODE} -ne 0 ]; then echo "The command \"${BASH_COMMAND}\" failed in \"${FUNCNAME}\" with exit code ${ERRCODE}."; fi' EXIT

SCRIPT_DIR=$(cd `dirname $0` && pwd)
SOURCE_DIR=$(realpath ${SCRIPT_DIR}/../..)
BUILD_ROOT=$(realpath ${SCRIPT_DIR}/../..)/mac-build
TEMP_DIR=$(realpath ${SCRIPT_DIR}/../..)/mac-temp
DIST_ROOT=$(realpath ${SCRIPT_DIR}/../..)/dist

CODESIGN=1
if [ ! -f ${SCRIPT_DIR}/codesign.conf ]; then
    echo
    echo "******************************************************************"
    echo "* pkg/mac/codesign.conf not found. NOT signing the binaries."
    echo "******************************************************************"
    echo
    CODESIGN=0
    sleep 2
else
    source ${SCRIPT_DIR}/codesign.conf
fi

NOTARIZE=1
if [ ! -f ${SCRIPT_DIR}/notarization.conf ]; then
    echo
    echo "******************************************************************"
    echo "* pkg/mac/notarization.conf not found. NOT notarizing the package."
    echo "******************************************************************"
    echo
    NOTARIZE=0
    sleep 2
else
    source ${SCRIPT_DIR}/notarization.conf
fi

if [ "x${PGADMIN_POSTGRES_DIR}" == "x" ]; then
    echo "PGADMIN_POSTGRES_DIR not set. Setting it to the default: /usr/local/pgsql"
    export PGADMIN_POSTGRES_DIR=/usr/local/pgsql
fi

if [ "x${PGADMIN_PYTHON_VERSION}" == "x" ]; then
    echo "PGADMIN_PYTHON_VERSION not set. Setting it to the default: 3.9.5"
    export PGADMIN_PYTHON_VERSION=3.9.5
fi

source ${SCRIPT_DIR}/build-functions.sh

_setup_env
_cleanup
_build_runtime
_create_python_env
_build_docs
_complete_bundle
_codesign_binaries
_codesign_bundle
_create_dmg
_codesign_dmg
_notarize_pkg
