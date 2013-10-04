//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// BrowserWindow.h - Declaration of the main window class
//
//////////////////////////////////////////////////////////////////////////

#ifndef BROWSERWINDOW_H
#define BROWSERWINDOW_H

#include "pgAdmin4.h"

#include <QtGlobal>

#if QT_VERSION >= 0x050000
#include <QtWidgets>
#include <QtWebKitWidgets>
#else
#include <QMainWindow>
#include <QWebView>
#endif

QT_BEGIN_NAMESPACE
class QAction;
class QMenu;
QT_END_NAMESPACE

class BrowserWindow : public QMainWindow
{
    Q_OBJECT

public:
    BrowserWindow();

protected:
    void closeEvent(QCloseEvent *event);

protected slots:
    void finishLoading(bool);

private slots:
    void openUrl();
    void about();

private:
    QWebView *webView;
    QMenu *fileMenu;
    QMenu *helpMenu;
    QAction *openUrlAction;
    QAction *exitAction;
    QAction *aboutAction;

    bool m_initialload;
    int m_loadattempt;

    void createActions();
    void createMenus();
    void pause(int seconds = 1);
};

#endif // BROWSERWINDOW_H
