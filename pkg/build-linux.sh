#!/usr/bin/env bash

set -e

DIR=$(cd `dirname $0` && cd .. && pwd)
if [ -f /etc/redhat-release ]; then
    BUILD_DIR=${DIR}/rpm-build
else
    BUILD_DIR=${DIR}/deb-build
fi
if  [ -d ${BUILD_DIR} ]; then
    rm -rf ${BUILD_DIR}
fi
mkdir -p ${BUILD_DIR}

if [ -f /etc/lsb-release ]; then
    source /etc/lsb-release
elif [ -f /etc/redhat-release ]; then
    DISTRIB_DESCRIPTION=$(cat /etc/redhat-release | sed -e 's/[[:space:]]*$//')
else
    echo "Unknown Linux distribution."
    exit 1
fi

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
  fastcp ${DIR}/web ${BUILD_DIR}/electron

  echo "## Creating Virtual Environment..."
  python3 -m venv --copies ./venv

  # Hack: Copies all python installation files to the virtual environment
  # This was done because virtualenv does not copy all of the files
  # Looks like it assumes that they are not needed or that they should be installed in the system
  echo "  ## Copy all python libraries to the newly created virtual environment"
  PYTHON_LIB_PATH=`dirname $(python3 -c "import logging;print(logging.__file__)")`/../
  PYTHON_VERSION=$(python3 -c 'import sys; print(("%d.%d") % (sys.version_info.major, sys.version_info.minor))')
  cp -r ${PYTHON_LIB_PATH}* venv/lib/python${PYTHON_VERSION}/

  # Needed for Ubuntu
  if [[ ${DISTRIB_DESCRIPTION} =~ "Ubuntu" ]]; then  
      mkdir -p venv/lib/x86_64-linux-gnu/
      cp /usr/lib/x86_64-linux-gnu/libpython${PYTHON_VERSION}m.so.1.0 venv/lib/x86_64-linux-gnu/
      pushd venv/lib/x86_64-linux-gnu > /dev/null
          ln -s libpython${PYTHON_VERSION}m.so.1.0 libpython${PYTHON_VERSION}m.so.1
      popd > /dev/null
  fi

  source ./venv/bin/activate
  PATH=$PATH:/usr/pgsql-10/bin pip3 install --no-cache-dir --no-binary psycopg2 -r ${DIR}/requirements.txt

  echo "## Building the Javascript of the application..."
  pushd web > /dev/null
    yarn bundle-app-js
  popd > /dev/null

  echo "## Creating the package file..."
  yarn install
  if [ -f /etc/redhat-release ]; then
      yarn dist:rpm
  else
      yarn dist:deb
  fi
popd > /dev/null

if [ -f /etc/redhat-release ]; then
    mkdir -p ${DIR}/dist
    cp -f ${BUILD_DIR}/electron/out/make/*.rpm ${DIR}/dist
else
    mkdir -p ${DIR}/dist
    cp -f ${BUILD_DIR}/electron/out/make/*.deb ${DIR}/dist
fi
