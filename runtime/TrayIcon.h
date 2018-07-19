//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
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
    ~TrayIcon();

    void Init();
    void enableShutdownMenu();
    void setMenuActions(MenuActions * menuActions);

private:
    void createTrayIcon();
    void createActions();

    QAction *m_newAction;
    QAction *m_copyUrlAction;
    QAction *m_configAction;
    QAction *m_logAction;
    QAction *m_quitAction;

    QSystemTrayIcon *m_trayIcon;
    QMenu *m_trayIconMenu;

    MenuActions *m_menuActions;
};

#endif // TRAYICON_H
