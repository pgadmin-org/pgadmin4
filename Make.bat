@ECHO off
SETLOCAL

SET WD=%CD%
SET "BUILDROOT=%WD%\win-build"
SET "TMPDIR=%WD%\win-temp"
SET "DISTROOT=%WD%\dist"

SET CMDOPTIONS=""
IF "%1" == "clean" SET CMDOPTIONS="VALID"
IF "%1" == ""      SET CMDOPTIONS="VALID"

IF NOT %CMDOPTIONS%=="VALID" (
    GOTO USAGE
)

IF "%1" == "clean" (
    CALL :CLEAN
    EXIT /B %ERRORLEVEL%
)

REM Main build sequence
REM
REM The clean runs first because :FETCH_PYTHON unpacks into the temp directory
REM that it removes, and the fetch runs before :SET_ENVIRONMENT because the
REM latter has no interpreter of its own to ask about the build.
CALL :CLEAN || EXIT /B 1
CALL :FETCH_PYTHON || EXIT /B 1
CALL :SET_ENVIRONMENT
CALL :VALIDATE_ENVIRONMENT || EXIT /B 1
CALL :CREATE_VIRTUAL_ENV || EXIT /B 1
CALL :CREATE_PYTHON_ENV || EXIT /B 1
CALL :CREATE_RUNTIME_ENV || EXIT /B 1
CALL :GENERATE_SBOM || EXIT /B 1
CALL :CREATE_INSTALLER || EXIT /B 1
CALL :VERIFY_SIGNATURE || EXIT /B 1

EXIT /B %ERRORLEVEL%
REM Main build sequence Ends


:CLEAN
    ECHO Removing build directory...
    IF EXIST "%BUILDROOT%" RD "%BUILDROOT%" /S /Q > nul || EXIT /B 1

    ECHO Removing tmp directory...
    IF EXIST "%TMPDIR%" RD "%TMPDIR%" /S /Q > nul || EXIT /B 1

    ECHO Removing installer build directory...
    IF EXIST "%WD%\pkg\win32\Output" rd "%WD%\pkg\win32\Output" /S /Q > nul || EXIT /B 1

    ECHO Removing installer configuration script...
    IF EXIST DEL /q "%WD%\pkg\win32\installer.iss" > nul || EXIT /B 1

    EXIT /B 0


:FETCH_PYTHON
    REM Fetch the Python this build uses, rather than using whatever happens to
    REM be installed on the machine running it. Which interpreter pgAdmin ships
    REM is a decision recorded in pkg\python-version.txt, not a property of the
    REM build agent, and this is the only place on Windows that reads it.
    REM
    REM The distribution comes from astral-sh/python-build-standalone: it is
    REM relocatable, published per exact CPython version, and is a plain tarball
    REM rather than an installer, so unpacking it raises no UAC prompt. That
    REM matters on the signing host, where the desktop session is logged in
    REM automatically and an elevation dialog waits forever for somebody who is
    REM not there.
    REM
    REM curl.exe and tar.exe have shipped in Windows since 1803, so this needs
    REM nothing installed to bootstrap itself, not even a Python.
    ECHO Reading the Python version...
    SET "PYTHON_VERSION="
    SET "PYTHON_BUILD_STANDALONE_TAG="
    FOR /F "eol=# usebackq tokens=1,2 delims==" %%a IN ("%WD%\pkg\python-version.txt") DO (
        IF "%%a" == "PYTHON_VERSION" SET "PYTHON_VERSION=%%b"
        IF "%%a" == "PYTHON_BUILD_STANDALONE_TAG" SET "PYTHON_BUILD_STANDALONE_TAG=%%b"
    )

    IF "%PYTHON_VERSION%" == "" (
        ECHO PYTHON_VERSION is not set in pkg\python-version.txt.
        EXIT /B 1
    )
    IF "%PYTHON_BUILD_STANDALONE_TAG%" == "" (
        ECHO PYTHON_BUILD_STANDALONE_TAG is not set in pkg\python-version.txt.
        EXIT /B 1
    )

    REM Split for the runtime build, where e.g. 3.13.15 becomes 313
    FOR /F "tokens=1,2,3 delims=." %%a IN ("%PYTHON_VERSION%") DO (
        SET "PYTHON_MAJOR=%%a"
        SET "PYTHON_MINOR=%%b"
        SET "PYTHON_REVISION=%%c"
    )

    SET "PGADMIN_PYTHON_DIR=%TMPDIR%\python"
    SET "PYTHON_ARCHIVE=cpython-%PYTHON_VERSION%+%PYTHON_BUILD_STANDALONE_TAG%-x86_64-pc-windows-msvc-install_only.tar.gz"

    IF NOT EXIST "%TMPDIR%"  MKDIR "%TMPDIR%"

    ECHO Downloading Python %PYTHON_VERSION%...
    curl.exe --fail --location --silent --show-error --output "%TMPDIR%\python.tar.gz" "https://github.com/astral-sh/python-build-standalone/releases/download/%PYTHON_BUILD_STANDALONE_TAG%/%PYTHON_ARCHIVE%" || EXIT /B 1

    ECHO Unpacking Python...
    REM The archive unpacks to a single python\ directory.
    tar -x -f "%TMPDIR%\python.tar.gz" -C "%TMPDIR%" || EXIT /B 1
    DEL /q "%TMPDIR%\python.tar.gz" > nul 2>&1

    "%PGADMIN_PYTHON_DIR%\python.exe" --version || EXIT /B 1

    REM :CREATE_VIRTUAL_ENV needs virtualenv rather than the venv module, as it
    REM relocates the result. pip is bundled with the distribution, but ask
    REM ensurepip for it anyway so this does not quietly depend on that.
    ECHO Installing virtualenv...
    "%PGADMIN_PYTHON_DIR%\python.exe" -m ensurepip --upgrade || EXIT /B 1
    "%PGADMIN_PYTHON_DIR%\python.exe" -m pip install --upgrade pip virtualenv || EXIT /B 1

    EXIT /B 0


