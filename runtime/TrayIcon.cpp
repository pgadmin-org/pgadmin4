//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// TrayIcon.cpp - Manages the tray icon
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"
#include "TrayIcon.h"

#include <QMenu>


TrayIcon::TrayIcon()
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
        m_trayIconMenu = Q_NULLPTR;
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
    m_newAction = new QAction(tr("&New pgAdmin 4 window..."), this);
    m_newAction->setEnabled(false);
    connect(m_newAction, SIGNAL(triggered()), m_menuActions, SLOT(onNew()));

    m_copyUrlAction = new QAction(tr("&Copy server URL"), this);
    m_copyUrlAction->setEnabled(false);
    connect(m_copyUrlAction, SIGNAL(triggered()), m_menuActions, SLOT(onCopyUrl()));

    m_configAction = new QAction(tr("&Configure..."), this);
    m_configAction->setEnabled(false);
    connect(m_configAction, SIGNAL(triggered()), m_menuActions, SLOT(onConfig()));

    m_logAction = new QAction(tr("&View log..."), this);
    m_logAction->setEnabled(false);
    connect(m_logAction, SIGNAL(triggered()), m_menuActions, SLOT(onLog()));

    m_quitAction = new QAction(tr("&Shut down server"), this);
    m_quitAction->setEnabled(false);
    connect(m_quitAction, SIGNAL(triggered()), m_menuActions, SLOT(onQuit()));
}


void TrayIcon::enablePostStartOptions()
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

// Enable the View Log option
void TrayIcon::enableViewLogOption()
{
    if (m_logAction != Q_NULLPTR)
        m_logAction->setEnabled(true);
}

// Disable the View Log option
void TrayIcon::disableViewLogOption()
{
    if (m_logAction != Q_NULLPTR)
        m_logAction->setEnabled(false);
}

// Enable the configure option
void TrayIcon::enableConfigOption()
{
    if (m_configAction != Q_NULLPTR)
        m_configAction->setEnabled(true);
}

// Disable the configure option
void TrayIcon::disableConfigOption()
{
    if (m_configAction != Q_NULLPTR)
        m_configAction->setEnabled(false);
}

void TrayIcon::setMenuActions(MenuActions * menuActions)
{
    m_menuActions = menuActions;
}
