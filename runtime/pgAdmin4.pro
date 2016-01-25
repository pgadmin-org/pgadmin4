# Configure QT modules for the appropriate version of QT
greaterThan(QT_MAJOR_VERSION, 4) {
    message(Building for QT5+...)
    QT += webkitwidgets network widgets
} else { 
    message(Building for QT4...)
    QT += webkit network 
}

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

cache()

RESOURCES += \
    pgadmin4.qrc

