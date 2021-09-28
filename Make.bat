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
CALL :SET_ENVIRONMENT
CALL :VALIDATE_ENVIRONMENT || EXIT /B 1
CALL :CLEAN || EXIT /B 1
CALL :CREATE_VIRTUAL_ENV || EXIT /B 1
CALL :CREATE_PYTHON_ENV || EXIT /B 1
CALL :CREATE_RUNTIME_ENV || EXIT /B 1
CALL :CREATE_INSTALLER || EXIT /B 1
CALL :SIGN_INSTALLER || EXIT /B 1

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


:SET_ENVIRONMENT
    ECHO Configuring the environment...
    IF "%PGADMIN_PYTHON_DIR%" == ""   SET "PGADMIN_PYTHON_DIR=C:\Python38"
    IF "%PGADMIN_KRB5_DIR%" == ""     SET "PGADMIN_KRB5_DIR=C:\Program Files\MIT\Kerberos"
    IF "%PGADMIN_POSTGRES_DIR%" == "" SET "PGADMIN_POSTGRES_DIR=C:\Program Files (x86)\PostgreSQL\12"
    IF "%PGADMIN_INNOTOOL_DIR%" == "" SET "PGADMIN_INNOTOOL_DIR=C:\Program Files (x86)\Inno Setup 6"
    IF "%PGADMIN_VCREDIST_DIR%" == "" SET "PGADMIN_VCREDIST_DIR=C:\Program Files (x86)\Microsoft Visual Studio\2017\Professional\VC\Redist\MSVC\14.16.27012"
    IF "%PGADMIN_SIGNTOOL_DIR%" == "" SET "PGADMIN_SIGNTOOL_DIR=C:\Program Files (x86)\Windows Kits\10\bin\10.0.17763.0\x64"

    REM Set REDIST_NAME (the filename)
    set "VCREDIST_FILE=vcredist_x64.exe"

    REM Set additional variables we need
    FOR /F "tokens=3" %%a IN ('findstr /C:"APP_RELEASE =" %WD%\web\config.py')  DO SET APP_MAJOR=%%a
    FOR /F "tokens=3" %%a IN ('findstr /C:"APP_REVISION =" %WD%\web\config.py') DO SET APP_MINOR=%%a
    FOR /F "tokens=3" %%a IN ('findstr /C:"APP_SUFFIX =" %WD%\web\config.py')   DO SET APP_VERSION_SUFFIX=%%a
    REM remove single quote from the string
    SET APP_VERSION_SUFFIX=%APP_VERSION_SUFFIX:'=%
    SET APP_NAME=""
    FOR /F "tokens=2* DELims='" %%a IN ('findstr /C:"APP_NAME =" web\config.py') DO SET APP_NAME=%%a
    FOR /f "tokens=1 DELims=." %%G IN ('%PGADMIN_PYTHON_DIR%/python.exe -c "print('%APP_NAME%'.lower().replace(' ', ''))"') DO SET APP_SHORTNAME=%%G
    SET APP_VERSION=%APP_MAJOR%.%APP_MINOR%
    SET INSTALLERNAME=%APP_SHORTNAME%-%APP_MAJOR%.%APP_MINOR%-%APP_VERSION_SUFFIX%-x64.exe
    IF "%APP_VERSION_SUFFIX%" == "" SET INSTALLERNAME=%APP_SHORTNAME%-%APP_MAJOR%.%APP_MINOR%-x64.exe

    REM get Python version for the runtime build ex. 3.9.2 will be 39
    FOR /f "tokens=1 DELims=." %%G IN ('%PGADMIN_PYTHON_DIR%/python.exe -c "import sys; print(sys.version.split(' ')[0])"') DO SET PYTHON_MAJOR=%%G
    FOR /f "tokens=2 DELims=." %%G IN ('%PGADMIN_PYTHON_DIR%/python.exe -c "import sys; print(sys.version.split(' ')[0])"') DO SET PYTHON_MINOR=%%G
    FOR /f "tokens=3 DELims=." %%G IN ('%PGADMIN_PYTHON_DIR%/python.exe -c "import sys; print(sys.version.split(' ')[0])"') DO SET PYTHON_REVISION=%%G

    EXIT /B 0


