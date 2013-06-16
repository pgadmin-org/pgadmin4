//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// pgAdmin4.cpp - Main application entry point
//
//////////////////////////////////////////////////////////////////////////

// Must be before QT
#include <Python.h>

#include <QtGlobal>

#if QT_VERSION >= 0x050000
#include <QtWidgets>
#else
#include <QApplication>
#endif

#include "BrowserWindow.h"

int main(int argc, char * argv[])
{
    // Create the QT application
    QApplication app(argc, argv);

    // Initialise Python
    Py_SetProgramName(argv[0]);
    Py_Initialize();

    // Create & show the main window
    BrowserWindow browserWindow;
    browserWindow.show();

    // Go!
    return app.exec();

    // Shutdown Python
    Py_Finalize();
}


