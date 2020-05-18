#!/bin/bash

# Build script to create Mac App Bundle and DMG for pgAdmin4 runtime

# Exit when any command fails
set -e -E

# Debugging shizz
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
trap 'if [ $? -ne 0 ]; then echo "\"${last_command}\" command filed with exit code $?."; fi' EXIT

SCRIPT_DIR=$(cd `dirname $0` && pwd)
SOURCE_DIR=$(realpath ${SCRIPT_DIR}/../..)
BUILD_ROOT=$(realpath ${SCRIPT_DIR}/../..)/mac-build
DIST_ROOT=$(realpath ${SCRIPT_DIR}/../..)/dist

if [ ! -f ${SCRIPT_DIR}/framework.conf ]; then
    echo
    echo "Error: pkg/mac/framework.conf not found!"
    echo "Copy pkg/mac/framework.conf.in to pkg/mac/framework.conf and edit as required for the current system."
    echo
    exit 1
fi

CODESIGN=1
if [ ! -f ${SCRIPT_DIR}/codesign.conf ]; then
    echo
    echo "******************************************************************"
    echo "* ${SCRIPT_DIR}/codesign.conf not found. NOT signing the binaries."
    echo "******************************************************************"
    echo
    CODESIGN=0
    sleep 5
else
    source ${SCRIPT_DIR}/codesign.conf
fi

if [ "x${PGADMIN_PYTHON_DIR}" == "x" ]; then
    echo "PGADMIN_PYTHON_DIR not set. Setting it to the default: /usr/local/python"
    export PGADMIN_PYTHON_DIR=/usr/local/python
fi
PYTHON_EXE=${PGADMIN_PYTHON_DIR}/bin/python3

# Check if Python is working and calculate PYTHON_VERSION
if ${PYTHON_EXE} -V > /dev/null 2>&1; then
    PYTHON_VERSION=`${PYTHON_EXE} -V 2>&1 | awk '{print $2}' | cut -d"." -f1-2 | sed 's/\.//'`
else
    echo "Error: Python installation missing!"
    exit 1
fi

if [ "${PYTHON_VERSION}" -gt "38" ] && [ "${PYTHON_VERSION}" -lt "34" ]; then
    echo "Python version not supported."
    exit 1
fi

if [ "x${PGADMIN_QT_DIR}" == "x" ]; then
    echo "PGADMIN_QT_DIR not set. Setting it to the default: ~/Qt/5.13.2/clang_64"
    export PGADMIN_QT_DIR=~/Qt/5.13.2/clang_64
fi

QMAKE=${PGADMIN_QT_DIR}/bin/qmake
if ! ${QMAKE} --version > /dev/null 2>&1; then
    echo "Error: qmake not found. QT installation is not present or incomplete."
    exit 1
fi

if [ "x${PGADMIN_POSTGRES_DIR}" == "x" ]; then
    echo "PGADMIN_POSTGRES_DIR not set. Setting it to the default: /usr/local/pgsql"
    export PGADMIN_POSTGRES_DIR=/usr/local/pgsql
fi

source ${SCRIPT_DIR}/build-functions.sh

_setup_env
_cleanup
_create_venv
_build_runtime
_build_docs
_complete_bundle
_framework_config
_codesign_binaries
_codesign_bundle
_create_dmg
_codesign_dmg