:VALIDATE_ENVIRONMENT
    ECHO ****************************************************************
    ECHO * Build summary
    ECHO ****************************************************************
    ECHO Build path:                %BUILDROOT%
    ECHO Output directory:          %DISTROOT%
    ECHO Installer name:            %INSTALLERNAME%
    ECHO.
    ECHO Python directory:          %PGADMIN_PYTHON_DIR%
    ECHO Python version:            %PYTHON_MAJOR%.%PYTHON_MINOR%.%PYTHON_REVISION%
    ECHO.
    ECHO KRB5 directory:            %PGADMIN_KRB5_DIR%
    ECHO PostgreSQL directory:      %PGADMIN_POSTGRES_DIR%
    ECHO.
    ECHO VC++ redist directory:     %PGADMIN_VCREDIST_DIR%
    ECHO VC++ redist file:          %VCREDIST_FILE%
    ECHO InnoTool directory:        %PGADMIN_INNOTOOL_DIR%
    ECHO signtool directory:        %PGADMIN_SIGNTOOL_DIR%
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

    IF NOT EXIST "%PGADMIN_PYTHON_DIR%" (
        ECHO !PGADMIN_PYTHON_DIR! does not exist.
        ECHO Please install Python and set the PGADMIN_PYTHON_DIR environment variable.
        EXIT /B 1
    )

    IF NOT EXIST "%PGADMIN_POSTGRES_DIR%" (
        ECHO !PGADMIN_POSTGRES_DIR! does not exist.
        ECHO Please install PostgreSQL and set the PGADMIN_POSTGRES_DIR environment variable.
        EXIT /B 1
    )

    IF NOT EXIST "%PGADMIN_PYTHON_DIR%\Scripts\virtualenv.exe" (
        ECHO !PGADMIN_PYTHON_DIR!\Scripts\virtualenv.exe does not exist.
        ECHO Please install the virtualenv package in Python.
        EXIT /B 1
    )

    SET "PATH=%PGADMIN_POSTGRES_DIR%\bin;%PATH%"

    EXIT /B 0


