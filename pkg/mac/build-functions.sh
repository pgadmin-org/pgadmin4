# shellcheck shell=bash

_setup_env() {
    FUNCS_DIR=$(cd "$(dirname "$0")" && pwd)/../..
    APP_RELEASE=$(grep "^APP_RELEASE" "${FUNCS_DIR}/web/version.py" | cut -d"=" -f2 | sed 's/ //g')
    APP_REVISION=$(grep "^APP_REVISION" "${FUNCS_DIR}/web/version.py" | cut -d"=" -f2 | sed 's/ //g')
    APP_NAME=$(grep "^APP_NAME" "${FUNCS_DIR}/web/branding.py" | cut -d"=" -f2 | sed "s/'//g" | sed 's/^ //')
    APP_LONG_VERSION=${APP_RELEASE}.${APP_REVISION}
    APP_SUFFIX=$(grep "^APP_SUFFIX" "${FUNCS_DIR}/web/version.py" | cut -d"=" -f2 | sed 's/ //g' | sed "s/'//g")
    if [ -n "${APP_SUFFIX}" ]; then
        APP_LONG_VERSION=${APP_LONG_VERSION}-${APP_SUFFIX}
    fi
    BUNDLE_DIR="${BUILD_ROOT}/${APP_NAME}.app"
    DMG_NAME="${DIST_ROOT}"/$(echo "${APP_NAME}" | sed 's/ //g' | awk '{print tolower($0)}')-"${APP_LONG_VERSION}-$(uname -m).dmg"
    PYTHON_OS_VERSION="11"
}

