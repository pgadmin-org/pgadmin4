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

#include "MenuActions.h"

#include <QWidget>
#include <QSystemTrayIcon>

class TrayIcon : public QWidget
{
    Q_OBJECT

public:
    TrayIcon();

    void Init();
    void enablePostStartOptions();
    void enableViewLogOption();
    void disableViewLogOption();
    void enableConfigOption();
    void disableConfigOption();
    void setMenuActions(MenuActions * menuActions);

private:
    void createTrayIcon();
    void createActions();

    QAction *m_newAction = Q_NULLPTR;
    QAction *m_copyUrlAction = Q_NULLPTR;
    QAction *m_configAction = Q_NULLPTR;
    QAction *m_logAction = Q_NULLPTR;
    QAction *m_quitAction = Q_NULLPTR;

    QSystemTrayIcon *m_trayIcon = Q_NULLPTR;
    QMenu *m_trayIconMenu = Q_NULLPTR;

    MenuActions *m_menuActions = Q_NULLPTR;
};

#endif // TRAYICON_H
