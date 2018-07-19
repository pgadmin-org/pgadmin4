//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// TrayIcon.cpp - Manages the tray icon
//
//////////////////////////////////////////////////////////////////////////

// App headers
#include "TrayIcon.h"

TrayIcon::TrayIcon()
{
    m_trayIcon = NULL;
    m_trayIconMenu = NULL;

    m_newAction = NULL;
    m_configAction = NULL;
    m_logAction = NULL;
    m_quitAction = NULL;
    m_menuActions = NULL;
}

TrayIcon::~TrayIcon()
{

}

void TrayIcon::Init()
{
    createTrayIcon();

    if (m_trayIcon)
        m_trayIcon->show();
}

// Create the tray icon
void TrayIcon::createTrayIcon()
{
    createActions();

    if (m_trayIconMenu)
    {
        delete m_trayIconMenu;
        m_trayIconMenu = NULL;
    }

    m_trayIconMenu = new QMenu(this);
    m_trayIconMenu->addAction(m_newAction);
    m_trayIconMenu->addAction(m_copyUrlAction);
    m_trayIconMenu->addSeparator();
    m_trayIconMenu->addAction(m_configAction);
    m_trayIconMenu->addAction(m_logAction);
    m_trayIconMenu->addSeparator();
    m_trayIconMenu->addAction(m_quitAction);

    if (!m_trayIcon)
        m_trayIcon = new QSystemTrayIcon(this);

    m_trayIcon->setContextMenu(m_trayIconMenu);

    // Setup the icon itself. For convenience, we'll also use it for the dialogue.
#ifdef Q_OS_MAC
    QIcon icon(":pgAdmin4-mac.png");
#else
    QIcon icon(":pgAdmin4.png");
#endif

    m_trayIcon->setIcon(icon);
    setWindowIcon(icon);
}

// Create the menu actions
void TrayIcon::createActions()
{
    m_newAction = new QAction(QString(tr("&New %1 window...")).arg(PGA_APP_NAME), this);
    connect(m_newAction, SIGNAL(triggered()), m_menuActions, SLOT(onNew()));

    m_copyUrlAction = new QAction(tr("&Copy server URL"), this);
    connect(m_copyUrlAction, SIGNAL(triggered()), m_menuActions, SLOT(onCopyUrl()));

    m_configAction = new QAction(tr("&Configure..."), this);
    connect(m_configAction, SIGNAL(triggered()), m_menuActions, SLOT(onConfig()));

    m_logAction = new QAction(tr("&View log..."), this);
    connect(m_logAction, SIGNAL(triggered()), m_menuActions, SLOT(onLog()));

    m_quitAction = new QAction(tr("&Shut down server"), this);
    m_quitAction->setEnabled(false);
    connect(m_quitAction, SIGNAL(triggered()), m_menuActions, SLOT(onQuit()));
}

void TrayIcon::enableShutdownMenu()
{
    if (m_quitAction != NULL)
    {
        m_quitAction->setEnabled(true);
    }
}

void TrayIcon::setMenuActions(MenuActions * menuActions)
{
    m_menuActions = menuActions;
}
