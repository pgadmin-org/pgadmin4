@ECHO off
SETLOCAL
REM
REM ****************************************************************
SET WD=%CD%
SET "PGBUILDPATH=%WD%\win-build"
SET CMDOPTION=""
IF "%1" == "clean"  SET CMDOPTION="VALID"
IF "%1" == "x86"    SET CMDOPTION="VALID"
IF "%1" == "amd64"  SET CMDOPTION="VALID"

IF NOT %CMDOPTION%=="VALID"  ( GOTO USAGE )
SET ARCHITECTURE=%1

IF "%ARCHITECTURE%"=="clean" (
    GOTO CLEAN_RELEASE
    goto:exit
)

REM Main Functions

call :SET_PGADMIN4_ENVIRONMENT
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

call :CLEAN_RELEASE

call :CREATE_VIRTUAL_ENV
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

call :CREATE_RUNTIME_ENV
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

call :CREATE_PYTHON_ENV
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

call :CLEANUP_ENV
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

call :CREATE_INSTALLER
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

CD %WD%
goto:EXIT
REM Main function Ends

:CLEAN_RELEASE
    ECHO Calling clean target...
    IF EXIST "%PGBUILDPATH%" rd "%PGBUILDPATH%" /S /Q

    FOR /R "%WD%" %%f in (*.pyc *.pyo) do DEL /q "%%f" > nul
    IF EXIST "%WD%\pkg\win32\Output" rd "%WD%\pkg\win32\Output" /S /Q
    IF EXIST DEL /q "%WD%\pkg\win32\installer.iss" > nul
    CD %WD%
GOTO:EOF

:SET_PGADMIN4_ENVIRONMENT
   REM Check os architecture x86 or amd64
   SET RegQry=HKLM\Hardware\Description\System\CentralProcessor\0
   REG.exe Query %RegQry% > checkOS.txt
   Find /i "x86" < CheckOS.txt > StringCheck.txt
   SET OSTYPE=""
   IF %ERRORLEVEL% == 0 (
        SET OSTYPE=x86
    ) else (
        SET OSTYPE=amd64
    )
    DEL CheckOS.txt StringCheck.txt
    SET OSVALUE=""
    IF "%OSTYPE%"=="x86" (
        IF "%ARCHITECTURE%"=="amd64" (
            ECHO ARCHITECTURE - %ARCHITECTURE% cannot be run on 32 bit machine
            goto:exit
        )
        OSVALUE=%OSTYPE%
    )

    REM Check IF its is windows 32 bit machine and selected architecture is x86
    IF %OSVALUE%=="x86" (
        IF "%PYTHON_HOME%" == ""   SET "PYTHON_HOME=C:\Python27123"
        IF "%PYTHON_DLL%" == ""    SET "PYTHON_DLL=C:\Windows\System32\python27.dll"
        IF "%QTDIR%" == ""         SET "QTDIR=C:\Qt\Qt5.5.1\5.5\msvc2013"
        IF "%PGDIR%" == ""         SET "PGDIR=C:\Program Files\PostgreSQL\9.5"
        IF "%INNOTOOL%" == ""      SET "INNOTOOL=C:\Program Files\Inno Setup 5"
        IF "%VCDIR%" == ""         SET "VCDIR=C:\Program Files\Microsoft Visual Studio 12.0\VC"
        SET "VCREDISTNAME=vcredist_x86.exe"
        goto SKIPARCVALIDATION
    )

    REM Check IF its is windows 64 bit machine and selected architecture is x86 or amd64
    IF "%ARCHITECTURE%"=="x86" (
        IF "%PYTHON_HOME%" == ""   SET "PYTHON_HOME=C:\Python27"
        IF "%PYTHON_DLL%" == ""    SET "PYTHON_DLL=C:\Windows\SysWOW64\python27.dll"
        IF "%QTDIR%" == ""         SET "QTDIR=C:\Qt\Qt5.5.1\5.5\msvc2013"
        IF "%PGDIR%" == ""         SET "PGDIR=C:\Program Files (x86)\PostgreSQL\9.5"
        IF "%INNOTOOL%" == ""      SET "INNOTOOL=C:\Program Files (x86)\Inno Setup 5"
        IF "%VCDIR%" == ""         SET "VCDIR=C:\Program Files (x86)\Microsoft Visual Studio 12.0\VC"
        IF "%VCREDIST%" == ""      SET "VCREDIST=C:\Program Files (x86)\Microsoft Visual Studio 12.0\VC\redist\1033\vcredist_x86.exe"
        SET "VCREDISTNAME=vcredist_x86.exe"
    )

    IF "%ARCHITECTURE%"=="amd64" (
        IF "%PYTHON_HOME%" == ""   SET "PYTHON_HOME=C:\Python27-x64"
        IF "%PYTHON_DLL%" == ""    SET "PYTHON_DLL=C:\Windows\System32\python27.dll"
        IF "%QTDIR%" == ""         SET "QTDIR=C:\Qt\5.5\msvc2013"
        IF "%PGDIR%" == ""         SET "PGDIR=C:\Program Files\PostgreSQL\9.5"
        IF "%INNOTOOL%" == ""      SET "INNOTOOL=C:\Program Files\Inno Setup 5"
        IF "%VCDIR%" == ""         SET "VCDIR=C:\Program Files\Microsoft Visual Studio 12.0\VC"
        IF "%VCREDIST%" == ""      SET "VCREDIST=C:\Program Files\Microsoft Visual Studio 12.0\VC\redist\1033\vcredist_x64.exe"
        SET "VCREDISTNAME=vcredist_x64.exe"
    )