:SET_ENVIRONMENT
    ECHO Configuring the environment...
    IF "%PGADMIN_KRB5_DIR%" == ""     SET "PGADMIN_KRB5_DIR=C:\Program Files\MIT\Kerberos"
    IF "%PGADMIN_POSTGRES_DIR%" == "" SET "PGADMIN_POSTGRES_DIR=C:\Program Files\PostgreSQL\17"
    IF "%PGADMIN_INNOTOOL_DIR%" == "" SET "PGADMIN_INNOTOOL_DIR=C:\Program Files (x86)\Inno Setup 6"
    IF "%PGADMIN_VCREDIST_DIR%" == "" SET "PGADMIN_VCREDIST_DIR=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Redist\MSVC\14.40.33807"
    IF "%PGADMIN_VCREDIST_FILE%" == "" SET "PGADMIN_VCREDIST_FILE=vc_redist.x64.exe"
    IF "%PGADMIN_SIGNTOOL_DIR%" == "" SET "PGADMIN_SIGNTOOL_DIR=C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"
    IF "%PGADMIN_WINDOWS_CSC%" == "" SET "PGADMIN_WINDOWS_CSC="

    REM Set additional variables we need
    FOR /F "tokens=3" %%a IN ('findstr /C:"APP_RELEASE =" %WD%\web\version.py')  DO SET APP_MAJOR=%%a
    FOR /F "tokens=3" %%a IN ('findstr /C:"APP_REVISION =" %WD%\web\version.py') DO SET APP_MINOR=%%a
    FOR /F "tokens=3" %%a IN ('findstr /C:"APP_SUFFIX =" %WD%\web\version.py')   DO SET APP_VERSION_SUFFIX=%%a
    REM remove single quote from the string
    SET APP_VERSION_SUFFIX=%APP_VERSION_SUFFIX:'=%
    SET APP_NAME=""
    FOR /F "tokens=2* DELims='" %%a IN ('findstr /C:"APP_NAME =" web\branding.py') DO SET APP_NAME=%%a
    FOR /f "tokens=1 DELims=." %%G IN ('%PGADMIN_PYTHON_DIR%/python.exe -c "print('%APP_NAME%'.lower().replace(' ', ''))"') DO SET APP_SHORTNAME=%%G
    SET APP_VERSION=%APP_MAJOR%.%APP_MINOR%
    SET INSTALLERNAME=%APP_SHORTNAME%-%APP_MAJOR%.%APP_MINOR%-%APP_VERSION_SUFFIX%-x64.exe
    IF "%APP_VERSION_SUFFIX%" == "" SET INSTALLERNAME=%APP_SHORTNAME%-%APP_MAJOR%.%APP_MINOR%-x64.exe

    EXIT /B 0


