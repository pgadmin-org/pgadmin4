#!/usr/bin/env bash

set -e

DIR=$(cd `dirname $0` && cd .. && pwd)
BUILD_DIR=${DIR}/mac-build
mkdir -p ${BUILD_DIR}

function fastcp() {
  SRC_DIR=${1}
  PARENT_DIR=$(dirname ${SRC_DIR})
  SRC_FOLDER=$(basename ${SRC_DIR})
  DEST_DIR=${2}

  tar \
    --exclude=node_modules \
    --exclude=out \
    --exclude=dist \
    --exclude=venv \
    --exclude=__pycache__ \
    --exclude=regression \
    --exclude='pgadmin/static/js/generated/.cache' \
    --exclude='.cache' \
    -C ${PARENT_DIR} \
    -cf - ${SRC_FOLDER} | tar -C ${DEST_DIR} -xf -
}

echo "## Copying Electron Folder to the temporary directory..."
fastcp ${DIR}/electron ${BUILD_DIR}

pushd ${BUILD_DIR}/electron > /dev/null
  echo "## Copying pgAdmin folder to the temporary directory..."
  rm -rf web; fastcp ${DIR}/web ${BUILD_DIR}/electron

  echo "## Creating Virtual Environment..."
  rm -rf venv; mkdir -p venv
  pip install virtualenv
  virtualenv --always-copy ./venv

  # Hack: Copies all python installation files to the virtual environment
  # This was done because virtualenv does not copy all of the files
  # Looks like it assumes that they are not needed or that they should be installed in the system
  echo "  ## Copy all python libraries to the newly created virtual environment"
  PYTHON_LIB_PATH=`dirname $(python -c "import logging;print(logging.__file__)")`/../
  cp -r ${PYTHON_LIB_PATH}* venv/lib/python3.6/

  source ./venv/bin/activate

  echo "## Installs all the dependencies of pgAdmin"
  pip install --no-cache-dir --no-binary psycopg2 -r ${DIR}/requirements.txt

  echo "## Building the Javascript of the application..."
  pushd web > /dev/null
    rm -rf node_modules
    yarn bundle-app-js
  popd > /dev/null

  echo "## Creating the dmg file..."
  yarn install
  yarn dist:darwin
popd > /dev/null

rm -f ${DIR}/dist/*.dmg
mkdir -p ${DIR}/dist
mv ${BUILD_DIR}/electron/out/make/*.dmg ${DIR}/dist/
