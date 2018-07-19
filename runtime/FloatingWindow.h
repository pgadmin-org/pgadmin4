////////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// FloatingWindow.h - For GNOME 3.26 and above floating window will be used.
//
////////////////////////////////////////////////////////////////////////////


#ifndef FLOATINGWINDOW_H
#define FLOATINGWINDOW_H

#include "pgAdmin4.h"
#include "MenuActions.h"

#include <QMainWindow>

namespace Ui {
class FloatingWindow;
}

class FloatingWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit FloatingWindow(QWidget *parent = 0);
    ~FloatingWindow();

    bool Init();
    void enableShutdownMenu();
    void setMenuActions(MenuActions * menuActions);

private:
    Ui::FloatingWindow *ui;

    void createMenu();
    void createActions();
    void closeEvent(QCloseEvent * event);

    QAction *m_newAction;
    QAction *m_copyUrlAction;
    QAction *m_configAction;
    QAction *m_logAction;
    QAction *m_quitAction;

    QMenu *m_floatingWindowMenu;
    MenuActions *m_menuActions;

signals:
    void shutdownSignal(QUrl);
};

#endif // FLOATINGWINDOW_H
