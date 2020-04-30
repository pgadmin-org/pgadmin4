VERSION = 4.21.0.0
QMAKE_TARGET_COMPANY = "The pgAdmin Development Team"
QMAKE_TARGET_PRODUCT = "pgAdmin 4"
QMAKE_TARGET_DESCRIPTION = "pgAdmin 4 Desktop Runtime"
QMAKE_TARGET_COPYRIGHT = "Copyright (C) 2013 - 2020, The pgAdmin Development Team"

# Configure QT modules for the appropriate version of QT
greaterThan(QT_MAJOR_VERSION, 4) {
    message(Building for QT5+...)
    QT += network widgets
} else { 
    message(Building for QT4...)
    QT += network
    DEFINES += Q_NULLPTR=NULL
}
win32 {
  RC_ICONS += pgAdmin4.ico
}

# Environment settings for the build
QMAKE_CFLAGS += $$(PGADMIN_CFLAGS)
QMAKE_CXXFLAGS += $$(PGADMIN_CXXFLAGS)
QMAKE_LFLAGS += $$(PGADMIN_LDFLAGS)

win32 {
    message(Building for Windows...)

    # Read the PYTHON_HOME and PYTHON_VERSION system environment variables.
    PY_HOME = $$(PYTHON_HOME)
    PY_VERSION = $$(PYTHON_VERSION)

    lessThan(PY_VERSION, 34) {
        error(Python 3.4 or later is required.)
    }

    isEmpty(PY_HOME) {
        error(Please define the PYTHON_HOME variable in the system environment.)
    }
    else {
        isEmpty(PY_VERSION) {
            error(Please define the PYTHON_VERSION variable in the system environment.)
        }
        else {
            INCLUDEPATH = $$PY_HOME\include
            LIBS += -L"$$PY_HOME\libs" -lpython$$PY_VERSION
        }
    }
}
else {
    message(Building for Linux/Mac...)

    # Find and configure Python
    # Environment setting
    PYTHON_CONFIG = $$(PYTHON_CONFIG)

    # Maybe Python 3?
    isEmpty(PYTHON_CONFIG) {
        PYTHON_CONFIG = $$system(which python3-config)
    }

    # Argh!
    isEmpty(PYTHON_CONFIG) {
        error(The python3-config executable could not be found. Ensure Python is installed and in the system path.)
    }

    message(Using $$PYTHON_CONFIG)

    PYTHON_EMBED = $$system($$PYTHON_CONFIG --help 2>&1 | grep -o \'\\-\\-embed\')

    QMAKE_CXXFLAGS += $$system($$PYTHON_CONFIG --includes)
    QMAKE_LFLAGS += $$system($$PYTHON_CONFIG --ldflags)
    LIBS += $$system($$PYTHON_CONFIG --libs $$PYTHON_EMBED)

    contains( LIBS, -lpython2.* ) {
       error(Building with Python 2 is not supported.)
    } else {
       message(Building with Python 3.)
    }
}

# Source code
HEADERS     =   Server.h \
                pgAdmin4.h \
                ConfigWindow.h \
                TrayIcon.h \
                LogWindow.h \
                MenuActions.h \
                FloatingWindow.h \
                Logger.h
SOURCES     =   pgAdmin4.cpp \
                Server.cpp \
                ConfigWindow.cpp \
                TrayIcon.cpp \
                LogWindow.cpp \
                MenuActions.cpp \
                FloatingWindow.cpp \
                Logger.cpp

FORMS       =   ConfigWindow.ui \
                LogWindow.ui \
                FloatingWindow.ui
ICON        =   pgAdmin4.icns
QMAKE_INFO_PLIST = Info.plist

RESOURCES +=    pgadmin4.qrc \
                breeze.qrc

macx {
    HEADERS += macos.h
    OBJECTIVE_SOURCES = macos.mm
}

