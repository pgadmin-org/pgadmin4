////////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// FloatingWindow.cpp - For GNOME 3.26 and above floating window will be used.
//
////////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"
#include "FloatingWindow.h"
#include "ui_FloatingWindow.h"

#include <QMenu>
#include <QMenuBar>


FloatingWindow::FloatingWindow(QWidget *parent) :
    QMainWindow(parent)
{
}


bool FloatingWindow::Init()
{
    ui = new Ui::FloatingWindow;
    ui->setupUi(this);

    // Creating Menu
    createMenu();

    // Setup the icon itself. For convenience, we'll also use it for the dialogue.
#ifdef Q_OS_MAC
    QIcon icon(":pgAdmin4-mac.png");
#else
    QIcon icon(":pgAdmin4.png");
#endif

    setWindowIcon(icon);
    setWindowTitle(tr("pgAdmin"));
    setFixedSize(300, 230);
    setWindowFlags(Qt::Window | Qt::WindowTitleHint | Qt::WindowMinimizeButtonHint);
    return true;
}


// Create the menu
void FloatingWindow::createMenu()
{
    createActions();

    m_floatingWindowMenu = menuBar()->addMenu(tr("&pgAdmin 4"));
    m_floatingWindowMenu->addAction(m_newAction);
    m_floatingWindowMenu->addAction(m_copyUrlAction);
    m_floatingWindowMenu->addSeparator();
    m_floatingWindowMenu->addAction(m_configAction);
    m_floatingWindowMenu->addAction(m_logAction);
    m_floatingWindowMenu->addSeparator();
    m_floatingWindowMenu->addAction(m_quitAction);
}


// Create the menu actions
void FloatingWindow::createActions()
{
    m_newAction = new QAction(tr("&New pgAdmin 4 window..."), this);
    m_newAction->setEnabled(false);
    connect(m_newAction, SIGNAL(triggered()), m_menuActions, SLOT(onNew()));

    m_copyUrlAction = new QAction(tr("&Copy server URL"), this);
    m_copyUrlAction->setEnabled(false);
    connect(m_copyUrlAction, SIGNAL(triggered()), m_menuActions, SLOT(onCopyUrl()));

    m_configAction = new QAction(tr("C&onfigure..."), this);
    m_configAction->setEnabled(false);
    connect(m_configAction, SIGNAL(triggered()), m_menuActions, SLOT(onConfig()));

    m_logAction = new QAction(tr("&View log..."), this);
    m_logAction->setEnabled(false);
    connect(m_logAction, SIGNAL(triggered()), m_menuActions, SLOT(onLog()));

    m_quitAction = new QAction(tr("&Shut down server"), this);
    m_quitAction->setEnabled(false);
    connect(m_quitAction, SIGNAL(triggered()), m_menuActions, SLOT(onQuit()));
}


void FloatingWindow::enablePostStartOptions()
{
    if (m_newAction != Q_NULLPTR)
        m_newAction->setEnabled(true);

    if (m_copyUrlAction != Q_NULLPTR)
        m_copyUrlAction->setEnabled(true);

    if (m_configAction != Q_NULLPTR)
        m_configAction->setEnabled(true);

    if (m_logAction != Q_NULLPTR)
        m_logAction->setEnabled(true);

    if (m_quitAction != Q_NULLPTR)
        m_quitAction->setEnabled(true);
}

void FloatingWindow::setMenuActions(MenuActions * menuActions)
{
    m_menuActions = menuActions;
}

// Enable the View Log option
void FloatingWindow::enableViewLogOption()
{
    if (m_logAction != Q_NULLPTR)
        m_logAction->setEnabled(true);
}

// Disable the View Log option
void FloatingWindow::disableViewLogOption()
{
    if (m_logAction != Q_NULLPTR)
        m_logAction->setEnabled(false);
}

// Enable the configure option
void FloatingWindow::enableConfigOption()
{
    if (m_configAction != Q_NULLPTR)
        m_configAction->setEnabled(true);
}

// Disable the configure option
void FloatingWindow::disableConfigOption()
{
    if (m_configAction != Q_NULLPTR)
        m_configAction->setEnabled(false);
}

void FloatingWindow::closeEvent(QCloseEvent * event)
{
    // Emit the signal to shut down the python server.
    emit shutdownSignal(m_menuActions->getAppServerUrl());
    event->accept();
    exit(0);
}
