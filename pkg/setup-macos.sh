#!/bin/sh

set -e

OPENSSL_VERSION=1.0.2o
PYTHON_VERSION=3.6.6
NODE_VERSION=10.5.0

DIR=$(cd `dirname $0` && cd .. && pwd)
DEP_DIR=${DIR}/deps
if  [ -d ${DEP_DIR} ]; then
    rm -rf ${DEP_DIR}
fi
mkdir -p ${DEP_DIR}

echo
echo "Setting up for macOS..."
echo

pushd ${DEP_DIR}

    # Download and install OpenSSL
    curl -O https://www.openssl.org/source/openssl-${OPENSSL_VERSION}.tar.gz || (echo "Failed to download OpenSSL" && exit 1)
    tar -zxvf openssl-${OPENSSL_VERSION}.tar.gz || (echo "Failed to unpack OpenSSL" && exit 1)
    pushd openssl-${OPENSSL_VERSION} > /dev/null
         ./Configure --prefix="${DEP_DIR}/openssl" shared darwin64-x86_64-cc enable-ec_nistp_64_gcc_128 no-ssl2 no-ssl3 no-comp  || (echo "Failed to configure OpenSSL" && exit 1)
         make depend || (echo "Failed to build OpenSSL" && exit 1)
         make tests || (echo "Failed to test OpenSSL" && exit 1)
         make install || (echo "Failed to install OpenSSL" && exit 1)
    popd

    # Download and install Python 3.6
    curl -O https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz || (echo "Failed to download Python" && exit 1)
    tar -zxvf Python-${PYTHON_VERSION}.tgz || (echo "Failed to unpack Python" && exit 1)
    pushd Python-${PYTHON_VERSION} > /dev/null
        CFLAGS=-I"${DEP_DIR}/openssl/include" LDFLAGS=-L"${DEP_DIR}/openssl/lib" ./configure --prefix="${DEP_DIR}/python" || (echo "Failed to configure Python" && exit 1)
        CFLAGS=-I"${DEP_DIR}/openssl/include" LDFLAGS=-L"${DEP_DIR}/openssl/lib" make all || (echo "Failed to build Python" && exit 1)
        make test || (echo "Failed to test Python" && exit 1)
        make install || (echo "Failed to install Python" && exit 1)
        curl -s https://bootstrap.pypa.io/get-pip.py | "${DEP_DIR}/python/bin/python3" || (echo "Failed to download/update Pip" && exit 1)
        "${DEP_DIR}/python/bin/pip3" install --upgrade setuptools virtualenv || (echo "Failed to update virtualenv/setuptools" && exit 1)
    popd

    # Install Node.JS
    curl -O https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz || (echo "Failed to download Node" && exit 1)
    tar -zxvf node-v${NODE_VERSION}-darwin-x64.tar.gz || (echo "Failed to unpack Node" && exit 1)

    # Install Yarn
    node-v${NODE_VERSION}-darwin-x64/bin/npm install yarn || (echo "Failed to install Yarn" && exit 1)

    # Tell npm to use the system default Python as node-gyp won't work with Python 3
    node-v${NODE_VERSION}-darwin-x64/bin/npm config set python /usr/bin/python || (echo "Failed to set the default Python for NPM" && exit 1)

popd

echo
echo Set your PATH variable to use the configured dependencies:
echo
echo export PATH=$(pwd)/node_modules/.bin:${DEP_DIR}/node-v10.5.0-darwin-x64/bin:${DEP_DIR}/python/bin:\$PATH
echo
