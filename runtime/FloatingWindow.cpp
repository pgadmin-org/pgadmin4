////////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// FloatingWindow.cpp - For GNOME 3.26 and above floating window will be used.
//
////////////////////////////////////////////////////////////////////////////

#include "FloatingWindow.h"
#include "ui_FloatingWindow.h"

FloatingWindow::FloatingWindow(QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::FloatingWindow)
{
    m_newAction = NULL;
    m_configAction = NULL;
    m_logAction = NULL;
    m_quitAction = NULL;
    m_menuActions = NULL;
    m_floatingWindowMenu = NULL;

    ui->setupUi(this);
}

FloatingWindow::~FloatingWindow()
{
    delete ui;
}

bool FloatingWindow::Init()
{
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

    m_floatingWindowMenu = menuBar()->addMenu(QString(tr("&%1")).arg(PGA_APP_NAME));
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
    m_newAction = new QAction(QString(tr("&New %1 window...")).arg(PGA_APP_NAME), this);
    connect(m_newAction, SIGNAL(triggered()), m_menuActions, SLOT(onNew()));

    m_copyUrlAction = new QAction(tr("&Copy server URL"), this);
    connect(m_copyUrlAction, SIGNAL(triggered()), m_menuActions, SLOT(onCopyUrl()));

    m_configAction = new QAction(tr("C&onfigure..."), this);
    connect(m_configAction, SIGNAL(triggered()), m_menuActions, SLOT(onConfig()));

    m_logAction = new QAction(tr("&View log..."), this);
    connect(m_logAction, SIGNAL(triggered()), m_menuActions, SLOT(onLog()));

    m_quitAction = new QAction(tr("&Shut down server"), this);
    m_quitAction->setEnabled(false);
    connect(m_quitAction, SIGNAL(triggered()), m_menuActions, SLOT(onQuit()));
}

void FloatingWindow::enableShutdownMenu()
{
    if (m_quitAction != NULL)
    {
        m_quitAction->setEnabled(true);
    }
}

void FloatingWindow::setMenuActions(MenuActions * menuActions)
{
    m_menuActions = menuActions;
}

void FloatingWindow::closeEvent(QCloseEvent * event)
{
    // Emit the signal to shut down the python server.
    emit shutdownSignal(m_menuActions->getAppServerUrl());
    event->accept();
    exit(0);
}
