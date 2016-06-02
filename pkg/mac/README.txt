Building pgAdmin4.dmg on Mac OS X
=================================

Required Packages (Either build the sources or get them from macports or similar):

1. Python installation
  - Python 2.6 or above from https://www.python.org/

2. QT installation
  - Qt 4 or 5 from http://www.qt.io/

3. PostgreSQL installation
  - PostgreSQL 9.1 or above from http://www.postgresql.org/

Building:

1. Set the PYTHON_HOME environment variable to the Python root installation directory, e.g.

   export PYTHON_HOME=/System/Library/Frameworks/Python.framework/Versions/2.7

2. Set the QTDIR environment variable to the QT root installation directory, e.g.

   export QTDIR=~/Qt/5.5/clang_64

3. Set the PGDIR environment variable to the PostgreSQL installation directory, e.g.

   export PGDIR=/usr/local/pgsql

4. To build, go to pgAdmin4 source root directory and execute "make appbundle". This will
   create the python virtual environment and install all the required python modules mentioned in the
   requirements file using pip, build the runtime code and finally create the app bundle and the DMG 
   in ./dist directory
