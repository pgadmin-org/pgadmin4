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

#include "pgAdmin4.h"

// QT headers
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

// App headers
#include "BrowserWindow.h"

// Constructor
BrowserWindow::BrowserWindow()
{
    createActions();
    createMenus();

    // Create the WebKit control
    webView = new QWebView(this);
    setCentralWidget(webView);

    // Display the app
    webView->setUrl(QString("http://127.0.0.1:8080"));
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