:VALIDATE_ENVIRONMENT
    ECHO ****************************************************************
    ECHO * Build summary
    ECHO ****************************************************************
    ECHO Build path:                %BUILDROOT%
    ECHO Output directory:          %DISTROOT%
    ECHO Installer name:            %INSTALLERNAME%
    ECHO.
    ECHO Python version:            %PYTHON_MAJOR%.%PYTHON_MINOR%.%PYTHON_REVISION%
    ECHO Python directory:          %PGADMIN_PYTHON_DIR%
    ECHO.
    ECHO KRB5 directory:            %PGADMIN_KRB5_DIR%
    ECHO PostgreSQL directory:      %PGADMIN_POSTGRES_DIR%
    ECHO.
    ECHO VC++ redist directory:     %PGADMIN_VCREDIST_DIR%
    ECHO VC++ redist file:          %PGADMIN_VCREDIST_FILE%
    ECHO InnoTool directory:        %PGADMIN_INNOTOOL_DIR%
    ECHO signtool directory:        %PGADMIN_SIGNTOOL_DIR%
    IF "%PGADMIN_WINDOWS_CSC%" == "" (
        ECHO Code signing certificate:  [NONE - Signing disabled]
    ) ELSE (
        ECHO Code signing certificate:  %PGADMIN_WINDOWS_CSC%
    )
    ECHO.
    ECHO App version:               %APP_VERSION%
    ECHO App version suffix:        %APP_VERSION_SUFFIX%
    ECHO App short name:            %APP_SHORTNAME%
    ECHO App name:                  %APP_NAME%
    ECHO ****************************************************************

    ECHO Checking the environment...
    IF NOT EXIST "%PGADMIN_INNOTOOL_DIR%" (
        ECHO !PGADMIN_INNOTOOL_DIR! does not exist
        ECHO Please install InnoTool and set the PGADMIN_INNOTOOL_DIR environment variable.
        EXIT /B 1
    )

    IF NOT EXIST "%PGADMIN_VCREDIST_DIR%" (
        ECHO !PGADMIN_VCREDIST_DIR! does not exist
        ECHO Please install Microsoft Visual studio and set the PGADMIN_VCREDIST_DIR environment variable.
        EXIT /B 1
    )

    IF NOT EXIST "%PGADMIN_KRB5_DIR%" (
        ECHO !PGADMIN_KRB5_DIR! does not exist.
        ECHO Please install MIT Kerberos for Windows and set the PGADMIN_KRB5_DIR environment variable.
        EXIT /B 1
    )

    IF NOT EXIST "%PGADMIN_POSTGRES_DIR%" (
        ECHO !PGADMIN_POSTGRES_DIR! does not exist.
        ECHO Please install PostgreSQL and set the PGADMIN_POSTGRES_DIR environment variable.
        EXIT /B 1
    )

    SET "PATH=%PGADMIN_POSTGRES_DIR%\bin;%PATH%"

    EXIT /B 0


:CREATE_VIRTUAL_ENV
    ECHO Creating virtual environment...
    IF NOT EXIST "%TMPDIR%"  MKDIR "%TMPDIR%"

    CD "%TMPDIR%"

    REM Note that we must use virtualenv.exe here, as the venv module doesn't allow python.exe to relocate.
    "%PGADMIN_PYTHON_DIR%\Scripts\virtualenv.exe" venv || EXIT /B 1

    XCOPY /S /I /E /H /Y "%PGADMIN_PYTHON_DIR%\DLLs" "%TMPDIR%\venv\DLLs" > nul || EXIT /B 1
    REM Copy the standard library, but NOT site-packages: the venv already has its
    REM own seeded pip there, and overwriting only the files the system Python also
    REM has leaves a mix of two pip versions behind.
    ROBOCOPY /E /R:3 /W:5 /NFL /NDL /NP "%PGADMIN_PYTHON_DIR%\Lib" "%TMPDIR%\venv\Lib" /XD site-packages
    CALL :CHECK_ROBOCOPY_ERROR || EXIT /B 1

    ECHO Activating virtual environment -  %TMPDIR%\venv...
    CALL "%TMPDIR%\venv\Scripts\activate" || EXIT /B 1

    ECHO Installing dependencies...
    CALL python -m pip install --upgrade pip || EXIT /B 1
    CALL pip install --only-binary=cryptography -r "%WD%\requirements.txt" || EXIT /B 1

    CD %WD%
    EXIT /B 0


