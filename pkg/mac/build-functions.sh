_setup_env() {
    APP_RELEASE=`grep "^APP_RELEASE" web/config.py | cut -d"=" -f2 | sed 's/ //g'`
    APP_REVISION=`grep "^APP_REVISION" web/config.py | cut -d"=" -f2 | sed 's/ //g'`
    APP_NAME=`grep "^APP_NAME" web/config.py | cut -d"=" -f2 | sed "s/'//g" | sed 's/^ //'`
    APP_LONG_VERSION=${APP_RELEASE}.${APP_REVISION}
    APP_SHORT_VERSION=`echo ${APP_LONG_VERSION} | cut -d . -f1,2`
    APP_SUFFIX=`grep "^APP_SUFFIX" web/config.py | cut -d"=" -f2 | sed 's/ //g' | sed "s/'//g"`
    if [ ! -z ${APP_SUFFIX} ]; then
        APP_LONG_VERSION=${APP_LONG_VERSION}-${APP_SUFFIX}
    fi
    BUNDLE_DIR="${BUILD_ROOT}/${APP_NAME}.app"
}

_cleanup() {
    echo Cleaning up the old environment and app bundle...
    rm -rf "${BUILD_ROOT}"
    rm -rf "${TEMP_DIR}"
    rm -f ${DIST_ROOT}/*.dmg
}

_build_runtime() {
    echo "Assembling the runtime environment..."
    test -d "${BUILD_ROOT}" || mkdir "${BUILD_ROOT}"

    # Copy in the template application
    cd "${BUILD_ROOT}"
    yarn --cwd "${BUILD_ROOT}" add nw
    cp -R "${BUILD_ROOT}/node_modules/nw/nwjs/nwjs.app" "${BUILD_ROOT}/"
    mv "${BUILD_ROOT}/nwjs.app" "${BUNDLE_DIR}"

    # Copy in the runtime code
    mkdir "${BUNDLE_DIR}/Contents/Resources/app.nw/"
    cp -R "${SOURCE_DIR}/runtime/assets" "${BUNDLE_DIR}/Contents/Resources/app.nw/"
    cp -R "${SOURCE_DIR}/runtime/src" "${BUNDLE_DIR}/Contents/Resources/app.nw/"
    cp "${SOURCE_DIR}/runtime/package.json" "${BUNDLE_DIR}/Contents/Resources/app.nw/"

    # Install the runtime node_modules, then replace the package.json
    yarn --cwd "${BUNDLE_DIR}/Contents/Resources/app.nw/" install --production=true
}

_create_python_env() {
    echo "Creating the Python environment..."
    PATH=${PGADMIN_POSTGRES_DIR}/bin:${PATH}
    LD_LIBRARY_PATH=${PGADMIN_POSTGRES_DIR}/lib:${LD_LIBRARY_PATH}

    git clone https://github.com/gregneagle/relocatable-python.git "${BUILD_ROOT}/relocatable_python"
    PATH=$PATH:/usr/local/pgsql/bin python3 "${BUILD_ROOT}/relocatable_python/make_relocatable_python_framework.py" --upgrade-pip --python-version ${PGADMIN_PYTHON_VERSION} --pip-requirements "${SOURCE_DIR}/requirements.txt" --destination "${BUNDLE_DIR}/Contents/Frameworks/"

    # Remove some things we don't need
    cd "${BUNDLE_DIR}/Contents/Frameworks/Python.framework"
    find . -name test -type d -print0 | xargs -0 rm -rf
    find . -name tkinter -type d -print0 | xargs -0 rm -rf
    find . -name turtle.py -type f -print0 | xargs -0 rm -rf
    find . -name turtledemo -type d -print0 | xargs -0 rm -rf
    find . -name tcl* -type d -print0 | xargs -0 rm -rf
    find . -name tk* -type d -print0 | xargs -0 rm -rf
    find . -name tdbc* -type d -print0 | xargs -0 rm -rf
    find . -name itcl* -type d -print0 | xargs -0 rm -rf
    rm -f Versions/Current/lib/Tk.*
    rm -f Versions/Current/lib/libtcl*.dylib
    rm -f Versions/Current/lib/libtk*.dylib
    rm -f Versions/Current/lib/tcl*.sh
    rm -f Versions/Current/lib/tk*.sh
    rm -rf Versions/Current/share
}

_build_docs() {
    echo "Building the docs..."
    # Create a temporary venv for the doc build, so we don't contaminate the one
    # that we're going to ship.
    "${BUNDLE_DIR}/Contents/Frameworks/Python.framework/Versions/Current/bin/python3" -m venv "${BUILD_ROOT}/venv"
    source "${BUILD_ROOT}/venv/bin/activate"
    pip3 install --upgrade pip
    pip3 install -r "${SOURCE_DIR}/requirements.txt"
    pip3 install sphinx

    cd "${SOURCE_DIR}"
    make docs

    cd "${SOURCE_DIR}/docs/en_US"
    test -d "${BUNDLE_DIR}/Contents/Resources/docs/en_US" || mkdir -p "${BUNDLE_DIR}/Contents/Resources/docs/en_US"
    cp -r _build/html "${BUNDLE_DIR}/Contents/Resources/docs/en_US/"

    # Remove some things we don't need
    rm -rf "${BUNDLE_DIR}/Contents/Resources/docs/en_US/html/_sources"
    rm -f "${BUNDLE_DIR}/Contents/Resources/docs/en_US/html/_static"/*.png
}

_fixup_imports() {
	  local TODO TODO_OLD FW_RELPATH LIB LIB_BN

	  echo "Fixing imports on the core appbundle..."
	  pushd "$1" > /dev/null

	  # Find all the files that may need tweaks
	  TODO=$(file `find . -perm +0111 -type f` | \
	      grep -v "Frameworks/Python.framework" | \
	      grep -v "Frameworks/nwjs" | \
	      grep -E "Mach-O 64-bit" | \
	      awk -F ':| ' '{ORS=" "; print $1}' | \
	      uniq)

    # Add anything in the site-packages Python directory
    TODO+=$(file `find ./Contents/Frameworks/Python.framework/Versions/Current/lib/python*/site-packages -perm +0111 -type f` | \
        grep -E "Mach-O 64-bit" | \
        awk -F ':| ' '{ORS=" "; print $1}' | \
        uniq)

	  echo "Found executables: ${TODO}"
	  while test "${TODO}" != ""; do
		    TODO_OLD=${TODO} ;
		    TODO="" ;
		    for TODO_OBJ in ${TODO_OLD}; do
			      echo "Post-processing: ${TODO_OBJ}"

			      # Figure out the relative path from ${TODO_OBJ} to Contents/Frameworks
			      FW_RELPATH=$(echo "${TODO_OBJ}" | \
				        sed -n 's|^\(\.//*\)\(\([^/][^/]*/\)*\)[^/][^/]*$|\2|gp' | \
				        sed -n 's|[^/][^/]*/|../|gp' \
			          )"Contents/Frameworks"

			      # Find all libraries ${TODO_OBJ} depends on, but skip system libraries
			      for LIB in $(
				        otool -L ${TODO_OBJ} | \
				        sed -n 's|^.*[[:space:]]\([^[:space:]]*\.dylib\).*$|\1|p' | \
				        egrep -v '^(/usr/lib)|(/System)|@executable_path' \
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
	  popd > /dev/null
}

_complete_bundle() {
    echo "Completing the appbundle..."
    cd ${SCRIPT_DIR}

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
    for FILE in "${BUNDLE_DIR}"/Contents/Resources/*.lproj/InfoPlist.strings; do
        sed -i '' 's/CFBundleGetInfoString =.*/CFBundleGetInfoString = "Copyright (C) 2013 - 2021, The pgAdmin Development Team";/g' "${FILE}"
        sed -i '' 's/NSHumanReadableCopyright =.*/NSHumanReadableCopyright = "Copyright (C) 2013 - 2021, The pgAdmin Development Team";/g' "${FILE}"
        echo CFBundleDisplayName = \"${APP_NAME}\"\; >> "${FILE}"
    done

    # PkgInfo
    echo APPLPGA4 > "${BUNDLE_DIR}/Contents/PkgInfo"

    # Icon
    cp pgAdmin4.icns "${BUNDLE_DIR}/Contents/Resources/app.icns"

    # Rename the executable
    mv "${BUNDLE_DIR}/Contents/MacOS/nwjs" "${BUNDLE_DIR}/Contents/MacOS/${APP_NAME}"

    # Rename the app in package.json so the menu looks as it should
    sed -i '' "s/\"name\": \"pgadmin4\"/\"name\": \"${APP_NAME}\"/g" "${BUNDLE_DIR}/Contents/Resources/app.nw/package.json"

    # Import the dependencies, and rewrite any library references
		_fixup_imports "${BUNDLE_DIR}"

    # Build node modules
    pushd "${SOURCE_DIR}/web" > /dev/null
        yarn install
        yarn run bundle

        curl https://curl.haxx.se/ca/cacert.pem -o cacert.pem -s
    popd > /dev/null

    # copy the web directory to the bundle as it is required by runtime
    cp -r "${SOURCE_DIR}/web" "${BUNDLE_DIR}/Contents/Resources/"
    cd "${BUNDLE_DIR}/Contents/Resources/web"
    rm -f pgadmin4.db config_local.*
    rm -rf karma.conf.js package.json node_modules/ regression/ tools/ pgadmin/static/js/generated/.cache
    find . -name "tests" -type d -print0 | xargs -0 rm -rf
    find . -name "feature_tests" -type d -print0 | xargs -0 rm -rf
    find . -name ".DS_Store" -print0 | xargs -0 rm -f

    echo "SERVER_MODE = False" > config_distro.py
    echo "HELP_PATH = '../../../docs/en_US/html/'" >> config_distro.py
    echo "DEFAULT_BINARY_PATHS = {" >> config_distro.py
    echo "    'pg':   '\$DIR/../../SharedSupport'," >> config_distro.py
    echo "    'ppas': ''" >> config_distro.py
    echo "}" >> config_distro.py

    # License files
    cp -r ${SOURCE_DIR}/LICENSE "${BUNDLE_DIR}/Contents/"
    cp -r ${SOURCE_DIR}/DEPENDENCIES "${BUNDLE_DIR}/Contents/"

    # Remove the .pyc files if any
    find "${BUNDLE_DIR}" -name "*.pyc" -print0 | xargs -0 rm -f
}

_codesign_binaries() {
    if [ ${CODESIGN} -eq 0 ]; then
        return
    fi

    if [ -z "${DEVELOPER_ID}" ] ; then
        echo "Developer ID Application not found in codesign.conf" >&2
        exit 1
    fi

    if [ -z "${DEVELOPER_BUNDLE_ID}" ]; then
        echo "Developer Bundle Identifier not found in codesign.conf" >&2
    fi

    # Create the entitlements file
    cp "${SCRIPT_DIR}/entitlements.plist.in" "${BUILD_ROOT}/entitlements.plist"
    TEAM_ID=$(echo ${DEVELOPER_ID} | awk -F"[()]" '{print $2}')
    sed -i '' "s/%TEAMID%/${TEAM_ID}/g" "${BUILD_ROOT}/entitlements.plist"

    echo Signing ${BUNDLE_DIR} binaries...
    IFS=$'\n'
    for i in $(find "${BUNDLE_DIR}" -type f -perm +111 -exec file "{}" \; | grep -v "(for architecture" | grep -E "Mach-O executable|Mach-O 64-bit executable|Mach-O 64-bit bundle" | awk -F":" '{print $1}' | uniq)
    do
        codesign --deep --force --verify --verbose --timestamp --options runtime --entitlements "${BUILD_ROOT}/entitlements.plist" -i "${DEVELOPER_BUNDLE_ID}" --sign "${DEVELOPER_ID}" "$i"
    done

    echo Signing ${BUNDLE_DIR} libraries...
    for i in $(find "${BUNDLE_DIR}" -type f -name "*.dylib*")
    do
        codesign --deep --force --verify --verbose --timestamp --options runtime --entitlements "${BUILD_ROOT}/entitlements.plist" -i "${DEVELOPER_BUNDLE_ID}" --sign "${DEVELOPER_ID}" "$i"
    done
}

_codesign_bundle() {
    if [ ${CODESIGN} -eq 0 ]; then
        return
    fi

    # Sign the .app
    echo Signing ${BUNDLE_DIR}...
    codesign --deep --force --verify --verbose --timestamp --options runtime --entitlements "${BUILD_ROOT}/entitlements.plist" -i "${DEVELOPER_BUNDLE_ID}" --sign "${DEVELOPER_ID}" "${BUNDLE_DIR}"
}

_create_dmg() {
    # move to the directory where we want to create the DMG
    test -d ${DIST_ROOT} || mkdir ${DIST_ROOT}

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
        "${DIST_ROOT}/$(echo ${APP_NAME} | sed 's/ //g' | awk '{print tolower($0)}')-${APP_LONG_VERSION}.dmg" \
        "${BUNDLE_DIR}"
}

_codesign_dmg() {
    if [ ${CODESIGN} -eq 0 ]; then
        return
    fi

    # Sign the .app
    echo Signing disk image...
    codesign --force --verify --verbose --timestamp --options runtime -i "${DEVELOPER_BUNDLE_ID}" --sign "${DEVELOPER_ID}" "${DIST_ROOT}/$(echo ${APP_NAME} | sed 's/ //g' | awk '{print tolower($0)}')-${APP_LONG_VERSION}.dmg"
}
