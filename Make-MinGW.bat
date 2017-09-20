@ECHO off
SETLOCAL
REM
REM ****************************************************************
SET WD=%CD%
SET "PGBUILDPATH=%WD%\win-build"
SET CMDOPTION=""
IF "%1" == "clean"  SET CMDOPTION="VALID"
IF "%1" == "x86"    SET CMDOPTION="VALID"

IF NOT %CMDOPTION%=="VALID"  ( GOTO USAGE )
SET ARCHITECTURE=%1

IF "%ARCHITECTURE%"=="clean" (
    GOTO CLEAN_RELEASE
    GOTO EXIT
)

REM Main Functions

CALL :SET_PGADMIN4_ENVIRONMENT
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

CALL :VALIDATE_ENVIRONMENT

CALL :CLEAN_RELEASE

CALL :CREATE_VIRTUAL_ENV
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

CALL :CREATE_RUNTIME_ENV
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

CALL :CREATE_PYTHON_ENV
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

CALL :CLEANUP_ENV
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

CALL :CREATE_INSTALLER
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

CALL :SIGN_INSTALLER
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

CD %WD%
GOTO EXIT
REM Main function Ends

:CLEAN_RELEASE
    ECHO Calling clean target...
    IF EXIST "%PGBUILDPATH%" rd "%PGBUILDPATH%" /S /Q

    FOR /R "%WD%" %%f in (*.pyc *.pyo) do DEL /q "%%f" > nul
    IF EXIST "%WD%\pkg\win32\Output" rd "%WD%\pkg\win32\Output" /S /Q
    IF EXIST DEL /q "%WD%\pkg\win32\installer.iss" > nul
    CD %WD%
    GOTO:eof

:SET_PGADMIN4_ENVIRONMENT
    IF "%PYTHON_HOME%" == ""   SET "PYTHON_HOME=C:\Python27"
    IF "%PYTHON_DLL%" == ""    SET "PYTHON_DLL=C:\Windows\SysWOW64\python27.dll"
    IF "%QTDIR%" == ""         SET "QTDIR=C:\Qt\5.8\mingw53_32"
    IF "%PGDIR%" == ""         SET "PGDIR=C:\Program Files (x86)\PostgreSQL\9.6"
    IF "%INNOTOOL%" == ""      SET "INNOTOOL=C:\Program Files (x86)\Inno Setup 5"
    IF "%VCDIR%" == ""         SET "VCDIR=C:\Program Files (x86)\Microsoft Visual Studio 12.0\VC"
    IF "%VCREDIST%" == ""      SET "VCREDIST=C:\Program Files (x86)\Microsoft Visual Studio 12.0\VC\redist\1033\vcredist_x86.exe"
    IF "%SIGNTOOL%" == ""      SET "SIGNTOOL=C:\Program Files\Microsoft SDKs\Windows\v7.1A\Bin\signtool.exe"
    SET "VCREDISTNAME=vcredist_x86.exe"

    GOTO:eof