:CREATE_PYTHON_ENV
    ECHO Staging Python...
    MKDIR "%BUILDROOT%\python\Lib" || EXIT /B 1

    ECHO Downloading embedded Python %PYTHON_VERSION%...
    REM What ships is the embeddable distribution from python.org, a different
    REM build from the one :FETCH_PYTHON downloaded, and it has to be the same
    REM CPython version: the extension modules in site-packages were compiled
    REM against the build Python and are about to be run under this one. Both
    REM therefore read pkg\python-version.txt, rather than either asking the
    REM other what it is.
    curl.exe --fail --location --silent --show-error --output "%TMPDIR%\python-embedded.zip" "https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-embed-amd64.zip" || EXIT /B 1
    tar -x -f "%TMPDIR%\python-embedded.zip" -C "%BUILDROOT%\python" || EXIT /B 1

    ECHO Copying site-packages...
    XCOPY /S /I /E /H /Y "%TMPDIR%\venv\Lib\site-packages" "%BUILDROOT%\python\Lib\site-packages" > nul || EXIT /B 1

    REM NOTE: There is intentionally no space after "site" in the line below, to prevent Python barfing if there's one in the file
    ECHO import site>> "%BUILDROOT%\python\python%PYTHON_MAJOR%%PYTHON_MINOR%._pth"

    REM NOTE: The Kerberos components are staged into the runtime directory
    REM alongside libpq.dll, not here. See :CREATE_RUNTIME_ENV.

    ECHO Cleaning up unnecessary .pyc and .pyo files...
    FOR /R "%BUILDROOT%\python" %%f in (*.pyc *.pyo) do DEL /q "%%f" 1> nul 2>&1
    ECHO Removing tests...
    FOR /R "%BUILDROOT%\python\Lib" %%f in (test tests) do RD /Q /S "%%f" 1> nul 2>&1

    EXIT /B 0


