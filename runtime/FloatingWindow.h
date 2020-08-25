////////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// FloatingWindow.h - For GNOME 3.26 and above floating window will be used.
//
////////////////////////////////////////////////////////////////////////////

#ifndef FLOATINGWINDOW_H
#define FLOATINGWINDOW_H

#include "MenuActions.h"

#include <QMainWindow>

namespace Ui {
class FloatingWindow;
}

class FloatingWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit FloatingWindow(QWidget *parent = Q_NULLPTR);

    bool Init();
    void enablePostStartOptions();
    void enableViewLogOption();
    void disableViewLogOption();
    void enableConfigOption();
    void disableConfigOption();
    void setMenuActions(MenuActions * menuActions);

private:
    Ui::FloatingWindow *ui;

    void createMenu();
    void createActions();
    void closeEvent(QCloseEvent * event);

    QAction *m_newAction = Q_NULLPTR;
    QAction *m_copyUrlAction = Q_NULLPTR;
    QAction *m_configAction = Q_NULLPTR;
    QAction *m_logAction = Q_NULLPTR;
    QAction *m_quitAction = Q_NULLPTR;

    QMenu *m_floatingWindowMenu = Q_NULLPTR;
    MenuActions *m_menuActions = Q_NULLPTR;

signals:
    void shutdownSignal(QUrl);
};

#endif // FLOATINGWINDOW_H
