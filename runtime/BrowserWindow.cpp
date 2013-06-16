//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// BrowserWindow.cpp - Implementation of the main window class
//
//////////////////////////////////////////////////////////////////////////

// Must be before QT
#include <Python.h>

#include <QtGlobal>

#if QT_VERSION >= 0x050000
#include <QtWidgets>
#include <QtWebKitWidgets>
#else
#include <QtWebKit>
#include <QAction>
#include <QMenu>
#include <QMenuBar>
#include <QMessageBox>
#include <QInputDialog>
#include <QLineEdit>
#endif

#include "BrowserWindow.h"

// Constructor
BrowserWindow::BrowserWindow()
{
    createActions();
    createMenus();

    // Create the WebKit control
    webView = new QWebView(this);
    setCentralWidget(webView);

    // Execute some python and set the web text
    QString data = execPython(tr("from time import time,ctime\n"
                                 "print 'Today is <b>%s</b><br /><i>This is python-generated HTML.</i>' % ctime(time())\n"));

    webView->setHtml(data);
}

// Create the actions for the window
void BrowserWindow::createActions()
{
    // Open an arbitrary URL
    openUrlAction = new QAction(tr("&Open URL..."), this);
    openUrlAction->setShortcut(tr("Ctrl+U"));
    openUrlAction->setStatusTip(tr("Open a URL"));
    connect(openUrlAction, SIGNAL(triggered()), this, SLOT(openUrl()));

    // Exit the app
    exitAction = new QAction(tr("E&xit"), this);
    exitAction->setStatusTip(tr("Exit the application"));
    exitAction->setShortcuts(QKeySequence::Quit);
    connect(exitAction, SIGNAL(triggered()), this, SLOT(close()));

    // About box
    aboutAction = new QAction(tr("&About"), this);
    aboutAction->setStatusTip(tr("Show the application's About box"));
    connect(aboutAction, SIGNAL(triggered()), this, SLOT(about()));
}

// Create the application menus
void BrowserWindow::createMenus()
{
    // File
    fileMenu = menuBar()->addMenu(tr("&File"));
    fileMenu->addAction(openUrlAction);
    fileMenu->addSeparator();
    fileMenu->addAction(exitAction);

    menuBar()->addSeparator();

    // Help
    helpMenu = menuBar()->addMenu(tr("&Help"));
    helpMenu->addAction(aboutAction);
}

// Display the about box
void BrowserWindow::about()
{
    QMessageBox::about(this, tr("About pgAdmin 4"), tr("pgAdmin 4 - PostgreSQL Tools"));
}

// Open an arbitrary URL
void BrowserWindow::openUrl()
{
    bool ok;
    QString url = QInputDialog::getText(this, tr("Enter a URL"), tr("URL:"), QLineEdit::Normal, "http://", &ok);

    if (ok && !url.isEmpty())
        webView->setUrl(url);
}

QString BrowserWindow::execPython(QString script)
{
    // This python script allows us to capture stdout/stderr
    QString stdOutErr =
tr("import sys\n\
class CatchStdoutStderr:\n\
    def __init__(self):\n\
        self.op = ''\n\
    def write(self, txt):\n\
        self.op += txt\n\
catchStdoutStderr = CatchStdoutStderr()\n\
sys.stdout = catchStdoutStderr\n\
sys.stderr = catchStdoutStderr\n\
");

    // Create the main module, and call the redirect code.
    PyObject *pModule = PyImport_AddModule("__main__");
    PyRun_SimpleString(stdOutErr.toUtf8().constData());

    // Now execute the actual script
    PyRun_SimpleString(script.toUtf8().constData());

    // Get the catcher object
    PyObject *catcher = PyObject_GetAttrString(pModule,"catchStdoutStderr");
    PyErr_Print();

    PyObject *output = PyObject_GetAttrString(catcher,"op");

    return QString(PyString_AsString(output));
}