:CREATE_RUNTIME_ENV
    IF NOT EXIST "%BUILDROOT%"  MKDIR "%BUILDROOT%"
    MKDIR "%BUILDROOT%\runtime"

    ECHO Removing webpack caches...
    RD /Q /S "%WD%\web\pgadmin\static\js\generated\.cache" 1> nul 2>&1

    ECHO Copying web directory...
    ROBOCOPY /S /NFL /NDL /NP "%WD%\web" "%BUILDROOT%\web"
    CALL :CHECK_ROBOCOPY_ERROR || EXIT /B 1

    ECHO Installing javascript dependencies...
    CD "%BUILDROOT%\web"
    SET "YARN_VERSION="
    FOR /f "delims=" %%v IN ('node -p "require('./package.json').packageManager.split('@')[1]"') DO SET "YARN_VERSION=%%v"
    IF "%YARN_VERSION%"=="" (
        ECHO ERROR: Could not determine Yarn version from package.json packageManager field.
        EXIT /B 1
    )
    CALL yarn set version %YARN_VERSION% || EXIT /B 1
    CALL yarn install --immutable || EXIT /B 1
    CALL npm rebuild || EXIT /B 1

    ECHO Bundling javascript...
    CALL yarn run bundle || EXIT /B 1

    ECHO Cleaning up unnecessary .pyc and .pyo files...
    FOR /R "%BUILDROOT%\web" %%f in (*.pyc *.pyo) do DEL /q "%%f" 1> nul 2>&1
    ECHO Removing tests, Python caches and node modules...
    FOR /R "%BUILDROOT%\web" %%f in (tests feature_tests __pycache__ node_modules) do RD /Q /S "%%f" 1> nul 2>&1
    ECHO Removing the test framework...
    RD /Q /S "%BUILDROOT%\web\regression" 1> nul 2>&1
    ECHO Removing tools...
    RD /Q /S "%BUILDROOT%\web\tools" 1> nul 2>&1
    ECHO Removing the JavaScript build configuration...
    RD /Q /S "%BUILDROOT%\web\.yarn" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\yarn.lock" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\.yarnrc.yml" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\package.json" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\jest.config.js" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\babel.cfg" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\babel.config.json" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\webpack.config.js" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\webpack.shim.js" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\.eslintrc.js" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\.editorconfig" 1> nul 2>&1
    ECHO Removing any existing configurations...
    DEL /q "%BUILDROOT%\web\pgadmin4.db" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\config_local.py" 1> nul 2>&1

    ECHO Staging license files...
    COPY "%WD%\LICENSE" "%BUILDROOT%\" > nul || EXIT /B 1

    ECHO Creating config_distro.py
    ECHO SERVER_MODE = False > "%BUILDROOT%\web\config_distro.py"
    ECHO HELP_PATH = '../../../docs/en_US/html/' >> "%BUILDROOT%\web\config_distro.py"
    ECHO DEFAULT_BINARY_PATHS = { >> "%BUILDROOT%\web\config_distro.py"
    ECHO     'pg':   '$DIR/../runtime', >> "%BUILDROOT%\web\config_distro.py"
    ECHO     'ppas': '' >> "%BUILDROOT%\web\config_distro.py"
    ECHO } >> "%BUILDROOT%\web\config_distro.py"

    ECHO Building docs...
    CALL pip install sphinx || EXIT /B 1
    CALL pip install sphinxcontrib-youtube || EXIT /B 1
    MKDIR "%BUILDROOT%\docs\en_US\html"
    CD "%WD%\docs\en_US"
    CALL "%TMPDIR%\venv\Scripts\python.exe" build_code_snippet.py || EXIT /B 1
    CALL "%TMPDIR%\venv\Scripts\sphinx-build.exe" "%WD%\docs\en_US" "%BUILDROOT%\docs\en_US\html" || EXIT /B 1

    REM Remove unnecessary doc files
    DEL /q "%BUILDROOT%\docs\en_US\html\_static\*.png" 1> nul 2>&1
    RD /Q /S "%BUILDROOT%\docs\en_US\html\_sources" 1> nul 2>&1

    ECHO Staging runtime components...
    MKDIR "%BUILDROOT%\runtime\resources\app"
    XCOPY /S /I /E /H /Y "%WD%\runtime\assets" "%BUILDROOT%\runtime\resources\app\assets" > nul || EXIT /B 1
    XCOPY /S /I /E /H /Y "%WD%\runtime\src" "%BUILDROOT%\runtime\resources\app\src" > nul || EXIT /B 1

    COPY "%WD%\runtime\package.json" "%BUILDROOT%\runtime\resources\app\" > nul || EXIT /B 1
    COPY "%WD%\runtime\.yarnrc.yml" "%BUILDROOT%\runtime\resources\app\" > nul || EXIT /B 1

    CD "%BUILDROOT%\runtime\resources\app\"

    SET "YARN_VERSION="
    FOR /f "delims=" %%v IN ('node -p "require('./package.json').packageManager.split('@')[1]"') DO SET "YARN_VERSION=%%v"
    IF "%YARN_VERSION%"=="" (
        ECHO ERROR: Could not determine Yarn version from package.json packageManager field.
        EXIT /B 1
    )
    CALL yarn set version %YARN_VERSION% || EXIT /B 1
    CALL yarn workspaces focus --production || EXIT /B 1

    ECHO Removing yarn cache...
    RD /Q /S "%BUILDROOT%\runtime\resources\app\.yarn" 1> nul 2>&1

    ECHO Downloading Electron to %TMPDIR%...
    REM Get a fresh copy of electron.

    REM WGET
    FOR /f "tokens=*" %%i IN ('npm info electron version') DO SET "ELECTRON_VERSION=%%i"

    :GET_NW
        wget https://github.com/electron/electron/releases/download/v%ELECTRON_VERSION%/electron-v%ELECTRON_VERSION%-win32-x64.zip -O "%TMPDIR%\electron-v%ELECTRON_VERSION%-win32-x64.zip"
        IF %ERRORLEVEL% NEQ 0 GOTO GET_NW

    MKDIR "%TMPDIR%\electron-v%ELECTRON_VERSION%-win32-x64" || EXIT /B 1
    tar -C "%TMPDIR%\electron-v%ELECTRON_VERSION%-win32-x64" -xvf "%TMPDIR%\electron-v%ELECTRON_VERSION%-win32-x64.zip" || EXIT /B 1
    REM WGET END

    REM XCOPY
    XCOPY /S /I /E /H /Y "%TMPDIR%\electron-v%ELECTRON_VERSION%-win32-x64\*" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    REM XCOPY END

    MOVE "%BUILDROOT%\runtime\electron.exe" "%BUILDROOT%\runtime\pgAdmin4.exe"

    ECHO Downloading rcedit.exe...
    wget https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe -O "%TMPDIR%\rcedit-x64.exe"

    ECHO Replacing executable icon, description, version...
    %TMPDIR%\rcedit-x64.exe "%BUILDROOT%\runtime\pgAdmin4.exe" --set-icon "%WD%\pkg\win32\Resources\pgAdmin4.ico"
    %TMPDIR%\rcedit-x64.exe "%BUILDROOT%\runtime\pgAdmin4.exe" --set-version-string "FileDescription" "%APP_NAME%"
    %TMPDIR%\rcedit-x64.exe "%BUILDROOT%\runtime\pgAdmin4.exe" --set-version-string "ProductName" "%APP_NAME%"
    %TMPDIR%\rcedit-x64.exe "%BUILDROOT%\runtime\pgAdmin4.exe" --set-product-version "%APP_VERSION%"

    IF NOT "%PGADMIN_WINDOWS_CSC%" == "" (
        ECHO Attempting to sign the pgAdmin4.exe...
        CALL "%PGADMIN_SIGNTOOL_DIR%\signtool.exe" sign /sm /n "%PGADMIN_WINDOWS_CSC%" /tr http://timestamp.digicert.com /td sha256 /fd sha1 /v "%BUILDROOT%\runtime\pgAdmin4.exe"
        REM IF ERRORLEVEL, not IF %ERRORLEVEL%: inside a parenthesised block the
        REM latter is expanded when the block is parsed, before signtool has run,
        REM so it tested a stale value and this branch never fired. A failed
        REM signature on the executable users actually run was undetectable, and
        REM the installer around it was signed and verified regardless.
        IF ERRORLEVEL 1 (
            ECHO.
            ECHO ************************************************************
            ECHO * Failed to sign the pgAdmin4.exe
            ECHO ************************************************************
            EXIT /B 1
        )
    ) ELSE (
        ECHO Skipping code signing ^(PGADMIN_WINDOWS_CSC is not set^)...
    )

    ECHO Staging PostgreSQL components...
    COPY "%PGADMIN_POSTGRES_DIR%\bin\libpq.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\libcrypto-*-x64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\libssl-*-x64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    IF EXIST "%PGADMIN_POSTGRES_DIR%\bin\libintl-*.dll" COPY "%PGADMIN_POSTGRES_DIR%\bin\libintl-*.dll" "%BUILDROOT%\runtime" > nul
    IF EXIST "%PGADMIN_POSTGRES_DIR%\bin\libiconv-*.dll" COPY "%PGADMIN_POSTGRES_DIR%\bin\libiconv-*.dll" "%BUILDROOT%\runtime" > nul
    IF EXIST "%PGADMIN_POSTGRES_DIR%\bin\liblz4.dll" COPY "%PGADMIN_POSTGRES_DIR%\bin\liblz4.dll" "%BUILDROOT%\runtime" > nul
    IF EXIST "%PGADMIN_POSTGRES_DIR%\bin\libzstd.dll" COPY "%PGADMIN_POSTGRES_DIR%\bin\libzstd.dll" "%BUILDROOT%\runtime" > nul
    COPY "%PGADMIN_POSTGRES_DIR%\bin\zlib1.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\pg_dump.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\pg_dumpall.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\pg_restore.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\psql.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1

    REM The Kerberos runtime belongs here, next to libpq.dll and the client
    REM binaries: PostgreSQL 18 and later are built with GSSAPI support, so
    REM libpq.dll has a load-time dependency on gssapi64.dll, and pg_dump.exe
    REM and friends resolve it from their own directory. The pgAdmin server
    REM process finds it here too, because the runtime prepends this directory
    REM to PATH before spawning Python.
    REM
    REM krb5_64.dll loads krbcc64.dll dynamically rather than importing it, but
    REM it is not optional: on Windows krb5 defaults the credential cache type
    REM to CCAPI, and the entry points for that are left null when the DLL
    REM cannot be loaded, so the first use of the default credential cache
    REM calls address zero. ccapiserver.exe is the process krbcc64.dll drives.
    ECHO Staging Kerberos components...
    COPY "%PGADMIN_KRB5_DIR%\bin\kinit.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\krb5_64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\comerr64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\k5sprt64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\gssapi64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\krbcc64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\ccapiserver.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1

    ECHO Staging VC++ runtime...
    MKDIR "%BUILDROOT%\installer" || EXIT /B 1
    COPY "%PGADMIN_VCREDIST_DIR%\%PGADMIN_VCREDIST_FILE%" "%BUILDROOT%\installer" > nul || EXIT /B 1

    CD %WD%
    EXIT /B 0


