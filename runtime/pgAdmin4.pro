VERSION = 4.25.0.0
QMAKE_TARGET_COMPANY = "The pgAdmin Development Team"
QMAKE_TARGET_PRODUCT = "pgAdmin 4"
QMAKE_TARGET_DESCRIPTION = "pgAdmin 4 Desktop Runtime"
QMAKE_TARGET_COPYRIGHT = "Copyright (C) 2013 - 2020, The pgAdmin Development Team"

message(==================================)
message(Configuring the pgAdmin 4 runtime.)
message(==================================)

# Check for a suitable Qt version
!greaterThan(QT_MAJOR_VERSION, 4) {
    error("pgAdmin 4 cannot be built with Qt $${QT_VERSION}. Use Qt 5.0 or newer.")
}
message(Qt version: $${QT_VERSION})

# Configure QT modules for the appropriate version of QT
QT += network widgets

win32 {
  RC_ICONS += pgAdmin4.ico
}

# Environment settings for the build
QMAKE_CFLAGS += $$(PGADMIN_CFLAGS)
QMAKE_CXXFLAGS += $$(PGADMIN_CXXFLAGS)
QMAKE_LFLAGS += $$(PGADMIN_LDFLAGS)

# Figure out where/what Python looks like and that it's suitable
PYTHON_DIR = $$(PGADMIN_PYTHON_DIR)

equals(PYTHON_DIR, "") {
    error(The PGADMIN_PYTHON_DIR environment variable is not set. Please set it to a directory path under which Python 3.4 or later has been installed and try again.)
}

win32 {
    message(Platform: Windows)
    PYTHON_EXE = $${PYTHON_DIR}\python.exe
} else {
    macx {
        message(Platform: macOS)
    } else {
        message(Platform: Linux)
    }
    PYTHON_EXE = $${PYTHON_DIR}/bin/python3
}

!exists($$PYTHON_EXE) {
    error(The Python executable ($$PYTHON_EXE) could not be found. Please ensure the PGADMIN_PYTHON_DIR environment variable is correctly set.)
}
message(Python executable: $$PYTHON_EXE)

PYTHON_VERSION = $$system($$PYTHON_EXE -c \"import sys; print(\'%s.%s\' % (sys.version_info[0], sys.version_info[1]))\")
PYTHON_SHORT_VERSION = $$system($$PYTHON_EXE -c \"import sys; print(\'%s%s\' % (sys.version_info[0], sys.version_info[1]))\")
PYTHON_MAJOR_VERSION = $$system($$PYTHON_EXE -c \"import sys; print(sys.version_info[0])\")
message(Python version: $$PYTHON_VERSION ($$PYTHON_SHORT_VERSION))

lessThan(PYTHON_SHORT_VERSION, 34) {
    error(Python 3.4 or later is required to build pgAdmin.)
}

# Configure for the platform
win32 {
    INCLUDEPATH = $${PYTHON_DIR}\include
    message(Include path: $$INCLUDEPATH)

    LIBS += -L"$${PYTHON_DIR}\libs" -lpython$${PYTHON_SHORT_VERSION}
    message(LIBS: $$LIBS)
}
else {
    # Find the best matching python-config (there may be more than one)
    exists($PYTHON_DIR/bin/python$${PYTHON_VERSION}-config) {
        PYTHON_CONFIG = $$PYTHON_DIR/bin/python$${PYTHON_VERSION}-config
    } else: exists($${PYTHON_DIR}/bin/python$${PYTHON_MAJOR_VERSION}-config) {
        PYTHON_CONFIG = $${PYTHON_DIR}/bin/python$${PYTHON_MAJOR_VERSION}-config
    } else: exists($${PYTHON_DIR}/bin/python-config) {
        PYTHON_CONFIG = $${PYTHON_DIR}/bin/python-config
    } else {
        error(No suitable python-config could be found in $${PYTHON_DIR}/bin.)
    }
    message(Python config: $$PYTHON_CONFIG)

    PYTHON_EMBED = $$system($$PYTHON_CONFIG --help 2>&1 | grep -o \'\\-\\-embed\')

    QMAKE_CXXFLAGS += $$system($$PYTHON_CONFIG --includes)
    message(CXXFLAGS: $$QMAKE_CXXFLAGS)

    QMAKE_LFLAGS += $$system($$PYTHON_CONFIG --ldflags)
    message(LDFLAGS: $$QMAKE_LFLAGS)

    LIBS += $$system($$PYTHON_CONFIG --libs $$PYTHON_EMBED)
    message(LIBS: $$LIBS)
}

# Source code
HEADERS =             Server.h \
                      Runtime.h \
                      pgAdmin4.h \
                      ConfigWindow.h \
                      TrayIcon.h \
                      LogWindow.h \
                      MenuActions.h \
                      FloatingWindow.h \
                      Logger.h

SOURCES =             pgAdmin4.cpp \
                      Runtime.cpp \
                      Server.cpp \
                      ConfigWindow.cpp \
                      TrayIcon.cpp \
                      LogWindow.cpp \
                      MenuActions.cpp \
                      FloatingWindow.cpp \
                      Logger.cpp

FORMS =               ConfigWindow.ui \
                      LogWindow.ui \
                      FloatingWindow.ui

ICON =                pgAdmin4.icns

QMAKE_INFO_PLIST =    Info.plist

RESOURCES +=          pgadmin4.qrc \
                      qdarkstyle/style.qrc

macx {
    HEADERS +=            macos.h
    OBJECTIVE_SOURCES =   macos.mm
}

