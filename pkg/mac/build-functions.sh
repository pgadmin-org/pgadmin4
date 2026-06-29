# shellcheck shell=bash

# uname -m returns "x86_64" on Intel, but we need "x64"
ARCH="x64"
if [ "$(uname -m)" == "arm64" ]; then
    ARCH="arm64"
fi

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
    DMG_NAME="${DIST_ROOT}/$(echo "${APP_NAME}" | sed 's/ //g' | awk '{print tolower($0)}')-${APP_LONG_VERSION}-${ARCH}.dmg"
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
    # Resolve the electron version from runtime/package.json, NOT from
    # `npm info electron version`. The latter fetches whatever currently
    # carries the `latest` dist-tag on the npm registry, which means any
    # newly published electron release lands in shipped binaries without
    # review. Keep the build deterministic and pinned.
    ELECTRON_VERSION=$(sed -nE 's/.*"electron":[[:space:]]*"\^?([0-9.]+)".*/\1/p' "${SOURCE_DIR}/runtime/package.json" | head -1)
    if [ -z "${ELECTRON_VERSION}" ]; then
        echo "ERROR: could not resolve electron version from runtime/package.json" >&2
        exit 1
    fi

    pushd "${BUILD_ROOT}" > /dev/null || exit
        while true;do
            wget "https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/electron-v${ELECTRON_VERSION}-darwin-${ARCH}.zip" && break
            rm "electron-v${ELECTRON_VERSION}-darwin-${ARCH}.zip"
        done
        unzip "electron-v${ELECTRON_VERSION}-darwin-${ARCH}.zip"
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
        yarn set version 4
        yarn workspaces focus --production

        # remove the yarn cache
        rm -rf .yarn .yarn*
    popd > /dev/null || exit
}

_create_python_env() {
    # Force the current shell to not generate cache during build process
    export PYTHONDONTWRITEBYTECODE=1

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
    "${BUNDLE_DIR}/Contents/Frameworks/Python.framework/Versions/Current/bin/pip3" install --no-cache-dir -r "${SOURCE_DIR}/requirements.txt" || exit 1

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
    pip3 install --no-cache-dir -r "${SOURCE_DIR}/requirements.txt"
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
        yarn set version 4
        yarn install 2>&1

        # Record the source commit hash before the heavy lint/webpack
        # steps. `yarn run` needs node_modules so this runs after install,
        # but it's a pure `git log` redirect (see web/package.json
        # "git:hash") that costs ~nothing, so doing it up front means the
        # commit_hash file is captured even if webpack later bails out.
        echo "==> Recording git hash..."
        yarn run git:hash

        # Split the "bundle" script into its underlying steps and merge
        # stderr into stdout, so a crash inside lint/webpack (e.g. an OOM
        # kill or native-module load failure) leaves a trace in the
        # Jenkins console instead of an empty gap before the trap fires.
        # NODE_ENV mirrors the top-level "bundle" npm script (see
        # web/package.json). NODE_OPTIONS bumps V8's old-space ceiling
        # past the 3 GB default the npm script uses: at 3 GB the macOS
        # x64 builder OS-OOM-killed webpack inside TerserPlugin (build
        # #1294, sealing asset processing at 92%). 6 GB was too much for
        # the x64 VM's total RAM and pushed earlier steps into low-memory
        # failures (build #1295), so we land at 4 GB — enough headroom
        # for Terser without starving the rest of the build. Other build
        # paths still get 3 GB via the npm script.
        export NODE_ENV=production
        export NODE_OPTIONS=--max-old-space-size=4096
        echo "==> Running ESLint..."
        yarn run linter 2>&1
        echo "==> Running webpack bundle..."
        yarn run webpacker 2>&1
        unset NODE_ENV NODE_OPTIONS

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

    # Remove the .pyc files if any
    find "${BUNDLE_DIR}" -name "*.pyc" -print0 | xargs -0 rm -f

    # Update permissions to make sure all users can access installed pgadmin.
    chmod -R og=u "${BUNDLE_DIR}"
    chmod -R og-w "${BUNDLE_DIR}"
}