:CREATE_VIRTUAL_ENV
    ECHO Creating virtual environment...
    IF NOT EXIST "%TMPDIR%"  MKDIR "%TMPDIR%"

    CD "%TMPDIR%"

    REM Note that we must use virtualenv.exe here, as the venv module doesn't allow python.exe to relocate.
    "%PGADMIN_PYTHON_DIR%\Scripts\virtualenv.exe" venv

    XCOPY /S /I /E /H /Y "%PGADMIN_PYTHON_DIR%\DLLs" "%TMPDIR%\venv\DLLs" > nul || EXIT /B 1
    XCOPY /S /I /E /H /Y "%PGADMIN_PYTHON_DIR%\Lib" "%TMPDIR%\venv\Lib" > nul || EXIT /B 1

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

    ECHO Downloading embedded Python...
    REM Get the python embeddable and extract it to %BUILDROOT%\python
    CD "%TMPDIR%
    %PGADMIN_PYTHON_DIR%\python -c "import sys; from urllib.request import urlretrieve; urlretrieve('https://www.python.org/ftp/python/' + sys.version.split(' ')[0] + '/python-' + sys.version.split(' ')[0] + '-embed-amd64.zip', 'python-embedded.zip')" || EXIT /B 1
    %PGADMIN_PYTHON_DIR%\python -c "import zipfile; z = zipfile.ZipFile('python-embedded.zip', 'r'); z.extractall('../win-build/python/')" || EXIT /B 1

    ECHO Copying site-packages...
    XCOPY /S /I /E /H /Y "%TMPDIR%\venv\Lib\site-packages" "%BUILDROOT%\python\Lib\site-packages" > nul || EXIT /B 1

    REM NOTE: There is intentionally no space after "site" in the line below, to prevent Python barfing if there's one in the file
    ECHO import site>> "%BUILDROOT%\python\python%PYTHON_MAJOR%%PYTHON_MINOR%._pth"

    ECHO Staging Kerberos components...
    COPY "%PGADMIN_KRB5_DIR%\bin\kinit.exe" "%BUILDROOT%\python" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\krb5_64.dll" "%BUILDROOT%\python" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\comerr64.dll" "%BUILDROOT%\python" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\k5sprt64.dll" "%BUILDROOT%\python" > nul || EXIT /B 1
    COPY "%PGADMIN_KRB5_DIR%\bin\gssapi64.dll" "%BUILDROOT%\python" > nul || EXIT /B 1

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
    XCOPY /S /I /E /H /Y "%WD%\web" "%BUILDROOT%\web" > nul || EXIT /B 1

    ECHO Installing javascript dependencies...
    CD "%BUILDROOT%\web"
    CALL yarn install || EXIT /B 1

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
    ECHO Removing any existing configurations...
    DEL /q "%BUILDROOT%\web\pgadmin4.db" 1> nul 2>&1
    DEL /q "%BUILDROOT%\web\config_local.py" 1> nul 2>&1

    ECHO Staging license files...
    COPY "%WD%\LICENSE" "%BUILDROOT%\" > nul || EXIT /B 1
    COPY "%WD%\DEPENDENCIES" "%BUILDROOT%\" > nul || EXIT /B 1

    ECHO Creating config_distro.py
    ECHO SERVER_MODE = False > "%BUILDROOT%\web\config_distro.py"
    ECHO HELP_PATH = '../../../docs/en_US/html/' >> "%BUILDROOT%\web\config_distro.py"
    ECHO DEFAULT_BINARY_PATHS = { >> "%BUILDROOT%\web\config_distro.py"
    ECHO     'pg':   '$DIR/../runtime', >> "%BUILDROOT%\web\config_distro.py"
    ECHO     'ppas': '' >> "%BUILDROOT%\web\config_distro.py"
    ECHO } >> "%BUILDROOT%\web\config_distro.py"

    ECHO Building docs...
    CALL pip install sphinx || EXIT /B 1
    MKDIR "%BUILDROOT%\docs\en_US\html"
    CD "%WD%\docs\en_US"
    CALL "%TMPDIR%\venv\Scripts\python.exe" build_code_snippet.py || EXIT /B 1
    CALL "%TMPDIR%\venv\Scripts\sphinx-build.exe" "%WD%\docs\en_US" "%BUILDROOT%\docs\en_US\html" || EXIT /B 1

    REM Remove unnecessary doc files
    DEL /q "%BUILDROOT%\docs\en_US\html\_static\*.png" 1> nul 2>&1
    RD /Q /S "%BUILDROOT%\docs\en_US\html\_sources" 1> nul 2>&1

    ECHO Staging runtime components...
    XCOPY /S /I /E /H /Y "%WD%\runtime\assets" "%BUILDROOT%\runtime\assets" > nul || EXIT /B 1
    XCOPY /S /I /E /H /Y "%WD%\runtime\src" "%BUILDROOT%\runtime\src" > nul || EXIT /B 1

    COPY "%WD%\runtime\package.json" "%BUILDROOT%\runtime\" > nul || EXIT /B 1
    CD "%BUILDROOT%\runtime\"
    CALL yarn install --production=true || EXIT /B 1

    ECHO Downloading NWjs to %TMPDIR%...
    REM Get a fresh copy of nwjs.
    REM NOTE: The nw download servers seem to be very unreliable, so at the moment we're using wget which retries

    REM YARN
    REM CALL yarn --cwd "%TMPDIR%" add nw || EXIT /B
    REM YARN END

    REM WGET
    REM Comment out the below for loop as the latest version (0.57.0) having
    REM some problem, so for the time being hardcoded the version to 0.55.0
    REM FOR /f "tokens=2 delims='" %%i IN ('yarn info nw ^| findstr "latest: "') DO SET "NW_VERSION=%%i"
    REM :GET_NW
    REM    wget https://dl.nwjs.io/v%NW_VERSION%/nwjs-v%NW_VERSION%-win-x64.zip -O "%TMPDIR%\nwjs-v%NW_VERSION%-win-x64.zip"
    REM    IF %ERRORLEVEL% NEQ 0 GOTO GET_NW

    REM tar -C "%TMPDIR%" -xvf "%TMPDIR%\nwjs-v%NW_VERSION%-win-x64.zip" || EXIT /B 1

    SET "NW_VERSION=0.55.0"
    wget https://dl.nwjs.io/v%NW_VERSION%/nwjs-v%NW_VERSION%-win-x64.zip -O "%TMPDIR%\nwjs-v%NW_VERSION%-win-x64.zip"
    tar -C "%TMPDIR%" -xvf "%TMPDIR%\nwjs-v%NW_VERSION%-win-x64.zip" || EXIT /B 1
    REM WGET END

    REM YARN
    REM XCOPY /S /I /E /H /Y "%TMPDIR%\node_modules\nw\nwjs\*" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    REM YARN END

    REM WGET
    XCOPY /S /I /E /H /Y "%TMPDIR%\nwjs-v%NW_VERSION%-win-x64\*" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    REM WGET END

    MOVE "%BUILDROOT%\runtime\nw.exe" "%BUILDROOT%\runtime\pgAdmin4.exe"

    ECHO Replacing executable icon...
    CALL yarn --cwd "%TMPDIR%" add winresourcer || EXIT /B
    "%TMPDIR%\node_modules\winresourcer\bin\Resourcer.exe" -op:upd -src:"%BUILDROOT%\runtime\pgAdmin4.exe" -type:Icongroup -name:IDR_MAINFRAME -file:"%WD%\pkg\win32\Resources\pgAdmin4.ico"

    ECHO Staging PostgreSQL components...
    COPY "%PGADMIN_POSTGRES_DIR%\bin\libpq.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\libcrypto-1_1-x64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\libssl-1_1-x64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    IF EXIST "%PGADMIN_POSTGRES_DIR%\bin\libintl-*.dll" COPY "%PGADMIN_POSTGRES_DIR%\bin\libintl-*.dll" "%BUILDROOT%\runtime" > nul
    IF EXIST "%PGADMIN_POSTGRES_DIR%\bin\libiconv-*.dll" COPY "%PGADMIN_POSTGRES_DIR%\bin\libiconv-*.dll" "%BUILDROOT%\runtime" > nul
    COPY "%PGADMIN_POSTGRES_DIR%\bin\zlib.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\pg_dump.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\pg_dumpall.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1L%
    COPY "%PGADMIN_POSTGRES_DIR%\bin\pg_restore.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_POSTGRES_DIR%\bin\psql.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1

    ECHO Staging VC++ runtime...
    MKDIR "%BUILDROOT%\installer" || EXIT /B 1
    COPY "%PGADMIN_VCREDIST_DIR%\%VCREDIST_FILE%" "%BUILDROOT%\installer" > nul || EXIT /B 1

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
    CALL "%PGADMIN_PYTHON_DIR%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage2" "-o" "%WD%\pkg\win32\installer.iss" "-s" MYAPP_VCDIST -r """%PGADMIN_VCREDIST_DIRNAME%\%VCREDIST_FILE%"""

    ECHO Cleaning up...
    DEL /s "%WD%\pkg\win32\installer.iss.in_stage*" > nul

    ECHO Creating windows installer using INNO tool...
    CALL "%PGADMIN_INNOTOOL_DIR%\ISCC.exe" /q "%WD%\pkg\win32\installer.iss" || EXIT /B 1

    ECHO Renaming installer...
    MOVE "%WD%\pkg\win32\Output\pgadmin4-setup.exe" "%DISTROOT%\%INSTALLERNAME%" > nul || EXIT /B 1

    ECHO Location - %DISTROOT%\%INSTALLERNAME%
    ECHO Installer generated successfully.

    CD %WD%
    EXIT /B 0


:SIGN_INSTALLER
    ECHO Attempting to sign the installer...
    CALL "%PGADMIN_SIGNTOOL_DIR%\signtool.exe" sign /t http://time.certum.pl "%DISTROOT%\%INSTALLERNAME%"
    IF %ERRORLEVEL% NEQ 0 (
        ECHO.
        ECHO ************************************************************
        ECHO * Failed to sign the installer
        ECHO ************************************************************
        PAUSE
    )

    EXIT /B 0


:USAGE
    ECHO Invalid command line options.
    ECHO Usage: "Make.bat [clean]"
    ECHO.

    EXIT /B 1

