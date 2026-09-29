#!/bin/bash

# Build script to create Mac App Bundle and DMG for pgAdmin4 runtime

# Exit when any command fails
set -e -E

# Debugging shizz
trap 'ERRCODE=$? && if [ ${ERRCODE} -ne 0 ]; then echo "The command \"${BASH_COMMAND}\" failed in \"${FUNCNAME}\" with exit code ${ERRCODE}."; fi' EXIT

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
export SCRIPT_DIR
SOURCE_DIR=$(realpath "${SCRIPT_DIR}"/../..)
export SOURCE_DIR
BUILD_ROOT=$(realpath "${SCRIPT_DIR}"/../..)/mac-build
export BUILD_ROOT
TEMP_DIR=$(realpath "${SCRIPT_DIR}"/../..)/mac-temp
export TEMP_DIR
DIST_ROOT=$(realpath "${SCRIPT_DIR}"/../..)/dist
export DIST_ROOT

export CODESIGN=1
if [ ! -f "${SCRIPT_DIR}/codesign.conf" ]; then
    echo
    echo "******************************************************************"
    echo "* pkg/mac/codesign.conf not found. NOT signing the binaries."
    echo "******************************************************************"
    echo
    export CODESIGN=0
    sleep 2
else
    # shellcheck disable=SC1091
    source "${SCRIPT_DIR}/codesign.conf"
fi

export NOTARIZE=1
if [ ! -f "${SCRIPT_DIR}/notarization.conf" ]; then
    echo
    echo "******************************************************************"
    echo "* pkg/mac/notarization.conf not found. NOT notarizing the package."
    echo "******************************************************************"
    echo
    export NOTARIZE=0
    sleep 2
else
    # shellcheck disable=SC1091
    source "${SCRIPT_DIR}/notarization.conf"
fi

if [ "${PGADMIN_POSTGRES_DIR}" == "" ]; then
    echo "PGADMIN_POSTGRES_DIR not set. Setting it to the default: /usr/local/pgsql"
    export PGADMIN_POSTGRES_DIR=/usr/local/pgsql
fi

# Which Python gets bundled is a property of this commit rather than of the
# machine or the environment the build happens to run in, so it is read from
# pkg/python-version.txt and cannot be overridden from outside. The Windows
# build reads the same file.
#
# Unlike Windows, this still builds the framework with relocatable-python,
# which downloads from python.org itself and so only needs the version.
# python-build-standalone's relocatable distributions are not framework-shaped,
# and shipping one instead would mean reworking both the codesigning and the
# @loader_path rewriting in _fixup_imports, which is a job of its own.
PYTHON_VERSION_FILE="${SOURCE_DIR}/pkg/python-version.txt"
PGADMIN_PYTHON_VERSION=$(sed -nE 's/^PYTHON_VERSION=([0-9.]+)[[:space:]]*$/\1/p' "${PYTHON_VERSION_FILE}")
if [ -z "${PGADMIN_PYTHON_VERSION}" ]; then
    echo "ERROR: could not read PYTHON_VERSION from ${PYTHON_VERSION_FILE}" >&2
    exit 1
fi
export PGADMIN_PYTHON_VERSION
echo "Bundling Python ${PGADMIN_PYTHON_VERSION}, per ${PYTHON_VERSION_FILE}."

# Initialize variables
CREATE_ZIP=0
CREATE_DMG=1

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --zip)
            CREATE_ZIP=1
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --zip         Create both ZIP and DMG files"
            echo "  --help        Display this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/build-functions.sh"

_setup_env
_cleanup
_build_runtime
_create_python_env
_build_docs
_complete_bundle
_strip_architecture
_prune_dangling_symlinks
_verify_bundle_linkage
_generate_sbom
_codesign_binaries
_codesign_bundle

# Handle ZIP creation if requested
if [ "${CREATE_ZIP}" -eq 1 ]; then
    _create_zip
    _notarize_zip
fi

# Handle DMG creation if not disabled
if [ "${CREATE_DMG}" -eq 1 ]; then
    _create_dmg
    _codesign_dmg
    _notarize_dmg
fi
