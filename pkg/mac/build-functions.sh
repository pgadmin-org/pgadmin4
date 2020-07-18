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
    rm -rf ${SOURCE_DIR}/runtime/*.app
    rm -rf ${BUILD_ROOT}
    rm -f ${DIST_ROOT}/*.dmg
}

_create_venv() {
    PATH=${PGADMIN_POSTGRES_DIR}/bin:${PATH}
    LD_LIBRARY_PATH=${PGADMIN_POSTGRES_DIR}/lib:${LD_LIBRARY_PATH}

    test -d ${BUILD_ROOT} || mkdir ${BUILD_ROOT}
    cd ${BUILD_ROOT}

    ${PYTHON_EXE} -m venv --copies venv

    source venv/bin/activate
    pip install --no-cache-dir --no-binary psycopg2 -r ${SOURCE_DIR}/requirements.txt

    # Figure the source path for use when completing the venv
    SOURCE_PYMODULES_PATH=$(dirname $("${PYTHON_EXE}" -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())"))

    # Figure the target path for use when completing the venv
    # Use "python" here as we want the venv path
    TARGET_PYMODULES_PATH=$(dirname $(python -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())"))

    # Copy in the additional system python modules
    cp -R ${SOURCE_PYMODULES_PATH}/* "${TARGET_PYMODULES_PATH}/"

    # Link the python<version> directory to python so that the private environment path is found by the application.
    ln -s "$(basename ${TARGET_PYMODULES_PATH})" "${TARGET_PYMODULES_PATH}/../python"

    # Remove tests
    find venv -name "test" -type d -print0 | xargs -0 rm -rf
    find venv -name "tests" -type d -print0 | xargs -0 rm -rf
}

_build_runtime() {
    cd ${SOURCE_DIR}/runtime
    if [ -f Makefile ]; then
      make clean
    fi
    ${QMAKE}
    make
    cp -r pgAdmin4.app "${BUNDLE_DIR}"
}

_build_docs() {
    cd ${SOURCE_DIR}/docs/en_US
    test -d "${BUNDLE_DIR}/Contents/Resources/docs/en_US" || mkdir -p "${BUNDLE_DIR}/Contents/Resources/docs/en_US"
    cp -r _build/html "${BUNDLE_DIR}/Contents/Resources/docs/en_US/"
}

_complete_bundle() {
    cd ${SCRIPT_DIR}

    # Copy the binary utilities into place
    mkdir -p "${BUNDLE_DIR}/Contents/SharedSupport/"
    cp "${PGADMIN_POSTGRES_DIR}/bin/pg_dump" "${BUNDLE_DIR}/Contents/SharedSupport/"
    cp "${PGADMIN_POSTGRES_DIR}/bin/pg_dumpall" "${BUNDLE_DIR}/Contents/SharedSupport/"
    cp "${PGADMIN_POSTGRES_DIR}/bin/pg_restore" "${BUNDLE_DIR}/Contents/SharedSupport/"
    cp "${PGADMIN_POSTGRES_DIR}/bin/psql" "${BUNDLE_DIR}/Contents/SharedSupport/"
    
    # Replace the place holders with the current version
    sed -e "s/PGADMIN_LONG_VERSION/${APP_LONG_VERSION}/g" -e "s/PGADMIN_SHORT_VERSION/${APP_SHORT_VERSION}/g" pgadmin.Info.plist.in > pgadmin.Info.plist

    # copy Python private environment to app bundle
    cp -PR ${BUILD_ROOT}/venv "${BUNDLE_DIR}/Contents/Resources/"

    # Remove any TCL-related files that may cause us problems
    find "${BUNDLE_DIR}/Contents/Resources/venv/" -name "_tkinter*" -print0 | xargs -0 rm -f

    test -d "${BUNDLE_DIR}/Contents/Resources" || mkdir -p "${BUNDLE_DIR}/Contents/Resources"
    # Create qt.conf so that app knows where the Plugins are present
    cat >> "${BUNDLE_DIR}/Contents/Resources/qt.conf" << EOF
[Paths]
Plugins = PlugIns
EOF

    test -d "${BUNDLE_DIR}/Contents/Frameworks" || mkdir -p "${BUNDLE_DIR}/Contents/Frameworks"
    test -d "${BUNDLE_DIR}/Contents/PlugIns/platforms" || mkdir -p "${BUNDLE_DIR}/Contents/PlugIns/platforms"
    test -d "${BUNDLE_DIR}/Contents/PlugIns/imageformats" || mkdir -p "${BUNDLE_DIR}/Contents/PlugIns/imageformats"
    cp -f ${PGADMIN_QT_DIR}/plugins/platforms/libqcocoa.dylib "${BUNDLE_DIR}/Contents/PlugIns/platforms"
    cp -f ${PGADMIN_QT_DIR}/plugins/imageformats/libqsvg.dylib "${BUNDLE_DIR}/Contents/PlugIns/imageformats"
    cp -f ${PGADMIN_POSTGRES_DIR}/lib/libpq.5.dylib "${BUNDLE_DIR}/Contents/Frameworks"

	local todo todo_old fw_relpath lib lib_bn

	pushd "${BUNDLE_DIR}" > /dev/null

	# We skip nested apps here - those are treated specially
	todo=$(file `find ./ -perm +0111 ! -type d ! -path "*.app/*" ! -name "*.app"` | grep -E "Mach-O 64-bit" | awk -F ':| ' '{ORS=" "; print $1}')

	echo "Found executables: ${todo}"
	while test "${todo}" != ""; do
		todo_old=${todo} ;
		todo="" ;
		for todo_obj in ${todo_old}; do
			echo "Post-processing: ${todo_obj}"

			# Figure out the relative path from todo_obj to Contents/Frameworks
			fw_relpath=$(echo "${todo_obj}" | sed -n 's|^\(\.//*\)\(\([^/][^/]*/\)*\)[^/][^/]*$|\2|gp' | sed -n 's|[^/][^/]*/|../|gp')"Contents/Frameworks"
			fw_relpath_old=${fw_relpath}

			# Find all libraries $todo_obj depends on, but skip system libraries
			for lib in $(otool -L ${todo_obj} | grep "Qt\|dylib\|Frameworks\|PlugIns" | grep -v ":" | sed 's/(.*//' | egrep -v '(/usr/lib)|(/System)|@executable_path@'); do
				if echo ${lib} | grep "PlugIns\|libqcocoa"  > /dev/null; then
					lib_loc="Contents/PlugIns/platforms"
				elif echo ${lib} | grep "PlugIns\|libqsvg"  > /dev/null; then
					lib_loc="Contents/PlugIns/imageformats"
				elif echo ${lib} | grep "Qt" > /dev/null; then
					qtfw_path="$(dirname ${lib} | sed 's|.*\(Qt.*framework\)|\1|')"
					lib_loc="Contents/Frameworks/${qtfw_path}"
					if [ "$(basename ${todo_obj})" = "${lib}" ]; then
						lib_loc="$(dirname ${todo_obj})"
						qtfw_path=$(echo ${lib_loc} | sed 's/Contents\/Frameworks\///')
					fi
				elif echo ${lib} | grep "Python" > /dev/null; then
					pyfw_path="$(dirname ${lib} | sed 's|.*\(Python.*framework\)|\1|')"
					lib_loc="Contents/Frameworks/${pyfw_path}"
					if [ "$(basename ${todo_obj})" = "${lib}" ]; then
						lib_loc="$(dirname ${todo_obj})"
						pyfw_path=$(echo ${lib_loc} | sed 's/Contents\/Frameworks\///')
					fi
				else
					lib_loc="Contents/Frameworks"
				fi
				lib_bn="$(basename "${lib}")" ;
				if ! test -f "${lib_loc}/${lib_bn}"; then
                    target_file=""
					target_path=""
					echo "Adding symlink: ${lib_bn} (because of: ${todo_obj})"

					# Copy the QT and Python framework
					if echo ${lib} | grep Qt > /dev/null ; then
						test -d ${lib_loc} || mkdir -p ${lib_loc}
						echo Copying -R ${PGADMIN_QT_DIR}/lib/${qtfw_path}/${lib_bn} to ${lib_loc}/
						cp ${PGADMIN_QT_DIR}/lib/${qtfw_path}/${lib_bn} ${lib_loc}/
					elif echo ${lib} | grep Python > /dev/null ; then
						test -d ${lib_loc} || mkdir -p ${lib_loc}
						cp -R "${lib}" "${lib_loc}/${lib_bn}"
					else
						cp -R "${lib}" "${lib_loc}/${lib_bn}"
					fi
					if ! test -L "${lib_loc}/${lib_bn}"; then
						chmod 755 "${lib_loc}/${lib_bn}"
					else
						target_file=$(readlink "${lib}")
						target_path=$(dirname "${lib}")/${target_file}

					    echo "Adding symlink target: ${target_path}"
						cp "${target_path}" "${lib_loc}/${target_file}"
						chmod 755 "${lib_loc}/${target_file}"
					fi
					echo "Rewriting ID in ${lib_loc}/${lib_bn} to ${lib_bn}"
                    install_name_tool -id "${lib_bn}" "${lib_loc}/${lib_bn}"

					todo="${todo} ./${lib_loc}/${lib_bn}"
				fi
				if echo ${lib} | grep Qt > /dev/null ; then
					fw_relpath="${fw_relpath}/${qtfw_path}"
				fi
				if echo ${lib} | grep Python > /dev/null ; then
					fw_relpath="${fw_relpath}/${pyfw_path}"
				fi
				chmod +w ${todo_obj}
				echo "Rewriting library ${lib} to @loader_path/${fw_relpath}/${lib_bn} in ${todo_obj}"

				install_name_tool -change "${lib}" "@loader_path/${fw_relpath}/${lib_bn}" "${todo_obj}"
                install_name_tool -change "${target_path}" "@loader_path/${fw_relpath}/${target_file}" "${todo_obj}"

				fw_relpath="${fw_relpath_old}"
			done
		done
	done

	# Fix the rpaths for psycopg module
	find "${BUNDLE_DIR}/Contents/Resources/venv/" -name _psycopg.so -print0 | xargs -0 install_name_tool -change libpq.5.dylib @loader_path/../../../../../../Frameworks/libpq.5.dylib
	find "${BUNDLE_DIR}/Contents/Resources/venv/" -name _psycopg.so -print0 | xargs -0 install_name_tool -change libssl.1.0.0.dylib @loader_path/../../../../../../Frameworks/libssl.1.0.0.dylib
	find "${BUNDLE_DIR}/Contents/Resources/venv/" -name _psycopg.so -print0 | xargs -0 install_name_tool -change libcrypto.1.0.0.dylib @loader_path/../../../../../../Frameworks/libcrypto.1.0.0.dylib

	echo "App completed: ${BUNDLE_DIR}"
	popd > /dev/null

    pushd ${SOURCE_DIR}/web > /dev/null
        yarn install
        yarn run bundle

        curl https://curl.haxx.se/ca/cacert.pem -o cacert.pem -s
    popd > /dev/null

    # copy the web directory to the bundle as it is required by runtime
    cp -r ${SOURCE_DIR}/web "${BUNDLE_DIR}/Contents/Resources/"
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