:CREATE_INSTALLER
    ECHO Preparing for creation of windows installer...
    IF NOT EXIST "%DISTROOT%" MKDIR "%DISTROOT%"

    ECHO Copying icon file...
    COPY "%WD%\pkg\win32\Resources\pgAdmin4.ico" "%BUILDROOT%" > nul || EXIT /B 1

    CD "%WD%\pkg\win32"

    ECHO Processing installer configuration script...
    CALL "%PGADMIN_PYTHON_DIR%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in" "-o" "%WD%\pkg\win32\installer.iss.in_stage1" "-s" MYAPP_FULLVERSION -r """%APP_VERSION%"""
    CALL "%PGADMIN_PYTHON_DIR%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage1" "-o" "%WD%\pkg\win32\installer.iss.in_stage2" "-s" MYAPP_VERSION -r """v%APP_MAJOR%"""
    CALL "%PGADMIN_PYTHON_DIR%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage2" "-o" "%WD%\pkg\win32\installer.iss" "-s" MYAPP_VCDIST -r """%PGADMIN_VCREDIST_DIRNAME%\%PGADMIN_VCREDIST_FILE%"""

    ECHO Cleaning up...
    DEL /s "%WD%\pkg\win32\installer.iss.in_stage*" > nul

    ECHO Creating windows installer using INNO tool...
    IF NOT "%PGADMIN_WINDOWS_CSC%" == "" (
        CALL "%PGADMIN_INNOTOOL_DIR%\ISCC.exe" "%WD%\pkg\win32\installer.iss" "/DSIGNED" "/SpgAdminSigntool=%PGADMIN_SIGNTOOL_DIR%\signtool.exe sign /sm /n $q%PGADMIN_WINDOWS_CSC%$q /tr http://timestamp.digicert.com /td sha256 /fd sha1 /v $f" || EXIT /B 1
    ) ELSE (
        CALL "%PGADMIN_INNOTOOL_DIR%\ISCC.exe" "%WD%\pkg\win32\installer.iss" || EXIT /B 1
    )

    ECHO Renaming installer...
    MOVE "%WD%\pkg\win32\Output\pgadmin4-setup.exe" "%DISTROOT%\%INSTALLERNAME%" > nul || EXIT /B 1

    ECHO Location - %DISTROOT%\%INSTALLERNAME%
    ECHO Installer generated successfully.

    CD %WD%
    EXIT /B 0

