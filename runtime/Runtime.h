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
    void delay(int milliseconds);
    bool shutdownServer(QUrl url);

private:
    QSettings m_settings;
    QSharedMemory *m_shmem;
    bool m_configDone;

    void setupStyling(QApplication *app);
    void configureProxy();
    QSplashScreen *displaySplash(QApplication *app);
    quint16 getPort();
    TrayIcon *createTrayIcon(QSplashScreen *splash, MenuActions *menuActions);
    FloatingWindow *createFloatingWindow(QSplashScreen *splash, MenuActions *menuActions);
    Server *startServerLoop(QSplashScreen *splash, FloatingWindow *floatingWindow, TrayIcon *trayIcon, int port, QString key);
    Server *startServer(QSplashScreen *splash, int port, QString key);
    void checkServer(QSplashScreen *splash, QString url);
    void createAddressFile(QString url);
    void openBrowserTab(QString url);
    QString serverRequest(QUrl url, QString path);
    bool pingServer(QUrl url);

private slots:
    void onConfigDone(bool accepted);
};

#endif // RUNTIME_H
