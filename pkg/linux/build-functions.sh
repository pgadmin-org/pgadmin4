# shellcheck shell=bash

_setup_env() {
    echo "Setting up the environment..."
    WD=$(cd "$(dirname "$1")" && pwd)
    SOURCEDIR=$(realpath "${WD}/../..")
    BUILDROOT=$(realpath "${WD}/../../$2-build")
    DESKTOPROOT=${BUILDROOT}/desktop
    METAROOT=${BUILDROOT}/meta
    SERVERROOT=${BUILDROOT}/server
    WEBROOT=${BUILDROOT}/web
    DISTROOT=$(realpath "${WD}/../../dist")
    APP_RELEASE=$(grep "^APP_RELEASE" web/version.py | cut -d"=" -f2 | sed 's/ //g')
    APP_REVISION=$(grep "^APP_REVISION" web/version.py | cut -d"=" -f2 | sed 's/ //g')
    APP_NAME=$(grep "^APP_NAME" web/branding.py | cut -d"=" -f2 | sed "s/'//g" | sed 's/^ //' | sed 's/ //g' | tr '[:upper:]' '[:lower:]')
    APP_LONG_VERSION=${APP_RELEASE}.${APP_REVISION}
    APP_SUFFIX=$(grep "^APP_SUFFIX" web/version.py | cut -d"=" -f2 | sed 's/ //g' | sed "s/'//g")
    if [ -n "${APP_SUFFIX}" ]; then
        APP_LONG_VERSION=${APP_LONG_VERSION}-${APP_SUFFIX}
    fi

    # Setting up the correct Python version for Ubuntu 18 and EL-8, which have
    # new Python versions installed parallel to the old ones.
    OS_VERSION=$(grep "^VERSION_ID=" /etc/os-release | awk -F "=" '{ print $2 }' | sed 's/"//g' | awk -F "." '{ print $1 }')
    SYSTEM_PYTHON_PATH='/usr/bin/python3'
    PYTHON_BINARY=$("${SYSTEM_PYTHON_PATH}" -c "import sys; print('python%d.%.d' % (sys.version_info.major, sys.version_info.minor))")
    PYTHON_BINARY_WITHOUT_DOTS='python3'
    if [ "$2" == 'redhat' ] && [ "${OS_VERSION}" == "8" ]; then
      SYSTEM_PYTHON_PATH='/usr/bin/python3.9'
      PYTHON_BINARY='python3.9'
      PYTHON_BINARY_WITHOUT_DOTS='python39'
    fi
}

_cleanup() {
    echo "Cleaning up the old environment and app..."
    if test -f "${SOURCEDIR}/runtime/pgAdmin4"; then
        rm -rf "${SOURCEDIR}/runtime/pgAdmin4"
    fi
    if test -d "${BUILDROOT}"; then
        rm -rf "${BUILDROOT}"
    fi
    rm -f "${DISTROOT}/pgadmin4"*".$1"
}

_setup_dirs() {
    echo "Creating output directories..."
    test -d "${BUILDROOT}" || mkdir "${BUILDROOT}"
    test -d "${DESKTOPROOT}" || mkdir "${DESKTOPROOT}"
    test -d "${METAROOT}" || mkdir "${METAROOT}"
    test -d "${SERVERROOT}" || mkdir "${SERVERROOT}"
    test -d "${WEBROOT}" || mkdir "${WEBROOT}"
    test -d "${DISTROOT}" || mkdir "${DISTROOT}"
}

