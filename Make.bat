@ECHO off
SETLOCAL

SET WD=%CD%
SET "BUILDROOT=%WD%\win-build"
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

set "ARCHITECTURE=x64"
if "%Platform%" == "X86" (
    set "ARCHITECTURE=x86"
)

REM Main build sequence
CALL :SET_ENVIRONMENT
CALL :VALIDATE_ENVIRONMENT || EXIT /B 1
CALL :CLEAN || EXIT /B 1
CALL :CREATE_VIRTUAL_ENV || EXIT /B 1
CALL :CREATE_RUNTIME_ENV || EXIT /B 1
CALL :CREATE_PYTHON_ENV || EXIT /B 1
CALL :CLEANUP_ENV || EXIT /B 1
CALL :CREATE_INSTALLER || EXIT /B 1
CALL :SIGN_INSTALLER || EXIT /B 1

EXIT /B %ERRORLEVEL%
REM Main build sequence Ends


:CLEAN
    ECHO Removing build directory...
    IF EXIST "%BUILDROOT%" RD "%BUILDROOT%" /S /Q > nul || EXIT /B 1

    ECHO Removing temp build directory...
    IF EXIST "%WD%\pkg\win32\Output" rd "%WD%\pkg\win32\Output" /S /Q > nul || EXIT /B 1

    ECHO Removing installer configuration script...
    IF EXIST DEL /q "%WD%\pkg\win32\installer.iss" > nul || EXIT /B 1

    EXIT /B 0


