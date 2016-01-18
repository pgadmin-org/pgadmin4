//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2016, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// BrowserWindow.h - Declaration of the main window class
//
//////////////////////////////////////////////////////////////////////////

#ifndef BROWSERWINDOW_H
#define BROWSERWINDOW_H

#include "pgAdmin4.h"
#include "TabWindow.h"
#include "WebViewWindow.h"

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
    BrowserWindow(QString url);

protected:
    void closeEvent(QCloseEvent *event);

protected slots:
    void finishLoading(bool);
    void urlLinkClicked(const QUrl &);
    void closetabs();
    void tabTitleChanged(const QString &);

private slots:
    void openUrl();
    void pythonPath();
    void about();

public slots:
    void tabIndexChanged(int index);
    void goBackPage();
    void goForwardPage();

private:
    QString m_appServerUrl;
    WebViewWindow *m_mainWebView;
    QMenu *fileMenu;
    QMenu *helpMenu;
    QAction *openUrlAction;
    QAction *pythonPathAction;
    QAction *exitAction;
    QAction *aboutAction;

    QGridLayout  *m_tabGridLayout;
    QGridLayout  *m_mainGridLayout;
    TabWindow    *m_tabWidget;
    QWidget      *m_pgAdminMainTab;

    QWidget           *m_addNewTab;
    QGridLayout       *m_addNewGridLayout;
    WebViewWindow     *m_addNewWebView;
    QHBoxLayout       *m_horizontalLayout;
    QWidget           *m_widget;
    QToolButton       *m_toolBtnBack;
    QToolButton       *m_toolBtnForward;

    bool m_initialLoad;
    int m_loadAttempt;

    void createActions();
    void createMenus();
    void pause(int seconds = 1);
    int  findURLTab(const QUrl &name);
};

#endif // BROWSERWINDOW_H