:SKIPARCVALIDATION
    REM SET the variables IF not availalbe in windows enviroment
    SET "VCVAR=%VCDIR%\vcvarsall.bat"
    SET "VCNMAKE=%VCDIR%\bin\nmake.exe"
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
    FOR /f "tokens=1 DELims=." %%G IN ('%PYTHON_HOME%/python.exe -c "print '%APP_NAME%'.lower().replace(' ', '')"') DO SET APP_SHORTNAME=%%G
    SET INSTALLERNAME=%APP_SHORTNAME%-%APP_RELEASE%.%APP_REVISION_VERSION%-%APP_SUFFIX_VERSION%-%ARCHITECTURE%.exe

    SET PGADMIN4_VERSION=v%APP_RELEASE%
    SET PGADMIN4_APP_VERSION=%APP_RELEASE%.%APP_REVISION_VERSION%

    ECHO ****************************************************************
    ECHO                        S U M M A R Y
    ECHO ****************************************************************
    ECHO Target mode = %ARCHITECTURE%
    ECHO INNOTOOL    = %INNOTOOL%
    ECHO VCDIR       = %VCDIR%
    ECHO VCDIST      = %VCREDIST%
    ECHO NMAKE       = %VCNMAKE%
    ECHO QTDIR       = %QTDIR%
    ECHO QMAKE       = %QMAKE%
    ECHO PYTHON_HOME = %PYTHON_HOME%
    ECHO PYTHON_DLL  = %PYTHON_DLL%
    ECHO PGDIR       = %PGDIR%
    ECHO ****************************************************************

    REM Check IF path SET in enviroments really exist or not ?
    IF NOT EXIST "%INNOTOOL%"          GOTO err_handle_inno
    IF NOT EXIST "%VCDIR%"             GOTO err_handle_visualstudio
    IF NOT EXIST "%VCREDIST%"          GOTO err_handle_visualstudio_dist
    IF NOT EXIST "%VCVAR%"             GOTO err_handle_visualstudio
    IF NOT EXIST "%VCNMAKE%"           GOTO err_handle_visualstudio
    IF NOT EXIST "%QTDIR%"             GOTO err_handle_qt
    IF NOT EXIST "%QMAKE%"             GOTO err_handle_qt
    IF NOT EXIST "%PYTHON_HOME%"       GOTO err_handle_python
    IF NOT EXIST "%PYTHON_DLL%"        GOTO err_handle_python
    IF NOT EXIST "%PGDIR%"             GOTO err_handle_pg

    REM Check for QT and VC dependences
    FOR /L %%G IN (15,1,19) DO "%VCDIR%\bin\cl.exe" /? 2>&1 | findstr /C:"Version %%G" > nul && SET MSVC_MAJOR_VERSION=%%G && GOTO QT_MSVC

    :QT_MSVC
    IF %MSVC_MAJOR_VERSION%==19     SET QT_MSVC_PATH=msvc2015
    IF %MSVC_MAJOR_VERSION%==18     SET QT_MSVC_PATH=msvc2013
    IF %MSVC_MAJOR_VERSION%==17     SET QT_MSVC_PATH=msvc2012
    IF %MSVC_MAJOR_VERSION%==16     SET QT_MSVC_PATH=msvc2010
    IF %MSVC_MAJOR_VERSION%==15     SET QT_MSVC_PATH=msvc2008

    REM on 64 bit machine if x86 is selected and QTDIR is set to 64 bit is should not allow
    IF "%OSTYPE%"=="amd64" (
        IF "%ARCHITECTURE%"=="x86" (
         echo "%QTDIR%" | findstr /C:"_64" > nul && ( GOTO err_handle_qt_compactissue )
        )
    )

    IF "%ARCHITECTURE%"=="amd64" (
        SET QT_MSVC_PATH=%QT_MSVC_PATH%_64
    )

    IF NOT EXIST "%QTDIR%\..\%QT_MSVC_PATH%"       GOTO err_handle_qt_mismatch

    REM get Python version ex. 2.7.1 will get as 27
    FOR /f "tokens=1 DELims=." %%G IN ('%PYTHON_HOME%/python.exe -c "import sys; print sys.version.split(' ')[0]"') DO SET PYTHON_MAJOR=%%G
    FOR /f "tokens=2 DELims=." %%G IN ('%PYTHON_HOME%/python.exe -c "import sys; print sys.version.split(' ')[0]"') DO SET PYTHON_MINOR=%%G
    SET "PYTHON_VERSION=%PYTHON_MAJOR%%PYTHON_MINOR%"

    IF NOT EXIST "%PYTHON_HOME%\Scripts\virtualenv.exe" GOTO err_handle_pythonvirtualenv

    SET REQUIRMENTTXT=""
    IF "%PYTHON_MAJOR%"=="2" SET REQUIRMENTTXT=requirements_py2.txt
    IF "%PYTHON_MAJOR%"=="3" SET REQUIRMENTTXT=requirements_py3.txt
    IF %REQUIRMENTTXT% == ""           GOTO err_handle_pythonversion
    SET PATH=%PGDIR%;%PGDIR%\bin;%PATH%