_cleanup() {
    echo Cleaning up the old environment and app bundle...
    rm -rf "${BUILD_ROOT}"
    rm -rf "${TEMP_DIR}"
    rm -f "${DIST_ROOT}"/*.dmg
}

_build_runtime() {
    echo "Assembling the runtime environment..."

    test -d "${BUILD_ROOT}" || mkdir "${BUILD_ROOT}"
    # Get a fresh copy of electron
    # uname -m returns "x86_64" on Intel, but we need "x64"
    ELECTRON_ARCH="x64"
    if [ "$(uname -m)" == "arm64" ]; then
      ELECTRON_ARCH="arm64"
    fi

    ELECTRON_VERSION="$(npm info electron version)"

    pushd "${BUILD_ROOT}" > /dev/null || exit
        while true;do
            wget "https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/electron-v${ELECTRON_VERSION}-darwin-${ELECTRON_ARCH}.zip" && break
            rm "electron-v${ELECTRON_VERSION}-darwin-${ELECTRON_ARCH}.zip"
        done
        unzip "electron-v${ELECTRON_VERSION}-darwin-${ELECTRON_ARCH}.zip"
    popd > /dev/null || exit
    # WGET END


    mv "${BUILD_ROOT}/Electron.app" "${BUNDLE_DIR}"
    find "${BUNDLE_DIR}" -exec touch {} \;

    # Copy in the runtime code
    mkdir "${BUNDLE_DIR}/Contents/Resources/app/"
    cp -R "${SOURCE_DIR}/runtime/assets" "${BUNDLE_DIR}/Contents/Resources/app/"
    cp -R "${SOURCE_DIR}/runtime/src" "${BUNDLE_DIR}/Contents/Resources/app/"
    cp "${SOURCE_DIR}/runtime/package.json" "${BUNDLE_DIR}/Contents/Resources/app/"
    cp "${SOURCE_DIR}/runtime/.yarnrc.yml" "${BUNDLE_DIR}/Contents/Resources/app/"

    # Install the runtime node_modules, then replace the package.json
    pushd "${BUNDLE_DIR}/Contents/Resources/app/" > /dev/null || exit
        yarn set version berry
        yarn set version 3
        yarn plugin import workspace-tools
        yarn workspaces focus --production

        # remove the yarn cache
        rm -rf .yarn .yarn*
    popd > /dev/null || exit
}

_create_python_env() {
    echo "Creating the Python environment..."
    PATH=${PGADMIN_POSTGRES_DIR}/bin:${PATH}
    LD_LIBRARY_PATH=${PGADMIN_POSTGRES_DIR}/lib:${LD_LIBRARY_PATH}

    # Figure out what python to use
    if which python3 > /dev/null 2>&1
    then
        SYSTEM_PYTHON_EXE="python3"
    else
        SYSTEM_PYTHON_EXE="python"
    fi

    git clone https://github.com/gregneagle/relocatable-python.git "${BUILD_ROOT}/relocatable_python"
    "${SYSTEM_PYTHON_EXE}" \
        "${BUILD_ROOT}/relocatable_python/make_relocatable_python_framework.py" \
        --python-version "${PGADMIN_PYTHON_VERSION}" \
        --os-version "${PYTHON_OS_VERSION}" \
        --destination "${BUNDLE_DIR}/Contents/Frameworks/"

    "${BUNDLE_DIR}/Contents/Frameworks/Python.framework/Versions/Current/bin/python3" -m ensurepip --upgrade || exit 1
    "${BUNDLE_DIR}/Contents/Frameworks/Python.framework/Versions/Current/bin/pip3" install -r "${SOURCE_DIR}/requirements.txt" || exit 1

    # Make sure all the .so's in the Python env have the executable bit set
    # so they get properly signed later
    OLD_IFS=${IFS}
    IFS=$'\n'
    for i in $(find . -type f -name '*.so' -exec file "{}" \; | grep -v "(for architecture" | grep -E "Mach-O executable|Mach-O 64-bit executable|Mach-O 64-bit bundle|Mach-O 64-bit dynamically linked shared library" | awk -F":" '{print $1}' | uniq)
    do
        chmod +x "${i}"
    done
    IFS=${OLD_IFS}

    # Fixup shebangs
    cd "${BUNDLE_DIR}/Contents/Frameworks/Python.framework/Versions/Current/bin" || exit
    # shellcheck disable=SC2016
    grep -RiIl 'mac-build' ./* | xargs sed -i '' 's/\/.*\/python3\./\$(dirname \"$0\")\/python3./g'

    # Remove some things we don't need
    cd "${BUNDLE_DIR}/Contents/Frameworks/Python.framework" || exit
    find . -name test -type d -print0 | xargs -0 rm -rf
    find . -name tkinter -type d -print0 | xargs -0 rm -rf
    find . -name turtle.py -type f -print0 | xargs -0 rm -rf
    find . -name turtledemo -type d -print0 | xargs -0 rm -rf
    find . -name "tcl*" -type d -print0 | xargs -0 rm -rf
    find . -name "tk*" -type d -print0 | xargs -0 rm -rf
    find . -name "tdbc*" -type d -print0 | xargs -0 rm -rf
    find . -name "itcl*" -type d -print0 | xargs -0 rm -rf
    rm -f Versions/Current/lib/Tk.*
    rm -f Versions/Current/lib/libtcl*.dylib
    rm -f Versions/Current/lib/libtk*.dylib
    rm -f Versions/Current/lib/libtcl*.a
    rm -f Versions/Current/lib/libtk*.a
    rm -f Versions/Current/lib/tcl*.sh
    rm -f Versions/Current/lib/tk*.sh
    rm -rf Versions/Current/lib/pkgconfig*
    rm -rf Versions/Current/lib/sqlite*
    rm -rf Versions/Current/lib/thread*
    rm -rf Versions/Current/share
}

_build_docs() {
    echo "Building the docs..."
    # Create a temporary venv for the doc build, so we don't contaminate the one
    # that we're going to ship.
    "${BUNDLE_DIR}/Contents/Frameworks/Python.framework/Versions/Current/bin/python3" -m venv "${BUILD_ROOT}/venv"
    # shellcheck disable=SC1091
    source "${BUILD_ROOT}/venv/bin/activate"
    pip3 install --upgrade pip
    pip3 install -r "${SOURCE_DIR}/requirements.txt"
    pip3 install sphinx==7.4.7
    pip3 install sphinxcontrib-youtube

    cd "${SOURCE_DIR}" || exit
    make docs

    cd "${SOURCE_DIR}/docs/en_US" || exit
    test -d "${BUNDLE_DIR}/Contents/Resources/docs/en_US" || mkdir -p "${BUNDLE_DIR}/Contents/Resources/docs/en_US"
    cp -r _build/html "${BUNDLE_DIR}/Contents/Resources/docs/en_US/"

    # Remove some things we don't need
    rm -rf "${BUNDLE_DIR}/Contents/Resources/docs/en_US/html/_sources"
    rm -f "${BUNDLE_DIR}/Contents/Resources/docs/en_US/html/_static"/*.png
}

_fixup_imports() {
    local TODO TODO_OLD FW_RELPATH LIB LIB_BN

    echo "Fixing imports on the core appbundle..."
    pushd "$1" > /dev/null || exit

    # Find all the files that may need tweaks
    TODO=$(find . -perm +0111 -type f -exec file "{}" \; | \
        grep -v "Frameworks/Python.framework" | \
        grep -E "Mach-O 64-bit" | \
        awk -F ':| ' '{ORS=" "; print $1}' | \
        uniq)

    # Add anything in the site-packages Python directory
    TODO+=$(find ./Contents/Frameworks/Python.framework/Versions/Current/lib/python*/site-packages -perm +0111 -type f -exec file "{}" \; | \
        grep -E "Mach-O 64-bit" | \
        awk -F ':| ' '{ORS=" "; print $1}' | \
        uniq)

    echo "Found executables: ${TODO}"
    while test "${TODO}" != ""; do
        TODO_OLD=${TODO} ;
        TODO="" ;
        for TODO_OBJ in ${TODO_OLD}; do
            echo "Post-processing: ${TODO_OBJ}"

            # The Rust interface in the Python Cryptography module contains
            # a reference to a .so that won't exist. See:
            # https://github.com/PyO3/setuptools-rust/issues/106
            if [[ "${TODO_OBJ}" =~ cryptography/hazmat/bindings/\_rust\.abi3\.so$ ]]; then
                echo "Skipping because of https://github.com/PyO3/setuptools-rust/issues/106."
                continue
            fi

            # Figure out the relative path from ${TODO_OBJ} to Contents/Frameworks
            FW_RELPATH=$(echo "${TODO_OBJ}" | \
                sed -n 's|^\(\.//*\)\(\([^/][^/]*/\)*\)[^/][^/]*$|\2|gp' | \
                sed -n 's|[^/][^/]*/|../|gp' \
                )"Contents/Frameworks"

            # Find all libraries ${TODO_OBJ} depends on, but skip system libraries
            for LIB in $(
                otool -L "${TODO_OBJ}" | \
                sed -n 's|^.*[[:space:]]\([^[:space:]]*\.dylib\).*$|\1|p' | \
                grep -E -v '^(/usr/lib)|(/System)|@executable_path|@loader_path|/DLC/PIL/' \
            ); do
                # Copy in any required dependencies
                LIB_BN="$(basename "${LIB}")" ;
                if ! test -f "Contents/Frameworks/${LIB_BN}"; then
                    TARGET_FILE=""
                    TARGET_PATH=""
                    echo "Adding symlink: ${LIB_BN} (because of: ${TODO_OBJ})"
                    cp -R "${LIB}" "Contents/Frameworks/${LIB_BN}"
                    if ! test -L "Contents/Frameworks/${LIB_BN}"; then
                        chmod 755 "Contents/Frameworks/${LIB_BN}"
                    else
                        TARGET_FILE=$(readlink "${LIB}")
                        TARGET_PATH=$(dirname "${LIB}")/${TARGET_FILE}
                        echo "Adding symlink target: ${TARGET_PATH}"
                        cp "${TARGET_PATH}" "Contents/Frameworks/${TARGET_FILE}"
                        chmod 755 "Contents/Frameworks/${TARGET_FILE}"
                    fi
                    echo "Rewriting ID in Contents/Frameworks/${LIB_BN} to ${LIB_BN}"
                    install_name_tool \
                        -id "${LIB_BN}" \
                        "Contents/Frameworks/${LIB_BN}" || exit 1
                    TODO="${TODO} ./Contents/Frameworks/${LIB_BN}"
                fi

                # Rewrite the dependency paths
                echo "Rewriting library ${LIB} to @loader_path/${FW_RELPATH}/${LIB_BN} in ${TODO_OBJ}"
                install_name_tool -change \
                    "${LIB}" \
                    "@loader_path/${FW_RELPATH}/${LIB_BN}" \
                    "${TODO_OBJ}" || exit 1
                install_name_tool -change \
                    "${TARGET_PATH}" \
                    "@loader_path/${FW_RELPATH}/${TARGET_FILE}" \
                    "${TODO_OBJ}" || exit 1
            done
        done
    done

    echo "Imports updated on the core appbundle."
    popd > /dev/null || exit
}