:VALIDATE_ENVIRONMENT
    REM SET the variables IF not availalbe in windows environment
    SET "QMAKE=%QTDIR%\bin\qmake.exe"
    SET "VIRTUALENV=venv"
    SET "TARGETINSTALLER=%WD%\dist"
    SET "VCREDIST=%VCDIR%\redist\1033\%VCREDISTNAME%"

    FOR /F "tokens=3" %%a IN ('findstr /C:"APP_RELEASE =" %WD%\web\config.py')    DO SET APP_RELEASE=%%a
    FOR /F "tokens=3" %%a IN ('findstr /C:"APP_REVISION =" %WD%\web\config.py')   DO SET APP_REVISION_VERSION=%%a
    FOR /F "tokens=3" %%a IN ('findstr /C:"APP_SUFFIX =" %WD%\web\config.py')     DO SET APP_SUFFIX_VERSION=%%a
    REM remove single quote from the string
    SET APP_SUFFIX_VERSION=%APP_SUFFIX_VERSION:'=%
    SET APP_NAME=""
    FOR /F "tokens=2* DELims='" %%a IN ('findstr /C:"APP_NAME =" web\config.py')   DO SET APP_NAME=%%a
    FOR /f "tokens=1 DELims=." %%G IN ('%PYTHON_HOME%/python.exe -c "print('%APP_NAME%'.lower().replace(' ', ''))"') DO SET APP_SHORTNAME=%%G
    FOR /F "tokens=4,5 delims=. " %%a IN ('%QMAKE% -v ^| findstr /B /C:"Using Qt version "') DO SET QT_VERSION=%%a.%%b
    
    SET INSTALLERNAME=%APP_SHORTNAME%-%APP_RELEASE%.%APP_REVISION_VERSION%-%APP_SUFFIX_VERSION%-%ARCHITECTURE%.exe
    IF "%APP_SUFFIX_VERSION%" == "" SET INSTALLERNAME=%APP_SHORTNAME%-%APP_RELEASE%.%APP_REVISION_VERSION%-%ARCHITECTURE%.exe

    SET PGADMIN4_VERSION=v%APP_RELEASE%
    SET PGADMIN4_APP_VERSION=%APP_RELEASE%.%APP_REVISION_VERSION%

    ECHO ****************************************************************
    ECHO                        S U M M A R Y
    ECHO ****************************************************************
    ECHO Target mode = x86
    ECHO INNOTOOL    = %INNOTOOL%
    ECHO VCDIR       = %VCDIR%
    ECHO VCDIST      = %VCREDIST%
    ECHO SIGNTOOL    = %SIGNTOOL%
    ECHO QTDIR       = %QTDIR%
    ECHO QMAKE       = %QMAKE%
    ECHO QT_VERSION  = %QT_VERSION%
    ECHO BROWSER     = QtWebKit
    ECHO PYTHON_HOME = %PYTHON_HOME%
    ECHO PYTHON_DLL  = %PYTHON_DLL%
    ECHO PGDIR       = %PGDIR%
    ECHO ****************************************************************

    REM Check IF path SET in enviroments really exist or not ?
    IF NOT EXIST "%INNOTOOL%"          GOTO err_handle_inno
    IF NOT EXIST "%VCDIR%"             GOTO err_handle_visualstudio
    IF NOT EXIST "%VCREDIST%"          GOTO err_handle_visualstudio_dist
    IF NOT EXIST "%QTDIR%"             GOTO err_handle_qt
    IF NOT EXIST "%QMAKE%"             GOTO err_handle_qt
    IF NOT EXIST "%PYTHON_HOME%"       GOTO err_handle_python
    IF NOT EXIST "%PYTHON_DLL%"        GOTO err_handle_python
    IF NOT EXIST "%PGDIR%"             GOTO err_handle_pg

    REM get Python version ex. 2.7.1 will get as 27
    FOR /f "tokens=1 DELims=." %%G IN ('%PYTHON_HOME%/python.exe -c "import sys; print(sys.version.split(' ')[0])"') DO SET PYTHON_MAJOR=%%G
    FOR /f "tokens=2 DELims=." %%G IN ('%PYTHON_HOME%/python.exe -c "import sys; print(sys.version.split(' ')[0])"') DO SET PYTHON_MINOR=%%G
    SET "PYTHON_VERSION=%PYTHON_MAJOR%%PYTHON_MINOR%"

    IF NOT EXIST "%PYTHON_HOME%\Scripts\virtualenv.exe" GOTO err_handle_pythonvirtualenv

    SET PATH=%PGDIR%;%PGDIR%\bin;%PATH%

    GOTO:eof

:CREATE_VIRTUAL_ENV
    ECHO Creating Virtual Enviroment...
    IF NOT EXIST "%PGBUILDPATH%"  MKDIR "%PGBUILDPATH%"

    CD "%PGBUILDPATH%"
    "%PYTHON_HOME%\Scripts\virtualenv.exe" "%VIRTUALENV%"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    ECHO Activating Virtual Enviroment -  %PGBUILDPATH%\%VIRTUALENV%\Scripts\activate...
    CALL "%PGBUILDPATH%\%VIRTUALENV%\Scripts\activate"
    SET PATH=%PGDIR%\bin;%PATH%

    ECHO Installing dependencies...
    pip install -r "%WD%\requirements.txt"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    pip install sphinx
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    ECHO Virtual Environment created successfully.

    ECHO Deactivating Virtual Enviroment - %PGBUILDPATH%\%VIRTUALENV%\Scripts\deactivate...
    CALL "%PGBUILDPATH%\%VIRTUALENV%\Scripts\deactivate"

    CD %WD%
    GOTO:eof

