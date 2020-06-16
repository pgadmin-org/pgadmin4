//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// TrayIcon.h - Manages the tray icon
//
//////////////////////////////////////////////////////////////////////////

#ifndef TRAYICON_H
#define TRAYICON_H

#include "pgAdmin4.h"

// QT headers
#include <QWidget>
#include "MenuActions.h"

class TrayIcon : public QWidget
{
    Q_OBJECT

public:
    TrayIcon();

    void Init();
    void enableShutdownMenu();
    void setMenuActions(MenuActions * menuActions);

private:
    void createTrayIcon();
    void createActions();

    QAction *m_newAction = Q_NULLPTR;
    QAction *m_copyUrlAction = Q_NULLPTR;
    QAction *m_configAction = Q_NULLPTR;
    QAction *m_logAction = Q_NULLPTR;
    QAction *m_quitAction = Q_NULLPTR;

    QSystemTrayIcon *m_trayIcon;
    QMenu *m_trayIconMenu;

    MenuActions *m_menuActions;
};

#endif // TRAYICON_H