goto:EXIT


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
    pip install -r "%WD%\%REQUIRMENTTXT%"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    pip install sphinx
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    ECHO Virtual Enviroment created successfully.

    ECHO Deactivating Virtual Enviroment - %PGBUILDPATH%\%VIRTUALENV%\Scripts\deactivate...
    CALL "%PGBUILDPATH%\%VIRTUALENV%\Scripts\deactivate"

    CD %WD%
GOTO:EOF

:CREATE_RUNTIME_ENV
    ECHO Compiling source code...
    MKDIR "%PGBUILDPATH%\runtime" > nul

    REM --- Processing WEB ---
    CD "%WD%"
    CD web
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    XCOPY /S /I /E /H /Y "%WD%\web" "%PGBUILDPATH%\web" > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    REM Clean up .pyc, .pyo, pgadmin4.db, config_local.py
    ECHO Cleaning up unnecessary files...
    FOR /R "%PGBUILDPATH%\web" %%f in (*.pyc *.pyo) do DEL /q "%%f"
    DEL /q "%PGBUILDPATH%\web\pgadmin4.db"
    DEL /q "%PGBUILDPATH%\web\config_local.py"
    
    ECHO Creating config_distro.py
    ECHO SERVER_MODE = False > "%PGBUILDPATH%\web\config_distro.py"
    ECHO HELP_PATH = '../../../docs/en_US/html/' >> "%PGBUILDPATH%\web\config_distro.py"
    ECHO MINIFY_HTML = False >> "%PGBUILDPATH%\web\config_distro.py"

    ECHO Creating config_local.py
    ECHO # Add any configuration changes to this file. > "%PGBUILDPATH%\web\config_local.py"

    ECHO Building docs...
    MKDIR "%PGBUILDPATH%\docs\en_US\html"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    "%PGBUILDPATH%\%VIRTUALENV%\Scripts\sphinx-build.exe"   "%WD%\docs\en_US" "%PGBUILDPATH%\docs\en_US\html"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    ECHO Removing Sphinx
    pip uninstall -y sphinx

    ECHO Assembling runtime environment...
    CD "%WD%"
    CD runtime
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    call "%VCVAR%" %ARCHITECTURE%
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    ECHO Calling -  call "%VCVAR%" %ARCHITECTURE%

    call "%QMAKE%"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    call "%VCNMAKE%" clean
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    call "%VCNMAKE%"
    IF ERRORLEVEL 1 GOTO ERR_HANDLER
    REM Copy binary to Release Folder
    copy "%WD%\runtime\release\pgAdmin4.exe" "%PGBUILDPATH%\runtime"
    IF ERRORLEVEL 1 GOTO ERR_HANDLER

    REM Copy QTP dependences
    copy "%QTDIR%\bin\icudt54.dll"   "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\icuin54.dll"   "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\icuuc54.dll"   "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
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
    copy "%QTDIR%\bin\Qt5WebKit.dll" "%PGBUILDPATH%\runtime"
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
    copy "%QTDIR%\bin\Qt5WebKitWidgets.dll" "%PGBUILDPATH%\runtime"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%QTDIR%\bin\Qt5MultimediaWidgets.dll" "%PGBUILDPATH%\runtime"
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

    MKDIR "%PGBUILDPATH%\installer"
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%
    copy "%VCREDIST%" "%PGBUILDPATH%\installer" > nul
    IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

    ECHO Runtime built successfully.

    CD %WD%
