# Configure QT modules for the appropriate version of QT
greaterThan(QT_MAJOR_VERSION, 4) {
    message(Building for QT5+...)
    QT += webkitwidgets network widgets
    win32 {
      RC_ICONS += pgAdmin4.ico
    }
} else { 
    message(Building for QT4...)
    QT += webkit network
    win32 {
      RC_FILE += pgAdmin4.rc
    }
}

CONFIG(debug, debug|release) {
  DEFINES += PGADMIN4_DEBUG
  message(Configure pgAdmin4 to run in debug mode...)
}

win32 {
    message(Building for Windows...)

    # Read the PYTHON_HOME and PYTHON_VERSION system environment variables.
    PY_HOME = $$(PYTHON_HOME)
    PY_VERSION = $$(PYTHON_VERSION)

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

            # Set the PYTHON2 macro if appropriate
            PY2_VERSION = $$find(PY_VERSION, "^2")
            count( PY2_VERSION, 1) {
                message(Python version 2.x detected.)
                DEFINES += PYTHON2
            }
        }
    }
}
else {
    message(Building for Linux/Mac...)

    PYTHON_CONFIG=python3-config

    # Find and configure Python
    !system(which python3-config > /dev/null 2>&1) {
        !system(which python-config > /dev/null 2>&1) {
            error(The python-config executable could not be found. Ensure Python is installed and in the system path.)
        } else {
	    PYTHON_CONFIG=python-config
	    DEFINES += PYTHON2
        }
    }

    QMAKE_CXXFLAGS += $$system($$PYTHON_CONFIG --includes)
    QMAKE_LFLAGS += $$system($$PYTHON_CONFIG --ldflags)
    LIBS += $$system($$PYTHON_CONFIG --libs)
}

# Source code
HEADERS     =   BrowserWindow.h \
                Server.h \
                pgAdmin4.h \
                TabWindow.h \
                WebViewWindow.h \
                ConfigWindow.h
SOURCES     =   pgAdmin4.cpp \
                BrowserWindow.cpp \
                Server.cpp \
                TabWindow.cpp \
                WebViewWindow.cpp \
                ConfigWindow.cpp
FORMS       =   BrowserWindow.ui \
                ConfigWindow.ui
ICON        =   pgAdmin4.icns
QMAKE_INFO_PLIST = Info.plist

RESOURCES += \
    pgadmin4.qrc