:CREATE_RUNTIME_ENV
    ECHO Compiling source code...
    MKDIR "%PGBUILDPATH%\runtime" > nul

    REM --- Processing WEB ---
    CD "%WD%\web"

    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    ECHO Install Javascript dependencies
    call yarn install
    ECHO Bundle all Javascript
    call yarn run bundle:prod

    XCOPY /S /I /E /H /Y "%WD%\web" "%PGBUILDPATH%\web" > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    REM Clean up .pyc, .pyo, pgadmin4.db, config_local.py
    ECHO Cleaning up unnecessary files...
    FOR /R "%PGBUILDPATH%\web" %%f in (*.pyc *.pyo) do DEL /q "%%f"
    FOR /R "%PGBUILDPATH%\web" %%f in (tests feature_tests __pycache__ node_modules) do RD /Q /S "%%f"
    RD /Q /S "%PGBUILDPATH%\web\regression"
    RD /Q /S "%PGBUILDPATH%\web\tools"
    DEL /q "%PGBUILDPATH%\web\pgadmin4.db"
    DEL /q "%PGBUILDPATH%\web\config_local.py"
    
    ECHO Creating config_distro.py
    ECHO SERVER_MODE = False > "%PGBUILDPATH%\web\config_distro.py"
    ECHO HELP_PATH = '../../../docs/en_US/html/' >> "%PGBUILDPATH%\web\config_distro.py"
    ECHO DEFAULT_BINARY_PATHS = { >> "%PGBUILDPATH%\web\config_distro.py"
    ECHO     'pg':   '$DIR/../runtime', >> "%PGBUILDPATH%\web\config_distro.py"
    ECHO     'ppas': '' >> "%PGBUILDPATH%\web\config_distro.py"
    ECHO } >> "%PGBUILDPATH%\web\config_distro.py"

    ECHO Activating Virtual Enviroment -  %PGBUILDPATH%\%VIRTUALENV%\Scripts\activate...
    CALL "%PGBUILDPATH%\%VIRTUALENV%\Scripts\activate"

    ECHO Building docs...
    MKDIR "%PGBUILDPATH%\docs\en_US\html"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    CD "%WD%\docs\en_US"
    "%PGBUILDPATH%\%VIRTUALENV%\Scripts\python.exe" build_code_snippet.py
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    "%PGBUILDPATH%\%VIRTUALENV%\Scripts\sphinx-build.exe"   "%WD%\docs\en_US" "%PGBUILDPATH%\docs\en_US\html"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    ECHO Removing Sphinx
    pip uninstall -y sphinx Pygments alabaster colorama docutils imagesize requests snowballstemmer

    ECHO Fixing backports.csv - adding missing __init__.py
    type nul >> "%PGBUILDPATH%\%VIRTUALENV%\Lib\site-packages\backports\__init__.py"

    ECHO Assembling runtime environment...
    CD "%WD%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    CALL "%QMAKE%" "DEFINES+=PGADMIN4_USE_WEBKIT"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    CALL mingw32-make.exe clean
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    CALL mingw32-make.exe
    IF ERRORLEVEL 1 GOTO ERR_HANDLER

    REM Copy binary to Release Folder
    copy "%WD%\runtime\release\pgAdmin4.exe" "%PGBUILDPATH%\runtime"
    IF ERRORLEVEL 1 GOTO ERR_HANDLER

    REM Copy QT dependences
    copy "%QTDIR%\bin\Qt5Core.dll"   "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5Sql.dll"    "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5Gui.dll"    "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5Qml.dll"    "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5OpenGL.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5Quick.dll"  "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5Sensors.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5Widgets.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5Network.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5Multimedia.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5WebChannel.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5Positioning.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5PrintSupport.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5MultimediaWidgets.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    IF %QT_VERSION% GEQ 5.9 (
        copy "%QTDIR%\bin\Qt5WebKit.dll" "%PGBUILDPATH%\runtime"
        IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
        copy "%QTDIR%\bin\Qt5WebKitWidgets.dll" "%PGBUILDPATH%\runtime"
        IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    ) ELSE (
        copy "%QTDIR%\bin\libQt5WebKit.dll" "%PGBUILDPATH%\runtime"
        IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
        copy "%QTDIR%\bin\libQt5WebKitWidgets.dll" "%PGBUILDPATH%\runtime"
        IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    )

    copy "%QTDIR%\bin\icudt57.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\icuin57.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\icuuc57.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\libgcc_s_dw2-1.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\libstdc++-6.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\libwinpthread-1.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\libxml2-2.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\libxslt-1.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    MKDIR "%PGBUILDPATH%\runtime\platforms"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\plugins\platforms\qwindows.dll" "%PGBUILDPATH%\runtime\platforms" > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    ECHO [Paths] > "%PGBUILDPATH%\runtime\qt.conf"
    ECHO Plugins=plugins >> "%PGBUILDPATH%\runtime\qt.conf"

    copy "%PGDIR%\bin\libpq.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%PGDIR%\bin\ssleay32.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%PGDIR%\bin\libeay32.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%PGDIR%\bin\libintl-*.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%PGDIR%\bin\libiconv-*.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%PGDIR%\bin\zlib1.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%PGDIR%\bin\pg_dump.exe" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%PGDIR%\bin\pg_dumpall.exe" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%PGDIR%\bin\pg_restore.exe" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%PGDIR%\bin\psql.exe" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    MKDIR "%PGBUILDPATH%\installer"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%VCREDIST%" "%PGBUILDPATH%\installer" > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    ECHO Runtime built successfully.

    CD %WD%
    GOTO:eof

