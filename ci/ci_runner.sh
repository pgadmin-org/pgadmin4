#!/bin/sh

${WORKSPACE}/ci/create_config.sh || { echo 'ERROR: Failed to create the configuration.' ; exit 1; }
${WORKSPACE}/ci/run_python_tests.sh || { echo 'ERROR: Error detected when running the Python tests.' ; exit 1; }
${WORKSPACE}/ci/run_jasmine_tests.sh || { echo 'ERROR: Error detected when running the Jasmine tests.' ; exit 1; }
${WORKSPACE}/ci/build_docs.sh || { echo 'ERROR: Failed to build the documentation.' ; exit 1; }
${WORKSPACE}/ci/build_runtime_qt4.sh || { echo 'ERROR: Failed to build the QT4 runtime.' ; exit 1; }
${WORKSPACE}/ci/build_runtime_qt5.sh || { echo 'ERROR: Failed to build the QT5 runtime.' ; exit 1; }
${WORKSPACE}/ci/update_messages.sh || { echo 'ERROR: Failed to update translation message catalogs.' ; exit 1; }
${WORKSPACE}/ci/build_pip_wheel.sh || { echo 'ERROR: Failed to build the PIP wheel.' ; exit 1; }
${WORKSPACE}/ci/build_tarballs.sh || { echo 'ERROR: Failed to build the tarballs.' ; exit 1; }