:SET_ENVIRONMENT
    ECHO Configuring the environment...
    IF "%PGADMIN_PYTHON_DIR%" == ""   SET "PGADMIN_PYTHON_DIR=C:\Python38"
    IF "%PGADMIN_QT_DIR%" == ""       SET "PGADMIN_QT_DIR=C:\Qt\5.14.2\msvc2017_64"
    IF "%PGADMIN_POSTGRES_DIR%" == "" SET "PGADMIN_POSTGRES_DIR=C:\Program Files (x86)\PostgreSQL\12"
    IF "%PGADMIN_INNOTOOL_DIR%" == "" SET "PGADMIN_INNOTOOL_DIR=C:\Program Files (x86)\Inno Setup 6"
    IF "%PGADMIN_VCREDIST_DIR%" == "" SET "PGADMIN_VCREDIST_DIR=C:\Program Files (x86)\Microsoft Visual Studio\2017\Professional\VC\Redist\MSVC\14.16.27012"
    IF "%PGADMIN_SIGNTOOL_DIR%" == "" SET "PGADMIN_SIGNTOOL_DIR=C:\Program Files (x86)\Windows Kits\10\bin\10.0.17763.0\x64"

    REM Set REDIST_NAME (the filename)
    set "VCREDIST_FILE=vcredist_%ARCHITECTURE%.exe"

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
    SET INSTALLERNAME=%APP_SHORTNAME%-%APP_MAJOR%.%APP_MINOR%-%APP_VERSION_SUFFIX%-%ARCHITECTURE%.exe
    IF "%APP_VERSION_SUFFIX%" == "" SET INSTALLERNAME=%APP_SHORTNAME%-%APP_MAJOR%.%APP_MINOR%-%ARCHITECTURE%.exe

    REM get Python version for the runtime build ex. 2.7.1 will be 27
    FOR /f "tokens=1 DELims=." %%G IN ('%PGADMIN_PYTHON_DIR%/python.exe -c "import sys; print(sys.version.split(' ')[0])"') DO SET PYTHON_MAJOR=%%G
    FOR /f "tokens=2 DELims=." %%G IN ('%PGADMIN_PYTHON_DIR%/python.exe -c "import sys; print(sys.version.split(' ')[0])"') DO SET PYTHON_MINOR=%%G
    SET "PYTHON_VERSION=%PYTHON_MAJOR%%PYTHON_MINOR%"

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
    ECHO Python DLL:                %PGADMIN_PYTHON_DIR%\Python%PYTHON_VERSION%.dll
    ECHO Python version:            %PYTHON_MAJOR%.%PYTHON_MINOR%
    ECHO.
    ECHO Qt directory:              %PGADMIN_QT_DIR%
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

    IF NOT EXIST "%PGADMIN_QT_DIR%" (
        ECHO !PGADMIN_QT_DIR! does not exist.
        ECHO Please install Qt and set the PGADMIN_QT_DIR environment variable.
        EXIT /B 1
    )

    IF NOT EXIST "%PGADMIN_QT_DIR%\bin\qmake.exe" (
        ECHO !QMAKE! does not exist.
        ECHO Please install Qt and set the PGADMIN_QT_DIR environment variable.
        EXIT /B 1
    )

    IF NOT EXIST "%PGADMIN_PYTHON_DIR%" (
        ECHO !PGADMIN_PYTHON_DIR! does not exist.
        ECHO Please install Python and set the PGADMIN_PYTHON_DIR environment variable.
        EXIT /B 1
    )

    IF NOT EXIST "%PGADMIN_PYTHON_DIR%\Python%PYTHON_VERSION%.dll" (
        ECHO !PGADMIN_PYTHON_DIR!\Python!PYTHON_VERSION!.dll does not exist.
        ECHO Please check your Python installation is complete.
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
    IF NOT EXIST "%BUILDROOT%"  MKDIR "%BUILDROOT%"
    
    CD "%BUILDROOT%"

    REM Note that we must use virtualenv.exe here, as the venv module doesn't allow python.exe to relocate.
    "%PGADMIN_PYTHON_DIR%\Scripts\virtualenv.exe" venv

    XCOPY /S /I /E /H /Y "%PGADMIN_PYTHON_DIR%\DLLs" "%BUILDROOT%\venv\DLLs" > nul || EXIT /B 1
    XCOPY /S /I /E /H /Y "%PGADMIN_PYTHON_DIR%\Lib" "%BUILDROOT%\venv\Lib" > nul || EXIT /B 1

    ECHO Activating virtual environment -  %BUILDROOT%\venv...
    CALL "%BUILDROOT%\venv\Scripts\activate" || EXIT /B 1

    ECHO Installing dependencies...
    CALL pip install -r "%WD%\requirements.txt" || EXIT /B 1
    CALL pip install sphinx || EXIT /B 1

    REM If this is Python 3.6+, we need to remove the hack above or it will break qmake. Sigh.
    IF %PYTHON_VERSION% GEQ 36 SET CL=

    CD %WD%
    EXIT /B 0


:CREATE_RUNTIME_ENV
    MKDIR "%BUILDROOT%\runtime"

    CD "%WD%\web"

    ECHO Installing javascript dependencies...
    CALL yarn install || EXIT /B 1

    ECHO Bundling javascript...
    CALL yarn run bundle || EXIT /B 1

    ECHO Removing webpack caches...
    RD /Q /S "%WD%\web\pgadmin\static\js\generated\.cache" 1> nul 2>&1

    ECHO Copying web directory...
    XCOPY /S /I /E /H /Y "%WD%\web" "%BUILDROOT%\web" > nul || EXIT /B 1

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
    MKDIR "%BUILDROOT%\docs\en_US\html"
    CD "%WD%\docs\en_US"
    CALL "%BUILDROOT%\venv\Scripts\python.exe" build_code_snippet.py || EXIT /B 1
    CALL "%BUILDROOT%\venv\Scripts\sphinx-build.exe"   "%WD%\docs\en_US" "%BUILDROOT%\docs\en_US\html" || EXIT /B 1

    ECHO Removing Sphinx
    CALL pip uninstall -y sphinx Pygments alabaster colorama docutils imagesize requests snowballstemmer

    ECHO Assembling runtime environment...
    CD "%WD%\runtime"

    ECHO Running qmake...
    CALL set "PGADMIN_PYTHON_DIR=%PGADMIN_PYTHON_DIR%" && "%PGADMIN_QT_DIR%\bin\qmake.exe" || EXIT /B 1

    ECHO Cleaning the build directory...
    CALL nmake clean || EXIT /B 1

    ECHO Running make...
    CALL nmake || EXIT /B 1

    ECHO Staging pgAdmin4.exe...
    COPY "%WD%\runtime\release\pgAdmin4.exe" "%BUILDROOT%\runtime" > nul || EXIT /B 1

    ECHO Staging Qt components...
    COPY "%PGADMIN_QT_DIR%\bin\Qt5Core.dll"   "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_QT_DIR%\bin\Qt5Gui.dll"    "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_QT_DIR%\bin\Qt5Widgets.dll" "%BUILDROOT%\runtime" > nul  || EXIT /B 1
    COPY "%PGADMIN_QT_DIR%\bin\Qt5Network.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY "%PGADMIN_QT_DIR%\bin\Qt5Svg.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    MKDIR "%BUILDROOT%\runtime\platforms" > nul || EXIT /B 1
    COPY "%PGADMIN_QT_DIR%\plugins\platforms\qwindows.dll" "%BUILDROOT%\runtime\platforms" > nul || EXIT /B 1
    MKDIR "%BUILDROOT%\runtime\imageformats" > nul || EXIT /B 1
    COPY "%PGADMIN_QT_DIR%\plugins\imageformats\qsvg.dll" "%BUILDROOT%\runtime\imageformats" > nul || EXIT /B 1
    ECHO [Paths] > "%BUILDROOT%\runtime\qt.conf"
    ECHO Plugins=plugins >> "%BUILDROOT%\runtime\qt.conf"

    ECHO Staging PostgreSQL components...
    COPY "%PGADMIN_POSTGRES_DIR%\bin\libpq.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    IF "%ARCHITECTURE%" == "x64" (
        COPY "%PGADMIN_POSTGRES_DIR%\bin\libcrypto-1_1-x64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
        COPY "%PGADMIN_POSTGRES_DIR%\bin\libssl-1_1-x64.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    ) ELSE (
        COPY "%PGADMIN_POSTGRES_DIR%\bin\libcrypto-1_1.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
        COPY "%PGADMIN_POSTGRES_DIR%\bin\libssl-1_1.dll" "%BUILDROOT%\runtime" > nul || EXIT /B 1
    )
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
    