_framework_config() {
    # Get the config
    source ${SCRIPT_DIR}/framework.conf

    echo Reorganising the framework structure...

    # Create "Current" and "Current/Resources" inside each of the framework dirs
    find "${BUNDLE_DIR}/Contents/Frameworks"/*framework -type d -name "Versions" | while read -r framework_dir; do
        pushd "${framework_dir}" > /dev/null

        # Create framework 'Current' soft link
        VERSION_NUMBER=`ls -1`
        ln -s ${VERSION_NUMBER} Current

        # Create "Resources" subdirectory
        if [ ! -d Current/Resources ]; then
          mkdir Current/Resources
        fi

        popd > /dev/null
    done

    # Stuff for Qt framework files only
    find "${BUNDLE_DIR}/Contents/Frameworks" -type d -name "Qt*framework" | while read -r framework_dir; do
        pushd "${framework_dir}" > /dev/null

        # Create soft link to the framework binary
        ln -s Versions/Current/Qt*

        # Create soft link to the framework Resources dir
        ln -s Versions/Current/Resources

        # Create the Info.plist files
        MYNAME=`ls -1 Qt*`
        if [ -f Resources/Info.plist ]; then
            chmod +w Resources/Info.plist
        fi
        sed 's/__SHORT_VERSION__/${QT_SHORT_VERSION}/' "${SCRIPT_DIR}/Info.plist-template_Qt5" | sed 's/__FULL_VERSION__/${QT_FULL_VERSION}/' | sed "s/__FRAMEWORK_NAME__/${MYNAME}/" > "Resources/Info.plist"

        popd > /dev/null
    done

    # Same thing, but specific to the Python framework dir
    find "${BUNDLE_DIR}/Contents/Frameworks" -type d -name "P*framework" | while read -r framework_dir; do
        pushd "${framework_dir}" > /dev/null

        # Create soft link to the framework binary
        ln -s Versions/Current/Py*

        # Create soft link to the framework Resources dir
        ln -s Versions/Current/Resources

        # Create the Info.plist file
        MYNAME=`ls -1 Py*`
        sed 's/__SHORT_VERSION__/${PYTHON_SHORT_VERSION}/' "${SCRIPT_DIR}/Info.plist-template_Python" | sed 's/__FULL_VERSION__/${PYTHON_FULL_VERSION}/' | sed "s/__FRAMEWORK_NAME__/${MYNAME}/" > "Resources/Info.plist"

        popd > /dev/null
    done
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

    echo Signing ${BUNDLE_DIR} binaries...
    IFS=$'\n'
    for i in $(find "${BUNDLE_DIR}" -type f -perm +111 -exec file "{}" \; | grep -E "Mach-O executable|Mach-O 64-bit executable|Mach-O 64-bit bundle" | awk -F":| \\\(" '{print $1}' | uniq)
    do
        codesign --deep --force --verify --verbose --timestamp --options runtime -i "${DEVELOPER_BUNDLE_ID}" --sign "${DEVELOPER_ID}" "$i"
    done

    echo Signing ${BUNDLE_DIR} libraries...
    for i in $(find "${BUNDLE_DIR}" -type f -name "*.dylib*")
    do
        codesign --deep --force --verify --verbose --timestamp --options runtime -i "${DEVELOPER_BUNDLE_ID}" --sign "${DEVELOPER_ID}" "$i"
    done
}

_codesign_bundle() {
    if [ ${CODESIGN} -eq 0 ]; then
        return
    fi

    # Sign the .app
    echo Signing ${BUNDLE_DIR}...
    codesign --deep --force --verify --verbose --timestamp --options runtime -i "${DEVELOPER_BUNDLE_ID}" --sign "${DEVELOPER_ID}" "${BUNDLE_DIR}"

    # Verify it worked
    echo Verifying the signature...
    codesign --verify --verbose --deep --force "${BUNDLE_DIR}"
    echo ${BUNDLE_DIR} successfully signed.
}

_create_dmg() {
    # move to the directory where we want to create the DMG
    test -d ${DIST_ROOT} || mkdir ${DIST_ROOT}
    cd ${DIST_ROOT}

    DMG_LICENCE=./../pkg/mac/licence.rtf
    DMG_VOLUME_NAME=${APP_NAME}
    DMG_NAME=`echo ${DMG_VOLUME_NAME} | sed 's/ //g' | awk '{print tolower($0)}'`
    DMG_IMAGE=${DMG_NAME}-${APP_LONG_VERSION}.dmg

    DMG_DIR=./${DMG_IMAGE}.src

    if test -e "${DMG_DIR}"; then
        echo "Directory ${DMG_DIR} already exists. Please delete it manually." >&2
        exit 1
    fi

    echo "Cleaning up"
    rm -f "${DMG_IMAGE}"
    mkdir "${DMG_DIR}"

    echo "Copying data into temporary directory"
    cp -R "${BUNDLE_DIR}" "${DMG_DIR}"

    echo "Creating image"
    hdiutil create -quiet -srcfolder "$DMG_DIR" -fs HFS+ -format UDZO -volname "${DMG_VOLUME_NAME}" -ov "${DMG_IMAGE}"
    rm -rf "${DMG_DIR}"

    echo Attaching License to image...
    python ${SCRIPT_DIR}/dmg-license.py "${DMG_IMAGE}" "${DMG_LICENCE}" -c bz2
}

_codesign_dmg() {
    if [ ${CODESIGN} -eq 0 ]; then
        return
    fi

    DMG_VOLUME_NAME=${APP_NAME}
    DMG_NAME=`echo ${DMG_VOLUME_NAME} | sed 's/ //g' | awk '{print tolower($0)}'`
    DMG_IMAGE=${DIST_ROOT}/${DMG_NAME}-${APP_LONG_VERSION}.dmg

    if ! test -f "${DMG_IMAGE}" ; then
        echo "${DMG_IMAGE} is no disk image!" >&2
        exit 1
    fi

    # Sign the .app
    echo Signing ${DMG_IMAGE}...
    codesign --deep --force --verify --verbose --timestamp --options runtime -i "${DEVELOPER_BUNDLE_ID}" --sign "${DEVELOPER_ID}" "${DMG_IMAGE}"

    # Verify it worked
    echo Verifying the signature...
    codesign --verify --verbose --force "${DMG_IMAGE}"
    echo ${DMG_IMAGE} successfully signed.
}