:GENERATE_SBOM
    ECHO Generating SBOM...
    CALL syft "%BUILDROOT%" -o cyclonedx-json > "%BUILDROOT%\sbom.json"

    EXIT /B 0

:VERIFY_SIGNATURE
    IF "%PGADMIN_WINDOWS_CSC%" == "" (
        ECHO Skipping signature verification ^(PGADMIN_WINDOWS_CSC is not set^)...
        EXIT /B 0
    )

    ECHO Verifying the installer signature...

    CALL "%PGADMIN_SIGNTOOL_DIR%\signtool.exe" verify /pa /v "%DISTROOT%\%INSTALLERNAME%"
    REM PAUSE was the old handler here, which on the signing host either returns
    REM immediately, leaving the build to carry on with an unverified installer,
    REM or blocks until the job times out. There is nobody at that machine to
    REM press a key.
    IF ERRORLEVEL 1 (
        ECHO.
        ECHO ************************************************************
        ECHO * Failed to verify signature of the installer
        ECHO ************************************************************
        EXIT /B 1
    )

    EXIT /B 0


:USAGE
    ECHO Invalid command line options.
    ECHO Usage: "Make.bat [clean]"
    ECHO.

    EXIT /B 1

:CHECK_ROBOCOPY_ERROR
    IF %ERRORLEVEL% GEQ 8 EXIT /B %ERRORLEVEL%
    EXIT /B 0