:CREATE_PYTHON_ENV
    ECHO Staging Python...
    COPY %PGADMIN_PYTHON_DIR%\python%PYTHON_VERSION%.dll "%BUILDROOT%\runtime"  > nul || EXIT /B 1
    COPY %PGADMIN_PYTHON_DIR%\python.exe "%BUILDROOT%\runtime" > nul || EXIT /B 1
    COPY %PGADMIN_PYTHON_DIR%\pythonw.exe "%BUILDROOT%\runtime" > nul || EXIT /B 1

    ECHO Cleaning up unnecessary .pyc and .pyo files...
    FOR /R "%BUILDROOT%\venv" %%f in (*.pyc *.pyo) do DEL /q "%%f" 1> nul 2>&1
    ECHO Removing tests...
    FOR /R "%BUILDROOT%\venv\Lib" %%f in (test tests) do RD /Q /S "%%f" 1> nul 2>&1
    ECHO Removing TCL...
    RD /Q /S "%BUILDROOT%\venv\tcl" 1> nul 2>&1

    EXIT /B 0


:CREATE_INSTALLER
    ECHO Preparing for creation of windows installer...
    IF NOT EXIST "%DISTROOT%" MKDIR "%DISTROOT%"

    ECHO Copying icon file...
    COPY "%WD%\pkg\win32\Resources\pgAdmin4.ico" "%BUILDROOT%" > nul || EXIT /B 1

    CD "%WD%\pkg\win32"

    ECHO Processing installer configuration script...
    CALL "%PGADMIN_PYTHON_DIR%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in" "-o" "%WD%\pkg\win32\installer.iss.in_stage1" "-s" MYAPP_NAME -r """%APP_NAME%"""
    CALL "%PGADMIN_PYTHON_DIR%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage1" "-o" "%WD%\pkg\win32\installer.iss.in_stage2" "-s" MYAPP_FULLVERSION -r """%APP_VERSION%"""
    CALL "%PGADMIN_PYTHON_DIR%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage2" "-o" "%WD%\pkg\win32\installer.iss.in_stage3" "-s" MYAPP_VERSION -r """v%APP_MAJOR%"""

    SET ARCMODE=
    IF "%ARCHITECTURE%" == "x64" (
        set ARCMODE="x64"
    )
    CALL "%PGADMIN_PYTHON_DIR%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage3" "-o" "%WD%\pkg\win32\installer.iss.in_stage4" "-s" MYAPP_ARCHITECTURESMODE -r """%ARCMODE%"""
    CALL "%PGADMIN_PYTHON_DIR%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage4" "-o" "%WD%\pkg\win32\installer.iss" "-s" MYAPP_VCDIST -r """%PGADMIN_VCREDIST_DIRNAME%\%VCREDIST_FILE%"""

    ECHO Cleaning up...
    DEL /s "%WD%\pkg\win32\installer.iss.in_stage*" > nul

    ECHO Creating windows installer using INNO tool...
    CALL "%PGADMIN_INNOTOOL_DIR%\ISCC.exe" /q "%WD%\pkg\win32\installer.iss" || EXIT /B 1

    ECHO Renaming installer...
    MOVE "%WD%\pkg\win32\Output\Setup.exe" "%DISTROOT%\%INSTALLERNAME%" > nul || EXIT /B 1

    ECHO Location - %DISTROOT%\%INSTALLERNAME%
    ECHO Installer generated successfully.

    CD %WD%
    EXIT /B 0


:SIGN_INSTALLER
    ECHO Attempting to sign the installer...
    CALL "%PGADMIN_SIGNTOOL_DIR%\signtool.exe" sign  /t http://timestamp.verisign.com/scripts/timstamp.dll "%DISTROOT%\%INSTALLERNAME%"
    IF %ERRORLEVEL% NEQ 0 (
        ECHO.
        ECHO ************************************************************
        ECHO * Failed to sign the installer
        ECHO ************************************************************
        PAUSE
    )

    EXIT /B 0


:CLEANUP_ENV
    ECHO Cleaning the build environment...
    RD "%BUILDROOT%\venv\Include" /S /Q 1> nul 2>&1
    DEL /s "%BUILDROOT%\venv\pip-selfcheck.json" 1> nul 2>&1

    EXIT /B 0


:USAGE
    ECHO Invalid command line options.
    ECHO Usage: "Make.bat [clean]"
    ECHO.

    EXIT /B 1