_complete_bundle() {
    echo "Completing the appbundle..."
    cd "${SCRIPT_DIR}" || exit

    # Copy the binary utilities into place
    mkdir -p "${BUNDLE_DIR}/Contents/SharedSupport/"
    cp "${PGADMIN_POSTGRES_DIR}/bin/pg_dump" "${BUNDLE_DIR}/Contents/SharedSupport/"
    cp "${PGADMIN_POSTGRES_DIR}/bin/pg_dumpall" "${BUNDLE_DIR}/Contents/SharedSupport/"
    cp "${PGADMIN_POSTGRES_DIR}/bin/pg_restore" "${BUNDLE_DIR}/Contents/SharedSupport/"
    cp "${PGADMIN_POSTGRES_DIR}/bin/psql" "${BUNDLE_DIR}/Contents/SharedSupport/"

    # Update the plist
    cp Info.plist.in "${BUNDLE_DIR}/Contents/Info.plist"
    sed -i '' "s/%APPNAME%/${APP_NAME}/g" "${BUNDLE_DIR}/Contents/Info.plist"
    sed -i '' "s/%APPVER%/${APP_LONG_VERSION}/g" "${BUNDLE_DIR}/Contents/Info.plist"
    sed -i '' "s/%APPID%/org.pgadmin.pgadmin4/g" "${BUNDLE_DIR}/Contents/Info.plist"

    # Rename helper execs and Update the plist
    for helper_exec in "Electron Helper" "Electron Helper (Renderer)" "Electron Helper (Plugin)" "Electron Helper (GPU)"
    do
        pgadmin_exec=${helper_exec//Electron/pgAdmin 4}
        mv "${BUNDLE_DIR}/Contents/Frameworks/${helper_exec}.app/Contents/MacOS/${helper_exec}" "${BUNDLE_DIR}/Contents/Frameworks/${helper_exec}.app/Contents/MacOS/${pgadmin_exec}"
        mv "${BUNDLE_DIR}/Contents/Frameworks/${helper_exec}.app" "${BUNDLE_DIR}/Contents/Frameworks/${pgadmin_exec}.app"

        info_plist="${BUNDLE_DIR}/Contents/Frameworks/${pgadmin_exec}.app/Contents/Info.plist"
        cp Info.plist-helper.in "${info_plist}"
        sed -i '' "s/%APPNAME%/${pgadmin_exec}/g" "${info_plist}"
        sed -i '' "s/%APPVER%/${APP_LONG_VERSION}/g" "${info_plist}"
        sed -i '' "s/%APPID%/org.pgadmin.pgadmin4.helper/g" "${info_plist}"
    done

    # PkgInfo
    echo APPLPGA4 > "${BUNDLE_DIR}/Contents/PkgInfo"

    # Icon
    cp pgAdmin4.icns "${BUNDLE_DIR}/Contents/Resources/app.icns"

    # Rename the executable
    mv "${BUNDLE_DIR}/Contents/MacOS/Electron" "${BUNDLE_DIR}/Contents/MacOS/${APP_NAME}"

    # Rename the app in package.json so the menu looks as it should
    sed -i '' "s/\"name\": \"pgadmin4\"/\"name\": \"${APP_NAME}\"/g" "${BUNDLE_DIR}/Contents/Resources/app/package.json"

    # Import the dependencies, and rewrite any library references
        _fixup_imports "${BUNDLE_DIR}"

    # Build node modules
    pushd "${SOURCE_DIR}/web" > /dev/null || exit
        yarn set version berry
        yarn set version 3
        yarn install
        yarn run bundle

        curl https://curl.se/ca/cacert.pem -o cacert.pem -s
    popd > /dev/null || exit

    # copy the web directory to the bundle as it is required by runtime
    cp -r "${SOURCE_DIR}/web" "${BUNDLE_DIR}/Contents/Resources/"
    cd "${BUNDLE_DIR}/Contents/Resources/web" || exit
    rm -f pgadmin4.db config_local.*
    rm -rf jest.config.js babel.* package.json .yarn* yarn* .editorconfig .eslint* node_modules/ regression/ tools/ pgadmin/static/js/generated/.cache
    find . -name "tests" -type d -print0 | xargs -0 rm -rf
    find . -name "feature_tests" -type d -print0 | xargs -0 rm -rf
    find . -name "__pycache__" -type d -print0 | xargs -0 rm -rf
    find . -name ".DS_Store" -print0 | xargs -0 rm -f

    {
        echo "SERVER_MODE = False"
        echo "HELP_PATH = '../../../docs/en_US/html/'"
        echo "DEFAULT_BINARY_PATHS = {"
        echo "    'pg':   '\$DIR/../../SharedSupport',"
        echo "    'ppas': ''"
        echo "}"
    } > config_distro.py

    # License files
    cp -r "${SOURCE_DIR}/LICENSE" "${BUNDLE_DIR}/Contents/"
    cp -r "${SOURCE_DIR}/DEPENDENCIES" "${BUNDLE_DIR}/Contents/"

    # Remove the .pyc files if any
    find "${BUNDLE_DIR}" -name "*.pyc" -print0 | xargs -0 rm -f

    # Update permissions to make sure all users can access installed pgadmin.
    chmod -R og=u "${BUNDLE_DIR}"
    chmod -R og-w "${BUNDLE_DIR}"
}

_generate_sbom() {
   echo "Generating SBOM..."
   syft "${BUNDLE_DIR}/Contents/" -o cyclonedx-json > "${BUNDLE_DIR}/Contents/sbom.json"
}

_codesign_binaries() {
    if [ "${CODESIGN}" -eq 0 ]; then
        return
    fi

    if [ -z "${DEVELOPER_ID}" ] ; then
        echo "Developer ID Application not found in codesign.conf" >&2
        exit 1
    fi

    # Create the entitlements file
    cp "${SCRIPT_DIR}/entitlements.plist.in" "${BUILD_ROOT}/entitlements.plist"
    TEAM_ID=$(echo "${DEVELOPER_ID}" | awk -F"[()]" '{print $2}')
    sed -i '' "s/%TEAMID%/${TEAM_ID}/g" "${BUILD_ROOT}/entitlements.plist"

    echo Signing "${BUNDLE_DIR}" binaries...
    IFS=$'\n'
    for i in $(find "${BUNDLE_DIR}" -type f -perm +111 -exec file "{}" \; | \
               grep -v "(for architecture" | \
               grep -v -E "^- Mach-O" | \
               grep -E "Mach-O executable|Mach-O 64-bit executable|Mach-O 64-bit bundle|Mach-O 64-bit dynamically linked shared library" | \
               awk -F":" '{print $1}' | \
               uniq)
    do
        codesign --deep --force --verify --verbose --timestamp \
                 --options runtime \
                 --entitlements "${BUILD_ROOT}/entitlements.plist" \
                 -i org.pgadmin.pgadmin4 \
                 --sign "${DEVELOPER_ID}" \
                 "$i"
    done

    echo Signing "${BUNDLE_DIR}" libraries...
    find "${BUNDLE_DIR}" -type f -name "*.dylib*" -exec \
        codesign --deep --force --verify --verbose --timestamp \
                 --options runtime \
                 --entitlements "${BUILD_ROOT}/entitlements.plist" \
                 -i org.pgadmin.pgadmin4 \
                 --sign "${DEVELOPER_ID}" \
                 {} \;
}

_codesign_bundle() {
    if [ "${CODESIGN}" -eq 0 ]; then
        return
    fi

    # Sign the .app
    echo Signing "${BUNDLE_DIR}"...
    codesign --deep --force --verify --verbose --timestamp \
             --options runtime \
             --entitlements "${BUILD_ROOT}/entitlements.plist" \
             -i org.pgadmin.pgadmin4 \
             --sign "${DEVELOPER_ID}" \
             "${BUNDLE_DIR}"
}

_create_dmg() {
    # move to the directory where we want to create the DMG
    test -d "${DIST_ROOT}" || mkdir "${DIST_ROOT}"

    echo "Checking out create-dmg..."
    git clone https://github.com/create-dmg/create-dmg.git "${BUILD_ROOT}/create-dmg"

    "${BUILD_ROOT}/create-dmg/create-dmg" \
        --volname "${APP_NAME}" \
        --volicon "${SCRIPT_DIR}/dmg-icon.icns" \
        --eula "${SCRIPT_DIR}/licence.rtf" \
        --background "${SCRIPT_DIR}/dmg-background.png" \
        --app-drop-link 600 220 \
        --icon "${APP_NAME}.app" 200 220 \
        --window-pos 200 120 \
        --window-size 800 400 \
        --hide-extension "${APP_NAME}.app" \
        --add-file .DS_Store "${SCRIPT_DIR}/dmg.DS_Store" 5 5 \
        --format UDBZ \
        --skip-jenkins \
        --no-internet-enable \
        "${DMG_NAME}" \
        "${BUNDLE_DIR}"
}

_codesign_dmg() {
    if [ "${CODESIGN}" -eq 0 ]; then
        return
    fi

    # Sign the .app
    echo Signing disk image...
    codesign --force --verify --verbose --timestamp \
             --options runtime \
             -i org.pgadmin.pgadmin4 \
             --sign "${DEVELOPER_ID}" \
             "${DMG_NAME}"
}


_notarize_pkg() {
    if [ "${CODESIGN}" -eq 0 ]; then
        return
    fi

    echo "Uploading DMG for Notarization ..."
    STATUS=$(xcrun notarytool submit "${DMG_NAME}" \
                              --team-id "${DEVELOPER_TEAM_ID}" \
                              --apple-id "${DEVELOPER_USER}" \
                              --password "${DEVELOPER_ASP}" 2>&1)

    # Get the submission ID
    SUBMISSION_ID=$(echo "${STATUS}" | awk -F ': ' '/id:/ { print $2; exit; }')
    echo "Notarization submission ID: ${SUBMISSION_ID}"

    echo "Waiting for Notarization to be completed ..."
    xcrun notarytool wait "${SUBMISSION_ID}" \
                 --team-id "${DEVELOPER_TEAM_ID}" \
                 --apple-id "${DEVELOPER_USER}" \
                 --password "${DEVELOPER_ASP}"

    # Print status information
    REQUEST_STATUS=$(xcrun notarytool info "${SUBMISSION_ID}" \
                 --team-id "${DEVELOPER_TEAM_ID}" \
                 --apple-id "${DEVELOPER_USER}" \
                 --password "${DEVELOPER_ASP}" 2>&1 | \
            awk -F ': ' '/status:/ { print $2; }')

    if [[ "${REQUEST_STATUS}" != "Accepted" ]]; then
        echo "Notarization failed."
        exit 1
    fi

    # Staple the notarization
    echo "Stapling the notarization to the pgAdmin DMG..."
    if ! xcrun stapler staple "${DMG_NAME}"; then
        echo "Stapling failed."
        exit 1
    fi

    echo "Notarization completed successfully."
}