:CREATE_PYTHON_ENV
    copy %PYTHON_DLL% "%PGBUILDPATH%\runtime"  > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    REM Copy Python interpretor as it's needed to run background processes
    copy %PYTHON_HOME%\python.exe "%PGBUILDPATH%\runtime"  > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy %PYTHON_HOME%\pythonw.exe "%PGBUILDPATH%\runtime"  > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    XCOPY /S /I /E /H /Y "%PYTHON_HOME%\DLLs" "%PGBUILDPATH%\%VIRTUALENV%\DLLs" > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    XCOPY /S /I /E /H /Y "%PYTHON_HOME%\Lib" "%PGBUILDPATH%\%VIRTUALENV%\Lib" > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    ECHO Cleaning up unnecessary files...
    FOR /R "%PGBUILDPATH%\%VIRTUALENV%" %%f in (*.pyc *.pyo) do DEL /q "%%f"
    FOR /R "%PGBUILDPATH%\%VIRTUALENV%\Lib" %%f in (test tests) do RD /Q /S "%%f"
    RD /Q /S "%PGBUILDPATH%\%VIRTUALENV%\tcl"

    CD %WD%
    GOTO:eof

:CREATE_INSTALLER
    ECHO Preparing for creation of windows installer...
    IF NOT EXIST "%TARGETINSTALLER%" MKDIR "%TARGETINSTALLER%"

    copy "%WD%\pkg\win32\Resources\pgAdmin4.ico" "%PGBUILDPATH%"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    CD "%WD%"
    CD pkg
    CD win32

    "%PYTHON_HOME%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in" "-o" "%WD%\pkg\win32\installer.iss.in_stage1" "-s" MYAPP_NAME -r """%APP_NAME%"""
    "%PYTHON_HOME%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage1" "-o" "%WD%\pkg\win32\installer.iss.in_stage2" "-s" MYAPP_FULLVERSION -r """%PGADMIN4_APP_VERSION%"""
    "%PYTHON_HOME%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage2" "-o" "%WD%\pkg\win32\installer.iss.in_stage3" "-s" MYAPP_VERSION -r """%PGADMIN4_VERSION%"""

    set ARCMODE=
    IF "%ARCHITECTURE%"=="amd64" (
        set ARCMODE="x64"
    )
    "%PYTHON_HOME%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage3" "-o" "%WD%\pkg\win32\installer.iss.in_stage4" "-s" MYAPP_ARCHITECTURESMODE -r """%ARCMODE%"""
    "%PYTHON_HOME%\python" "%WD%\pkg\win32\replace.py" "-i" "%WD%\pkg\win32\installer.iss.in_stage4" "-o" "%WD%\pkg\win32\installer.iss" "-s" MYAPP_VCDIST -r """%VCREDISTNAME%"""


    DEL /s "%WD%\pkg\win32\installer.iss.in_stage*" > nul
    ECHO Creating windows installer... using INNO tool

    CALL "%INNOTOOL%\ISCC.exe" /q "%WD%\pkg\win32\installer.iss"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    MOVE "%WD%\pkg\win32\Output\Setup.exe" "%TARGETINSTALLER%\%INSTALLERNAME%"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    ECHO "Location - %TARGETINSTALLER%\%INSTALLERNAME%"
    ECHO Installer generated successfully.

    CD %WD%
    GOTO:eof

