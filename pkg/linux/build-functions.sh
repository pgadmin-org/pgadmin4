_setup_env() {
    echo "Setting up the environment..."
    WD=$(cd `dirname "$1"` && pwd)
    SOURCEDIR=$(realpath "${WD}/../..")
    BUILDROOT=$(realpath "${WD}/../../$2-build")
    DESKTOPROOT=${BUILDROOT}/desktop
    METAROOT=${BUILDROOT}/meta
    SERVERROOT=${BUILDROOT}/server
    WEBROOT=${BUILDROOT}/web
    DISTROOT=$(realpath "${WD}/../../dist")
    APP_RELEASE=`grep "^APP_RELEASE" web/config.py | cut -d"=" -f2 | sed 's/ //g'`
    APP_REVISION=`grep "^APP_REVISION" web/config.py | cut -d"=" -f2 | sed 's/ //g'`
    APP_NAME=`grep "^APP_NAME" web/config.py | cut -d"=" -f2 | sed "s/'//g" | sed 's/^ //' | sed 's/ //g' | tr '[:upper:]' '[:lower:]'`
    APP_LONG_VERSION=${APP_RELEASE}.${APP_REVISION}
    APP_SHORT_VERSION=`echo ${APP_LONG_VERSION} | cut -d . -f1,2`
    APP_SUFFIX=`grep "^APP_SUFFIX" web/config.py | cut -d"=" -f2 | sed 's/ //g' | sed "s/'//g"`
    if [ ! -z ${APP_SUFFIX} ]; then
        APP_LONG_VERSION=${APP_LONG_VERSION}-${APP_SUFFIX}
    fi
}

_cleanup() {
    echo "Cleaning up the old environment and app..."
    if test -f ${SOURCEDIR}/runtime/pgAdmin4; then
        rm -rf ${SOURCEDIR}/runtime/pgAdmin4
    fi
    if test -d ${BUILDROOT}; then
        rm -rf ${BUILDROOT}
    fi
    rm -f ${DISTROOT}/pgadmin4*.$1
}

_setup_dirs() {
    echo "Creating output directories..."
    test -d ${BUILDROOT} || mkdir ${BUILDROOT}
    test -d ${DESKTOPROOT} || mkdir ${DESKTOPROOT}
    test -d ${METAROOT} || mkdir ${METAROOT}
    test -d ${SERVERROOT} || mkdir ${SERVERROOT}
    test -d ${WEBROOT} || mkdir ${WEBROOT}
    test -d ${DISTROOT} || mkdir ${DISTROOT}
}

_create_python_virtualenv() {
    echo "Creating the virtual environment..."

    cd ${SERVERROOT}

    # Create the required directories
    mkdir -p "usr/${APP_NAME}"
    cd "usr/${APP_NAME}"

    # Create the blank venv
    python3 -m venv venv
    source venv/bin/activate

    pip3 install --no-cache-dir --no-binary psycopg2 -r ${SOURCEDIR}/requirements.txt

    # Figure out some paths for use when completing the venv
    # Use "python3" here as we want the venv path
    PYMODULES_PATH=$(python3 -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())")
    DIR_PYMODULES_PATH=`dirname ${PYMODULES_PATH}`
    
    # Use /usr/bin/python3 here as we want the system path
    if [ $1 == "debian" ]; then
        PYSYSLIB_PATH=$(/usr/bin/python3 -c "import sys; print('%s/lib/python%d.%.d' % (sys.prefix, sys.version_info.major, sys.version_info.minor))")
    else
        PYSYSLIB_PATH=$(/usr/bin/python3 -c "import sys; print('%s/lib64/python%d.%.d' % (sys.prefix, sys.version_info.major, sys.version_info.minor))")
    fi

    # Symlink in the rest of the Python libs. This is required because the runtime
    # will clear PYTHONHOME for safety, which has the side-effect of preventing
    # it from finding modules that are not explicitly included in the venv
    cd ${DIR_PYMODULES_PATH}

    # Files
    for FULLPATH in ${PYSYSLIB_PATH}/*.py; do
        FILE=${FULLPATH##*/}
        if [ ! -e ${FILE} ]; then
           ln -s ${FULLPATH} ${FILE}
        fi
    done

    # Paths
    for FULLPATH in ${PYSYSLIB_PATH}/*/; do
        FULLPATH=${FULLPATH%*/}
        FILE=${FULLPATH##*/}
        if [ ! -e ${FILE} ]; then
            ln -s ${FULLPATH} ${FILE}
        fi
    done

    # Remove tests
    cd site-packages
    find . -name "test" -type d -print0 | xargs -0 rm -rf
    find . -name "tests" -type d -print0 | xargs -0 rm -rf

    # Link the python<version> directory to python so that the private environment path is found by the application.
    if test -d ${DIR_PYMODULES_PATH}; then
        ln -s $(basename ${DIR_PYMODULES_PATH}) ${DIR_PYMODULES_PATH}/../python
    fi
}

