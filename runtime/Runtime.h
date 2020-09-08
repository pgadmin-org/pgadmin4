//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// Runtime.h - Core of the runtime
//
//////////////////////////////////////////////////////////////////////////

#ifndef RUNTIME_H
#define RUNTIME_H

// Include the Python header here as it needs to appear before any QT
// headers anywhere in the app.
#ifdef __MINGW32__
#include <cmath>
#endif
#include <Python.h>

#include "TrayIcon.h"
#include "MenuActions.h"
#include "FloatingWindow.h"

// QT headers
#include <QtWidgets>

class Server;

class Runtime: public QObject
{
    Q_OBJECT
public:
    Runtime();

    bool alreadyRunning();
    bool go(int argc, char *argv[]);
    void delay(int milliseconds) const;
    bool shutdownServer(QUrl url);

private:
    QSharedMemory *m_shmem;
    bool m_configDone;
    FloatingWindow *m_floatingWindow = Q_NULLPTR;
    TrayIcon *m_trayIcon = Q_NULLPTR;
    QSplashScreen *m_splash = Q_NULLPTR;
    quint16 m_port = 0;

    void setupStyling(QApplication *app) const;
    void configureProxy() const;
    QSplashScreen *displaySplash(QApplication *app);
    quint16 getPort() const;
    TrayIcon *createTrayIcon(MenuActions *menuActions);
    FloatingWindow *createFloatingWindow(MenuActions *menuActions);
    Server *startServerLoop(QString key);
    Server *startServer(QString key);
    void checkServer(QString url);
    void createAddressFile(QString url) const;
    void openBrowserTab(QString url) const;
    QString serverRequest(QUrl url, QString path);
    bool pingServer(QUrl url);
    void openConfigureWindow(const QString errorMsg);

private slots:
    void onConfigDone(bool accepted);
};

#endif // RUNTIME_H