:SIGN_INSTALLER
    ECHO Attempting to sign the installer...
    "%SIGNTOOL%" sign  /t http://timestamp.verisign.com/scripts/timstamp.dll "%TARGETINSTALLER%\%INSTALLERNAME%"
    IF %ERRORLEVEL% NEQ 0 (
        ECHO
        ECHO ************************************************************
        ECHO * Failed to sign the installer
        ECHO ************************************************************
        PAUSE
    )

    CD %WD%
    GOTO:eof

:CLEANUP_ENV
    ECHO Cleaning up private environment...
    rd "%PGBUILDPATH%\%VIRTUALENV%\Include" /S /Q
    DEL /s "%PGBUILDPATH%\%VIRTUALENV%\pip-selfcheck.json"

    ECHO Cleaned up private environment successfully.
    CD %WD%
    GOTO:eof

:err_handle_inno
    ECHO %INNOTOOL% does not exist
    ECHO Please Install Innotool and SET INNOTOOL enviroment Variable.
    ECHO SET "INNOTOOL=<PATH>"
    exit /B 1
    GOTO EXIT

:err_handle_visualstudio
    ECHO %VCDIR% does not exist
    ECHO Please Install Microsoft Visual studio and SET the VCDIR enviroment Variable.
    ECHO SET "VCDIR=<PATH>"
    exit /B 1
    GOTO EXIT

:err_handle_visualstudio_dist
    ECHO %VCREDIST% does not exist
    ECHO Please Install Microsoft Visual studio and SET the VCDIST enviroment Variable.
    ECHO SET "VCDIST=<PATH>"
    exit /B 1
    GOTO EXIT


:err_handle_python
    ECHO %PYTHON_HOME% does not exist, or
    ECHO PYTHON_VERSION is not SET, or
    ECHO %PYTHON_DLL% does not exist.
    ECHO Please install Python and SET the PYTHON_HOME enviroment Variable.
    ECHO SET "PYTHON_VERSION=<VERSION NUMBER>"
    ECHO SET "PYTHON_HOME=<PATH>"
    ECHO SET "PYTHON_DLL=<PATH>"
    exit /B 1
    GOTO EXIT

:err_handle_qt
    ECHO %QTDIR% does not exist.
    ECHO Please Install QT SDK and SET the QTDIR enviroment variable.
    ECHO SET "QTDIR=<PATH>"
    exit /B 1
    GOTO EXIT

:err_handle_pg
    ECHO %PGDIR% does not exist.
    ECHO Please Install Postgres and SET enviroment Variable
    ECHO SET "PGDIR=<PATH>"
    exit /B 1
    GOTO EXIT

:err_handle_pythonvirtualenv
    ECHO Python virtualenv is missing @ location - %PYTHON_HOME%\Scripts\virtualenv.exe
    exit /B 1
    GOTO EXIT

:ERR_HANDLER
    ECHO.
    ECHO Aborting build!
    CD %WD%
    exit /B 1
    GOTO EXIT

:USAGE
    ECHO Invalid command line options....
    ECHO Usage: "Make.bat <x86 | clean>"
    ECHO.
    exit /B 1
    GOTO EXIT

:EXIT