_create_python_virtualenv() {
    echo "Creating the virtual environment..."

    cd "${SERVERROOT}" || exit

    # Create the required directories
    mkdir -p "usr/${APP_NAME}"
    cd "usr/${APP_NAME}" || exit

    # Create the blank venv
    "${SYSTEM_PYTHON_PATH}" -m venv venv
    # shellcheck disable=SC1091
    . venv/bin/activate

    # Make sure we have the wheel package present, as well as the latest pip
    pip3 install --upgrade pip
    pip3 install setuptools
    pip3 install wheel

    # Install the requirements
    pip3 install --no-cache-dir --no-binary psycopg -r "${SOURCEDIR}/requirements.txt"

    # Fixup the paths in the venv activation scripts
    sed -i 's/VIRTUAL_ENV=.*/VIRTUAL_ENV="\/usr\/pgadmin4\/venv"/g' venv/bin/activate
    sed -i 's/setenv VIRTUAL_ENV .*/setenv VIRTUAL_ENV "\/usr\/pgadmin4\/venv"/g' venv/bin/activate.csh
    sed -i 's/set -gx VIRTUAL_ENV .*/set -gx VIRTUAL_ENV "\/usr\/pgadmin4\/venv"/g' venv/bin/activate.fish

    # Remove __pycache__
    find . -name "__pycache__" -type d -print0 | xargs -0 rm -rf

    # Fixup hash bangs
    sed -i 's/#!.*\/python3/#\!\/usr\/pgadmin4\/venv\/bin\/python3/g' venv/bin/*

    # Figure out some paths for use when completing the venv
    # Use "python3" here as we want the venv path
    DIR_PYMODULES_PATH=$(python3 -c "from sysconfig import get_path; print(get_path('platstdlib'))")

    # Use {SYSTEM_PYTHON_PATH} here as we want the system path
    if [ "$1" == "debian" ]; then
        PYSYSLIB_PATH=$("${SYSTEM_PYTHON_PATH}" -c "import sys; print('%s/lib/python%d.%.d' % (sys.prefix, sys.version_info.major, sys.version_info.minor))")
    else
        PYSYSLIB_PATH=$("${SYSTEM_PYTHON_PATH}" -c "import sys; print('%s/lib64/python%d.%.d' % (sys.prefix, sys.version_info.major, sys.version_info.minor))")
    fi

    # Symlink in the rest of the Python libs. This is required because the runtime
    # will clear PYTHONHOME for safety, which has the side-effect of preventing
    # it from finding modules that are not explicitly included in the venv
    cd "${DIR_PYMODULES_PATH}" || exit

    # Files
    for FULLPATH in "${PYSYSLIB_PATH}"/*.py; do
        FILE=${FULLPATH##*/}
        if [ ! -e "${FILE}" ]; then
           ln -s "${FULLPATH}" "${FILE}"
        fi
    done

    # Paths
    for FULLPATH in "${PYSYSLIB_PATH}"/*/; do
        FULLPATH=${FULLPATH%*/}
        FILE=${FULLPATH##*/}
        if [ ! -e "${FILE}" ]; then
            ln -s "${FULLPATH}" "${FILE}"
        fi
    done

    # Remove tests
    cd site-packages || exit
    find . -name "test" -type d -print0 | xargs -0 rm -rf
    find . -name "tests" -type d -print0 | xargs -0 rm -rf

    # Link the python<version> directory to python so that the private environment path is found by the application.
    if test -d "${DIR_PYMODULES_PATH}"; then
        ln -s "$(basename "${DIR_PYMODULES_PATH}")" "${DIR_PYMODULES_PATH}/../python"
    fi
}