GOTO:EOF

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

    CD %WD%
GOTO:EOF

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
GOTO:EOF

:CLEANUP_ENV
    ECHO Cleaning up private environment...
    rd "%PGBUILDPATH%\%VIRTUALENV%\Include" /S /Q
    rd "%PGBUILDPATH%\%VIRTUALENV%\Scripts" /S /Q
    DEL /s "%PGBUILDPATH%\%VIRTUALENV%\pip-selfcheck.json"

    ECHO Cleaned up private environment successfully.
    CD %WD%
GOTO:EOF

:err_handle_inno
    ECHO %INNOTOOL% does not exist
    ECHO Please Install Innotool and SET INNOTOOL enviroment Variable.
    ECHO SET "INNOTOOL=<PATH>"
    exit /B 1
goto EXIT

:err_handle_visualstudio
    ECHO %VCDIR% does not exist, or
    ECHO %VCVAR% does not exist, or
    ECHO %VCNMAKE% does not exist.
    ECHO Please Install Microsoft Visual studio and SET the VCDIR enviroment Variable.
    ECHO SET "VCDIR%=<PATH>"
    ECHO SET "VCVAR%=<PATH>"
    ECHO SET "VCNMAKE%=<PATH>"
    exit /B 1
goto EXIT

:err_handle_visualstudio_dist
    ECHO %VCREDIST% does not exist
    ECHO Please Install Microsoft Visual studio and SET the VCDIST enviroment Variable.
    ECHO SET "VCDIST%=<PATH>"
    exit /B 1
goto EXIT


:err_handle_python
    ECHO %PYTHON_HOME% does not exist, or
    ECHO PYTHON_VERSION is not SET, or
    ECHO %PYTHON_DLL% does not exist.
    ECHO Please install Python and SET the PYTHON_HOME enviroment Variable.
    ECHO SET "PYTHON_VERSION=<VERSION NUMBER>"
    ECHO SET "PYTHON_HOME=<PATH>"
    ECHO SET "PYTHON_DLL=<PATH>"
    exit /B 1
goto EXIT

:err_handle_qt
    ECHO %QTDIR% does not exist.
    ECHO Please Install QT SDK and SET the QTDIR enviroment variable.
    ECHO SET "QTDIR=<PATH>"
    exit /B 1
goto EXIT

:err_handle_qt_mismatch
    ECHO %QTDIR%\..\%QT_MSVC_PATH%" does not match with your current Visual Studio, version %QT_MSVC_PATH%
    ECHO Your current QT installation willraise a linking error with an MSVC version mismatch.
    ECHO Please use a valid QT installation with a folder %QT_MSVC_PATH%. You can use the Qt Maintenance
    ECHO Tool to add or remove compiler kits.
    exit /B 1
goto EXIT

:err_handle_qt_compactissue
    ECHO %QTDIR%" does support the current architecture selected %ARCHITECTURE%
    ECHO Please use a valid QT installation with a folder %QT_MSVC_PATH%. You can use the Qt Maintenance
    ECHO Tool to add or remove compiler kits.
    exit /B 1
goto EXIT

:err_handle_pg
    ECHO %PGDIR% does not exist.
    ECHO Please Install Postgres and SET enviroment Variable
    ECHO SET "PGDIR=<PATH>"
    exit /B 1
goto EXIT

:err_handle_pythonversion
    ECHO Python version supported Above 2.6, 2.xx and 3.xx only
    exit /B 1
goto EXIT

:err_handle_pythonvirtualenv
    ECHO Python virtualenv is missing @ location - %PYTHON_HOME%\Scripts\virtualenv.exe
    exit /B 1
goto EXIT

:ERR_HANDLER
    ECHO.
    ECHO Aborting build!
    CD %WD%
    exit /B 1
GOTO:EOF

:USAGE
    ECHO Invalid command line options....
    ECHO Usage: "Make.bat <x86 | amd64 | clean>"
    ECHO.
    exit /B 1
GOTO EXIT

:EXIT
     endlocal
    exit /B 0
