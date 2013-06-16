# Configure QT modules for the appropriate version of QT
greaterThan(QT_MAJOR_VERSION, 4) {
    message(Building for QT5+...)
    QT += webkitwidgets network widgets
} else { 
    message(Building for QT4...)
    QT += webkit network 
}

# Find and configure Python
!system(which python-config > /dev/null 2>&1) {
    error(The python-config executable could not be found. Ensure Python is installed and in the system path.)
}
QMAKE_CXXFLAGS += $$system(python-config --includes)
QMAKE_LFLAGS += $$system(python-config --ldflags)

# Source code
HEADERS     =   BrowserWindow.h
SOURCES     =   pgAdmin4.cpp \
                BrowserWindow.cpp
FORMS       =   BrowserWindow.ui
ICON        =   pgAdmin4.icns
QMAKE_INFO_PLIST = Info.plist