_build_runtime() {
    echo "Assembling the desktop runtime..."

    # Get a fresh copy of electron.

    ELECTRON_ARCH="x64"
    if [ "$(uname -m)" == "arm64" ]; then
      ELECTRON_ARCH="arm64"
    fi

    ELECTRON_VERSION="$(npm info electron version)"
    # Pin the electron version to "33.3.2" due to the following issue
    # https://github.com/electron/electron/issues/45884
    if [ "$1" == 'redhat' ] && [ "${OS_VERSION}" == "8" ]; then
      ELECTRON_VERSION="33.3.2"
    fi

    pushd "${BUILDROOT}" > /dev/null || exit
        while true;do
            wget "https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/electron-v${ELECTRON_VERSION}-linux-${ELECTRON_ARCH}.zip" && break
            rm "electron-v${ELECTRON_VERSION}-linux-${ELECTRON_ARCH}.zip"
        done
        unzip "electron-v${ELECTRON_VERSION}-linux-${ELECTRON_ARCH}.zip" -d "electron-v${ELECTRON_VERSION}-linux-${ELECTRON_ARCH}"
    popd > /dev/null || exit

    # Copy electron into the staging directory
    mkdir -p "${DESKTOPROOT}/usr/${APP_NAME}/bin"

    # Change the permission for others and group the same as the owner
    chmod -R og=u "${BUILDROOT}/electron-v${ELECTRON_VERSION}-linux-${ELECTRON_ARCH}"/*
    # Explicitly remove write permissions for others and group
    chmod -R og-w "${BUILDROOT}/electron-v${ELECTRON_VERSION}-linux-${ELECTRON_ARCH}"/*

    BUNDLEDIR="${DESKTOPROOT}/usr/${APP_NAME}/bin"

    # WGET:
    cp -r "${BUILDROOT}/electron-v${ELECTRON_VERSION}-linux-${ELECTRON_ARCH}"/* "${BUNDLEDIR}"
    # WGET END

    mv "${BUNDLEDIR}/electron" "${BUNDLEDIR}/${APP_NAME}"

    mkdir -p "${BUNDLEDIR}/resources/app"
    cp -r "${SOURCEDIR}/runtime/assets" "${BUNDLEDIR}/resources/app/assets"
    cp -r "${SOURCEDIR}/runtime/src" "${BUNDLEDIR}/resources/app/src"

    cp "${SOURCEDIR}/runtime/package.json" "${BUNDLEDIR}/resources/app"
    cp "${SOURCEDIR}/runtime/.yarnrc.yml" "${BUNDLEDIR}/resources/app"

    # Install the runtime node_modules
    pushd "${BUNDLEDIR}/resources/app" > /dev/null || exit
        yarn set version berry
        yarn set version 3
        yarn plugin import workspace-tools
        yarn workspaces focus --production

        # remove the yarn cache
        rm -rf .yarn .yarn*
    popd > /dev/null || exit

    # Create the icon
    mkdir -p "${DESKTOPROOT}/usr/share/icons/hicolor/128x128/apps/"
    cp "${SOURCEDIR}/pkg/linux/pgadmin4-128x128.png" "${DESKTOPROOT}/usr/share/icons/hicolor/128x128/apps/${APP_NAME}.png"
    mkdir -p "${DESKTOPROOT}/usr/share/icons/hicolor/64x64/apps/"
    cp "${SOURCEDIR}/pkg/linux/pgadmin4-64x64.png" "${DESKTOPROOT}/usr/share/icons/hicolor/64x64/apps/${APP_NAME}.png"
    mkdir -p "${DESKTOPROOT}/usr/share/icons/hicolor/48x48/apps/"
    cp "${SOURCEDIR}/pkg/linux/pgadmin4-48x48.png" "${DESKTOPROOT}/usr/share/icons/hicolor/48x48/apps/${APP_NAME}.png"
    mkdir -p "${DESKTOPROOT}/usr/share/icons/hicolor/32x32/apps/"
    cp "${SOURCEDIR}/pkg/linux/pgadmin4-32x32.png" "${DESKTOPROOT}/usr/share/icons/hicolor/32x32/apps/${APP_NAME}.png"
    mkdir -p "${DESKTOPROOT}/usr/share/icons/hicolor/16x16/apps/"
    cp "${SOURCEDIR}/pkg/linux/pgadmin4-16x16.png" "${DESKTOPROOT}/usr/share/icons/hicolor/16x16/apps/${APP_NAME}.png"

    mkdir -p "${DESKTOPROOT}/usr/share/applications"
    cp "${SOURCEDIR}/pkg/linux/pgadmin4.desktop" "${DESKTOPROOT}/usr/share/applications"
}

_build_docs() {
    echo "Building the documentation..."
    cd "${SERVERROOT}" && mkdir -p "usr/${APP_NAME}/share/docs/en_US/html"
    cd "${SOURCEDIR}/docs/en_US" || exit
    python3 build_code_snippet.py
    SYS_PYTHONPATH=$("${SYSTEM_PYTHON_PATH}" -c "import sys; print(':'.join([p for p in sys.path if p]))")
    # shellcheck disable=SC2153
    PYTHONPATH=$PYTHONPATH:${SYS_PYTHONPATH} python3 -msphinx . "${SERVERROOT}/usr/${APP_NAME}/share/docs/en_US/html"
}

_copy_code() {
    echo "Copying the server code..."

    OS_VERSION=$(grep "^VERSION_ID=" /etc/os-release | awk -F "=" '{ print $2 }' | sed 's/"//g' | awk -F "." '{ print $1 }')
    if [ "$1" == 'redhat' ] && [ "${OS_VERSION}" == "8" ]; then
      echo "Setting file permission through umask..."
      umask u+rwx,go+rx,go-w
    fi

    # Remove any TCL-related files that may cause us problems
    find "${SERVERROOT}/usr/${APP_NAME}/venv/" -name "_tkinter*" -print0 | xargs -0 rm -rf

    pushd "${SOURCEDIR}/web" > /dev/null || exit
        yarn set version berry
        yarn set version 3
        yarn install
        yarn run bundle
    popd > /dev/null || exit

    # copy the web directory to the bundle as it is required by runtime
    cp -r "${SOURCEDIR}/web" "${SERVERROOT}/usr/${APP_NAME}/web/"
    cp "${SOURCEDIR}/pkg/linux/config_distro.py" "${SERVERROOT}/usr/${APP_NAME}/web/"
    cd "${SERVERROOT}/usr/${APP_NAME}/web/" || exit
    rm -f pgadmin4.db config_local.*
    rm -rf jest.config.js babel.* package.json .yarn* yarn* .editorconfig .eslint* node_modules/ regression/ tools/ pgadmin/static/js/generated/.cache
    find . -name "tests" -type d -print0 | xargs -0 rm -rf
    find . -name "feature_tests" -type d -print0 | xargs -0 rm -rf
    find . -name "__pycache__" -type d -print0 | xargs -0 rm -rf

    # License files
    cp "${SOURCEDIR}/LICENSE" "${SERVERROOT}/usr/${APP_NAME}/"
    cp "${SOURCEDIR}/DEPENDENCIES" "${SERVERROOT}/usr/${APP_NAME}/"

    # Web setup script
    mkdir -p "${WEBROOT}/usr/${APP_NAME}/bin/"
    cp "${SOURCEDIR}/pkg/linux/setup-web.sh" "${WEBROOT}/usr/${APP_NAME}/bin/"

    # Ensure our venv will use the correct Python interpreter, even if the
    # user has configured an alternative default.
    # DO THIS LAST!
    cd "${SERVERROOT}/usr/${APP_NAME}/venv/bin" || exit
    PYTHON_INTERPRETER=$("${SYSTEM_PYTHON_PATH}" -c "import os, sys; print(os.path.realpath(sys.executable))")
    PYTHON_VERSION=$("${SYSTEM_PYTHON_PATH}" -c "import sys; print('%d.%d' % (sys.version_info.major, sys.version_info.minor))")
    rm python && ln -s python3 python
    rm "python${PYTHON_VERSION}" && ln -s python3 "python${PYTHON_VERSION}"
    rm python3 && ln -s "${PYTHON_INTERPRETER}" python3
}


_generate_sbom() {
   echo "Generating SBOMs..."
   # Note that we don't generate an SBOM for the Meta package as it doesn't contain any files.
   syft "${SERVERROOT}/" -o cyclonedx-json > "${SERVERROOT}/usr/${APP_NAME}/sbom-server.json"
   syft "${DESKTOPROOT}/" -o cyclonedx-json > "${DESKTOPROOT}/usr/${APP_NAME}/sbom-desktop.json"
   syft "${WEBROOT}/" -o cyclonedx-json > "${WEBROOT}/usr/${APP_NAME}/sbom-web.json"
}