_strip_architecture() {
    # We only ship a single architecture (matching the build machine, via
    # ${ARCH}), but some inputs arrive as fat/universal2 Mach-O binaries.
    # In particular relocatable-python pulls the python.org *universal2*
    # installer, so the entire Python.framework carries both arm64 and
    # x86_64 slices; PostgreSQL-sourced dylibs (libpq, libssl, ...) may be
    # universal too. Strip the foreign slice from every fat Mach-O so the
    # bundle ships lean. Electron and its helpers are downloaded
    # single-arch already, so the loop simply skips them.
    #
    # NB: lipo invalidates code signatures, so this MUST run before
    # _codesign_binaries / _codesign_bundle.

    # Map the build ARCH ("arm64"/"x64") to the lipo/Mach-O arch name.
    local LIPO_ARCH="arm64"
    if [ "${ARCH}" == "x64" ]; then
        LIPO_ARCH="x86_64"
    fi

    echo "Stripping foreign architectures, keeping ${LIPO_ARCH}..."

    # Remove arch-specific stragglers shipped by the universal2 Python
    # installer: a pure-x86_64 launcher and a stray, never-executed build
    # object file. Globs keep this independent of the Python version.
    find "${BUNDLE_DIR}/Contents/Frameworks/Python.framework" \
        -name 'python*-intel64' -type f -delete
    find "${BUNDLE_DIR}/Contents/Frameworks/Python.framework" \
        -path '*/config-*-darwin/python.o' -type f -delete

    # Thin every fat Mach-O in the bundle in place. -type f skips symlinks,
    # so versioned dylib aliases are left alone and only the real file is
    # thinned once.
    local f archs perms
    while IFS= read -r f; do
        archs=$(lipo -archs "${f}" 2>/dev/null) || continue   # not Mach-O
        case " ${archs} " in
            *" ${LIPO_ARCH} "*) ;;                            # has our slice
            *)
                # No slice for our target arch — thinning can't help; this
                # would need a rebuild from the right arch. Warn loudly.
                echo "WARNING: ${f} lacks a ${LIPO_ARCH} slice (${archs}); leaving as-is" >&2
                continue
                ;;
        esac
        # Already single-arch (our arch) — nothing to strip.
        if [ "$(echo "${archs}" | wc -w)" -le 1 ]; then
            continue
        fi
        echo "Thinning ${f} (${archs} -> ${LIPO_ARCH})"
        # lipo writes to a separate file, which loses the original mode
        # (notably the +x bit the signing pass relies on), so capture and
        # restore the permissions across the swap.
        perms=$(stat -f '%Lp' "${f}")
        if lipo -thin "${LIPO_ARCH}" "${f}" -output "${f}.thin"; then
            chmod "${perms}" "${f}.thin"
            mv -f "${f}.thin" "${f}"
        else
            rm -f "${f}.thin"
            echo "WARNING: failed to thin ${f}" >&2
        fi
    done < <(find "${BUNDLE_DIR}" -type f)
}

_prune_dangling_symlinks() {
    # Gatekeeper walks every symlink in the bundle and rejects the whole app
    # with "invalid destination for symbolic link in bundle" if any link does
    # not resolve to a real file inside the app. Notarisation does NOT catch
    # this, so a broken link slips through stapling and only surfaces as a
    # Gatekeeper failure on the end user's machine.
    #
    # The embedded Python.framework ships such links: an arm64-only build still
    # carries a bin/python*-intel64 launcher symlink (whose target we delete in
    # _strip_architecture), and the bundled Tcl/Tk frameworks carry
    # PrivateHeaders links pointing at a Versions/Current that has none. Rather
    # than hunt individual offenders, prune EVERY dangling symlink so a future
    # stray link cannot reintroduce the bug.
    #
    # NB: this MUST run after _strip_architecture (which orphans links by
    # deleting their targets) and before _codesign_binaries / _codesign_bundle.

    echo "Pruning dangling symlinks before signing..."
    # -type l selects symlinks; "! -exec test -e {} \;" keeps only those whose
    # target does not exist (test -e follows the link). BSD find on macOS.
    find "${BUNDLE_DIR}" -type l ! -exec test -e {} \; -print -delete

    # Belt and braces: fail the build if anything still dangles, so this can
    # never silently slip past notarisation into a shipped bundle again.
    if find "${BUNDLE_DIR}" -type l ! -exec test -e {} \; -print | grep -q .; then
        echo "ERROR: bundle still contains dangling symlinks (Gatekeeper will reject)" >&2
        exit 1
    fi
}