_build_runtime() {
    echo "Building the desktop runtime..."
    cd ${SOURCEDIR}/runtime
    if [ -f Makefile ]; then
        make clean
    fi
    if hash qmake-qt5 2>/dev/null; then
        qmake-qt5
    else
        qmake
    fi
    make
    mkdir -p "${DESKTOPROOT}/usr/${APP_NAME}/bin"
    cp pgAdmin4 "${DESKTOPROOT}/usr/${APP_NAME}/bin/pgadmin4"
    mkdir -p "${DESKTOPROOT}/usr/${APP_NAME}/share"
    cp pgAdmin4.ico "${DESKTOPROOT}/usr/${APP_NAME}/share/pgadmin4.ico"
    mkdir -p "${DESKTOPROOT}/usr/share/applications"
    cp ../pkg/linux/pgadmin4.desktop "${DESKTOPROOT}/usr/share/applications"
}

_build_docs() {
    echo "Building the documentation..."
    cd "${SERVERROOT}" && mkdir -p "usr/${APP_NAME}/share/docs/en_US/html"
    cd "${SOURCEDIR}/docs/en_US"
    python3 build_code_snippet.py
    SYS_PYTHONPATH=$(/usr/bin/python3 -c "import sys; print(':'.join([p for p in sys.path if p]))")
    if [ $1 == "redhat" -a "${OS_VERSION}" == "7" ]; then
            PYTHONPATH=$PYTHONPATH:${SYS_PYTHONPATH} python3 /usr/local/bin/sphinx-build . "${SERVERROOT}/usr/${APP_NAME}/share/docs/en_US/html"
    else
        PYTHONPATH=$PYTHONPATH:${SYS_PYTHONPATH} python3 -msphinx . "${SERVERROOT}/usr/${APP_NAME}/share/docs/en_US/html"
    fi
}

_copy_code() {
    echo "Copying the server code..."

    # Remove any TCL-related files that may cause us problems
    find "${SERVERROOT}/usr/${APP_NAME}/venv/" -name "_tkinter*" -print0 | xargs -0 rm -rf

    pushd ${SOURCEDIR}/web
        yarn install
        yarn run bundle
    popd

    # copy the web directory to the bundle as it is required by runtime
    cp -r "${SOURCEDIR}/web" "${SERVERROOT}/usr/${APP_NAME}/web/"
    cp "${SOURCEDIR}/pkg/linux/config_distro.py" "${SERVERROOT}/usr/${APP_NAME}/web/"
    cd "${SERVERROOT}/usr/${APP_NAME}/web/"
    rm -f pgadmin4.db config_local.*
    rm -rf karma.conf.js package.json node_modules/ regression/ tools/ pgadmin/static/js/generated/.cache
    find . -name "tests" -type d -print0 | xargs -0 rm -rf
    find . -name "feature_tests" -type d -print0 | xargs -0 rm -rf
    find . -name "__pycache__" -type d -print0 | xargs -0 rm -rf

    # Web setup script
    mkdir -p "${WEBROOT}/usr/${APP_NAME}/bin/"
    cp "${SOURCEDIR}/pkg/linux/setup-web.sh" "${WEBROOT}/usr/${APP_NAME}/bin/"
}

