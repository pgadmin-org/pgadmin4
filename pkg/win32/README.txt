Building pgAdmin windows installer on windows
=================================

To generate a pgAdmin 4 installer for Windows bit, the following packages must be installed:

1. Python installation
  - Python 2.6 or above from https://www.python.org/

2. QT installation
  - Qt 4.6 through 5.5 from http://www.qt.io/

3. PostgreSQL installation
  - PostgreSQL 9.1 or above from http://www.postgresql.org/

4. Inno Setup Installer (unicode)
   - 5.0 and above from http://www.jrsoftware.org/isdl.php

5. Microsoft visual studio (2008 and above)

Building: Depending upon the archicture of the OS(x86|amd64) set then environment variables.

1. Set the PYTHON environment variable to the Python root installation directory, e.g. for x86

   SET "PYTHON_HOME=C:\Python27"
   SET "PYTHON_DLL=C:\Windows\System32\python27.dll"

2. Set the QTDIR environment variable to the QT root installation directory, e.g. for x86

   SET "QTDIR=C:\Qt\Qt5.5.1\5.5\msvc2013"

3. Set the PGDIR environment variable to the PostgreSQL installation directory, e.g. for x86

   SET "PGDIR=C:\Program Files\PostgreSQL\9.5"

4. Set the Inno Setup Installer environment variable to the Inno root installation directory, e.g. for x86

   SET "INNOTOOL=C:\Program Files\Inno Setup 5"

5. Set the Miscrosoft Visual studio environment variable to the Visual studio root installation directory, e.g. for x86

   SET "VCDIR=C:\Program Files\Microsoft Visual Studio 12.0\VC"

6. To build, go to pgAdmin4 source root directory and execute "Make.bat x86|amd64". Based on x86|amd64, this will
   create the python virtual environment and install all the required python modules mentioned in the
   requirements file using pip, build the runtime code and finally create the windows installer x86|amd64 in ./dist directory