_verify_bundle_linkage() {
    # Belt and braces: make sure nothing in the finished bundle links against
    # a library that lives outside it on the build host. Such a reference
    # resolves on the build machine but the path is absent on an end user's
    # Mac (or, for a Homebrew dylib, present-but-rejected by hardened-runtime
    # library validation for having a different Team ID), so the app dies on
    # startup before it can even import config.
    #
    # The known offender is the Python cryptography module. When no binary
    # wheel is published for the build architecture (cryptography 49 dropped
    # the Intel/universal2 macOS wheel, leaving arm64 only), pip compiles it
    # from source, and its openssl-sys crate links whatever OpenSSL it
    # discovers on the build host rather than the one we ship: it ignores the
    # CFLAGS/LDFLAGS the build exports and falls back to Homebrew, baking
    # e.g. /usr/local/opt/openssl@3/lib/libssl.3.dylib into _rust.abi3.so.
    # _fixup_imports deliberately skips _rust.abi3.so, so the dangling
    # reference would otherwise sail through to a shipped DMG. See issue
    # #10123.
    #
    # Everything legitimate in the bundle is either an OS library (/usr/lib,
    # /System) or a bundle-relative reference (@loader_path, @rpath,
    # @executable_path), so any absolute install-name under a build-host
    # prefix is, by definition, wrong.
    #
    # NB: run after _complete_bundle (which does the install-name rewriting
    # via _fixup_imports) so we validate the final, relocated state.

    echo "Verifying bundle library references..."

    # Build-host prefixes that must never appear in a shipped bundle. SLAVE_HOME
    # (the Jenkins workspace root, under which the self-built OpenSSL and
    # PostgreSQL live) is only added when set, i.e. on the CI builders.
    local PREFIXES='/usr/local|/opt/homebrew|/opt/local'
    if [ -n "${SLAVE_HOME}" ]; then
        PREFIXES="${PREFIXES}|${SLAVE_HOME}"
    fi

    local found="" f deps
    while IFS= read -r f; do
        # otool prints the filename header then one line per dependency; drop
        # the header, take the install-name column, and keep only build-host
        # paths. grep exits non-zero (no match) for a clean binary, which is
        # the common case, so fall through to the next file.
        deps=$(otool -L "${f}" 2>/dev/null | tail -n +2 | awk '{print $1}' | \
            grep -E "^(${PREFIXES})") || continue
        echo "ERROR: ${f} links against build-host libraries:" >&2
        echo "${deps}" | sed 's/^/    /' >&2
        found="yes"
    done < <(find "${BUNDLE_DIR}" \( -name '*.so' -o -name '*.dylib' \) -type f)

    if [ -n "${found}" ]; then
        echo "ERROR: the bundle links against libraries outside it; those paths" >&2
        echo "       will not exist (or will fail library validation) on end-user" >&2
        echo "       machines and the app will not start. See issue #10123." >&2
        echo "       Ensure the affected module links the bundled OpenSSL, e.g." >&2
        echo "       set OPENSSL_DIR (and OPENSSL_STATIC) for the cryptography" >&2
        echo "       build so openssl-sys does not pick up Homebrew's copy." >&2
        exit 1
    fi
    echo "Bundle library references OK."
}

_generate_sbom() {
   echo "Generating SBOM..."
   syft "${BUNDLE_DIR}/Contents/" -o cyclonedx-json > "${BUNDLE_DIR}/Contents/sbom.json"
}

_codesign_binaries() {
    if [ "${CODESIGN}" -eq 0 ]; then
        return
    fi

    echo "Purging build-machine pollution (pycache) before signing..."
    find "${BUNDLE_DIR}" -name "__pycache__" -type d -exec rm -rf {} +
    find "${BUNDLE_DIR}" -name "*.pyc" -delete

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

    echo "Verifying the signature from bundle dir..."
    codesign --verify --deep --verbose=4 "${BUNDLE_DIR}"
}

_create_zip() {
    ZIP_NAME="${DMG_NAME%.dmg}.zip"
    echo "ZIP_NAME: ${ZIP_NAME}"

    echo "Compressing pgAdmin 4.app in bundle dir into ${ZIP_NAME}..."
    ditto -c -k --sequesterRsrc --keepParent "${BUNDLE_DIR}" "${ZIP_NAME}"

    if [ $? -ne 0 ]; then
        echo "Failed to create the ZIP file. Exiting."
        exit 1
    fi

    echo "Successfully created ZIP file: ${ZIP_NAME}"
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
    local FILE_NAME="$1"
    local STAPLE_TARGET="$2"
    local FILE_LABEL="$3"

    if [ "${CODESIGN}" -eq 0 ]; then
        return
    fi

    echo "Uploading ${FILE_LABEL} for Notarization ..."
    STATUS=$(xcrun notarytool submit "${FILE_NAME}" \
        --team-id "${DEVELOPER_TEAM_ID}" \
        --apple-id "${DEVELOPER_USER}" \
        --password "${DEVELOPER_ASP}" 2>&1)

    echo "${STATUS}"

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
    echo "Stapling the notarization to the ${FILE_LABEL}..."
    if ! xcrun stapler staple "${STAPLE_TARGET}"; then
        echo "Stapling failed."
        exit 1
    fi

    # For ZIP, recreate the zip after stapling
    if [[ "${FILE_LABEL}" == "ZIP" ]]; then
        ditto -c -k --keepParent "${BUNDLE_DIR}" "${ZIP_NAME}"
        if [ $? != 0 ]; then
            echo "ERROR: could not staple ${ZIP_NAME}"
            exit 1
        fi
    fi

    echo "Notarization completed successfully."
}

_notarize_zip() {
    _notarize_pkg "${ZIP_NAME}" "${BUNDLE_DIR}" "ZIP"
}

_notarize_dmg() {
    _notarize_pkg "${DMG_NAME}" "${DMG_NAME}" "DMG"
}
