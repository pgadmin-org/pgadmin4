//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// pgAdmin4.cpp - Main application entry point
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

// Must be before QT
#include <Python.h>

#if QT_VERSION >= 0x050000
#include <QtWidgets>
#include <QNetworkProxyFactory>
#include <QNetworkRequest>
#include <QNetworkReply>
#else
#include <QApplication>
#include <QDebug>
#include <QtNetwork>
#include <QLineEdit>
#include <QInputDialog>
#include <QSplashScreen>
#include <QUuid>
#include <QNetworkProxyFactory>
#endif

// App headers
#include "ConfigWindow.h"
#include "Server.h"
#include "TrayIcon.h"
#include "MenuActions.h"
#include "FloatingWindow.h"

#include <QTime>

QString logFileName;
QString addrFileName;

int main(int argc, char * argv[])
{
    /*
     * Before starting main application, need to set 'QT_X11_NO_MITSHM=1'
     * to make the runtime work with IBM PPC machine.
     */
#if defined (Q_OS_LINUX)
    QByteArray val("1");
    qputenv("QT_X11_NO_MITSHM", val);
#endif

    // Create the QT application
    QApplication app(argc, argv);
    app.setQuitOnLastWindowClosed(false);

    // Setup the settings management
    QCoreApplication::setOrganizationName("pgadmin");
    QCoreApplication::setOrganizationDomain("pgadmin.org");
    QCoreApplication::setApplicationName(PGA_APP_NAME.toLower().replace(" ", ""));

#if QT_VERSION >= 0x050000
    // Set high DPI pixmap to display icons clear on Qt widget.
    QApplication::setAttribute(Qt::AA_UseHighDpiPixmaps);
#endif

    // Create a hash of the executable path so we can run copies side-by-side
    QString homeDir = QDir::homePath();
    unsigned long exeHash = sdbm((unsigned char *)argv[0]);

    // Create the address file, that will be used to store the appserver URL for this instance
    addrFileName = homeDir + (QString("/.%1.%2.addr").arg(PGA_APP_NAME).arg(exeHash)).remove(" ");
    QFile addrFile(addrFileName);

    // Create a system-wide semaphore keyed by app name, exe hash and the username
    // to ensure instances are unique to the user and path
    QString userName = qgetenv("USER"); // *nix
    if (userName.isEmpty())
        userName = qgetenv("USERNAME"); // Windows

    QString semaName = QString("%1-%2-%3-sema").arg(PGA_APP_NAME).arg(userName).arg(exeHash);
    QString shmemName = QString("%1-%2-%3-shmem").arg(PGA_APP_NAME).arg(userName).arg(exeHash);

    QSystemSemaphore sema(semaName, 1);
    sema.acquire();

#ifndef Q_OS_WIN32
    // We may need to clean up stale shmem segments on *nix. Attaching and detaching
    // should remove the segment if it is orphaned.
    QSharedMemory stale_shmem(shmemName);
    if (stale_shmem.attach())
        stale_shmem.detach();
#endif

    QSharedMemory shmem(shmemName);
    bool is_running;
    if (shmem.attach())
    {
        is_running = true;
    }
    else
    {
        shmem.create(1);
        is_running = false;
    }
    sema.release();

    QSettings settings;

    if (is_running){
        addrFile.open(QIODevice::ReadOnly | QIODevice::Text);
        QTextStream in(&addrFile);
        QString addr = in.readLine();

        QString cmd = settings.value("BrowserCommand").toString();

        if (!cmd.isEmpty())
        {
            cmd.replace("%URL%", addr);
            QProcess::startDetached(cmd);
        }
        else
        {
            if (!QDesktopServices::openUrl(addr))
            {
                QString error(QWidget::tr("Failed to open the system default web browser. Is one installed?."));
                QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

                exit(1);
            }
        }

        return 0;
    }

    atexit(cleanup);

    // In windows and linux, it is required to set application level proxy
    // because socket bind logic to find free port gives socket creation error
    // when system proxy is configured. We are also setting
    // "setUseSystemConfiguration"=true to use the system proxy which will
    // override this application level proxy. As this bug is fixed in Qt 5.9 so
    // need to set application proxy for Qt version < 5.9.
    //
#if defined (Q_OS_WIN) && QT_VERSION <= 0x050800
    // Give dummy URL required to find proxy server configured in windows.
    QNetworkProxyQuery proxyQuery(QUrl("https://www.pgadmin.org"));
    QNetworkProxy l_proxy;
    QList<QNetworkProxy> listOfProxies = QNetworkProxyFactory::systemProxyForQuery(proxyQuery);

    if (listOfProxies.size())
    {
        l_proxy = listOfProxies[0];

        // If host name is not empty means proxy server is configured.
        if (!l_proxy.hostName().isEmpty()) {
            QNetworkProxy::setApplicationProxy(QNetworkProxy());
        }
    }
#endif

#if defined (Q_OS_LINUX) && QT_VERSION <= 0x050800
    QByteArray proxy_env;
    proxy_env = qgetenv("http_proxy");
    // If http_proxy environment is defined in linux then proxy server is configured.
    if (!proxy_env.isEmpty()) {
        QNetworkProxy::setApplicationProxy(QNetworkProxy());
    }
#endif

    // Display the spash screen
    QSplashScreen *splash = new QSplashScreen();
    splash->setPixmap(QPixmap(":/splash.png"));
    splash->setWindowFlags(splash->windowFlags() | Qt::WindowStaysOnTopHint);
    splash->show();
    app.processEvents(QEventLoop::AllEvents);

    quint16 port = 0L;

    if (settings.value("FixedPort", false).toBool())
    {
        // Use the fixed port number
        port = settings.value("PortNumber", 5050).toInt();
    }
    else
    {
        // Find an unused port number. Essentially, we're just reserving one
        // here that Flask will use when we start up the server.
#if QT_VERSION >= 0x050000
        QTcpSocket socket;

        #if QT_VERSION >= 0x050900
        socket.setProxy(QNetworkProxy::NoProxy);
        #endif

        socket.bind(0, QTcpSocket::ShareAddress);
#else
        QUdpSocket socket;
        socket.bind(0, QUdpSocket::ShareAddress);
#endif
        port = socket.localPort();
    }

    // Generate a random key to authenticate the client to the server
    QString key = QUuid::createUuid().toString();
    key = key.mid(1, key.length() - 2);

    // Generate the filename for the log
    logFileName = homeDir + (QString("/.%1.%2.log").arg(PGA_APP_NAME).arg(exeHash)).remove(" ");

    // Create Menu Actions
    MenuActions *menuActions = new MenuActions();
    if(menuActions != NULL)
        menuActions->setLogFile(logFileName);

    splash->showMessage(QString(QWidget::tr("Checking for system tray...")), Qt::AlignBottom | Qt::AlignCenter);

    // Check system tray is available or not. If not then create one floating window.
    FloatingWindow *floatingWindow = NULL;
    TrayIcon *trayicon = NULL;
    if (QSystemTrayIcon::isSystemTrayAvailable())
    {
        // Start the tray service
        trayicon = new TrayIcon();

        // Set the MenuActions object to connect to slot
        if (trayicon != NULL)
            trayicon->setMenuActions(menuActions);

        trayicon->Init();
    }
    else
    {
        splash->showMessage(QString(QWidget::tr("System tray not found, creating floating window...")), Qt::AlignBottom | Qt::AlignCenter);
        // Unable to find tray icon, so creating floting window
        floatingWindow = new FloatingWindow();
        if (floatingWindow == NULL)
        {
            QString error = QString(QWidget::tr("Unable to initialize either a tray icon or control window."));
            QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

            exit(1);
        }

        // Set the MenuActions object to connect to slot
        floatingWindow->setMenuActions(menuActions);
        floatingWindow->Init();
    }

    // Fire up the webserver
    Server *server;

    bool done = false;

    splash->showMessage(QString(QWidget::tr("Starting pgAdmin4 server...")), Qt::AlignBottom | Qt::AlignCenter);
    while (done != true)
    {
        server = new Server(port, key, logFileName);

        if (!server->Init())
        {
            splash->finish(NULL);

            qDebug() << server->getError();

            QString error = QString(QWidget::tr("An error occurred initialising the application server:\n\n%1")).arg(server->getError());
            QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

            exit(1);
        }

        server->start();

        // This is a hack to give the server a chance to start and potentially fail. As
        // the Python interpreter is a synchronous call, we can't check for proper startup
        // easily in a more robust way - we have to rely on a clean startup not returning.
        // It should always fail pretty quickly, and take longer to start if it succeeds, so
        // we don't really get a visible delay here.
        delay(1000);

        // Any errors?
        if (server->isFinished() || server->getError().length() > 0)
        {
            splash->finish(NULL);

            qDebug() << server->getError();

            QString error = QString(QWidget::tr("An error occurred initialising the application server:\n\n%1")).arg(server->getError());
            QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

            // Allow the user to tweak the Python Path if needed
            bool ok;

            ConfigWindow *dlg = new ConfigWindow();
            dlg->setWindowTitle(QWidget::tr("Configuration"));
            dlg->setBrowserCommand(settings.value("BrowserCommand").toString());
            dlg->setPythonPath(settings.value("PythonPath").toString());
            dlg->setApplicationPath(settings.value("ApplicationPath").toString());
            dlg->setModal(true);
            ok = dlg->exec();

            QString browsercommand = dlg->getBrowserCommand();
            QString pythonpath = dlg->getPythonPath();
            QString applicationpath = dlg->getApplicationPath();

            if (ok)
            {
                settings.setValue("BrowserCommand", browsercommand);
                settings.setValue("PythonPath", pythonpath);
                settings.setValue("ApplicationPath", applicationpath);
                settings.sync();
            }
            else
            {
                exit(1);
            }

            delete server;
        }
        else
            done = true;
    }

    // Ensure the server gets cleaned up later
    QObject::connect(server, SIGNAL(finished()), server, SLOT(deleteLater()));

    // Generate the app server URL
    QString appServerUrl = QString("http://127.0.0.1:%1/?key=%2").arg(port).arg(key);

    // Read the server connection timeout from the registry or set the default timeout.
    int timeout = settings.value("ConnectionTimeout", 30).toInt();

    // Now the server should be up, we'll attempt to connect and get a response.
    // We'll retry in a loop a few time before aborting if necessary.

    QTime endTime = QTime::currentTime().addSecs(timeout);
    bool alive = false;

    while(QTime::currentTime() <= endTime)
    {
        alive = PingServer(QUrl(appServerUrl));

        if (alive)
        {
            break;
        }

        delay(200);
    }

    // Attempt to connect one more time in case of a long network timeout while looping
    if (!alive && !PingServer(QUrl(appServerUrl)))
    {
        splash->finish(NULL);
        QString error(QWidget::tr("The application server could not be contacted."));
        QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

        exit(1);
    }

    // Stash the URL for any duplicate processes to open
    if (addrFile.open(QIODevice::WriteOnly))
    {
        addrFile.setPermissions(QFile::ReadOwner|QFile::WriteOwner);
        QTextStream out(&addrFile);
        out << appServerUrl << endl;
    }

    // Go!
    menuActions->setAppServerUrl(appServerUrl);

    // Enable the shutdown server menu as server started successfully.
    if (trayicon != NULL)
        trayicon->enableShutdownMenu();
    if (floatingWindow != NULL)
        floatingWindow->enableShutdownMenu();

    QString cmd = settings.value("BrowserCommand").toString();

    if (!cmd.isEmpty())
    {
        cmd.replace("%URL%", appServerUrl);
        QProcess::startDetached(cmd);
    }
    else
    {
        if (!QDesktopServices::openUrl(appServerUrl))
        {
            QString error(QWidget::tr("Failed to open the system default web browser. Is one installed?."));
            QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

            exit(1);
        }
    }

    QObject::connect(menuActions, SIGNAL(shutdownSignal(QUrl)), server, SLOT(shutdown(QUrl)));
    splash->finish(NULL);

    if (floatingWindow != NULL)
        floatingWindow->show();

    return app.exec();
}


// Ping the application server to see if it's alive
bool PingServer(QUrl url)
{
    QNetworkAccessManager manager;
    QEventLoop loop;
    QNetworkReply *reply;
    QVariant redirectUrl;

    url.setPath("/misc/ping");

    do
    {
        reply = manager.get(QNetworkRequest(url));

        QObject::connect(reply, SIGNAL(finished()), &loop, SLOT(quit()));
        loop.exec();

        redirectUrl = reply->attribute(QNetworkRequest::RedirectionTargetAttribute);
        url = redirectUrl.toUrl();

        if (!redirectUrl.isNull())
            delete reply;

    } while (!redirectUrl.isNull());

    if (reply->error() != QNetworkReply::NoError)
    {
        return false;
    }

    QString response = reply->readAll();

    if (response != "PING")
    {
        qDebug() << "Failed to connect, server response: " << response;
        return false;
    }

    return true;
}


void delay(int milliseconds)
{
    QTime endTime = QTime::currentTime().addMSecs(milliseconds);
    while(QTime::currentTime() < endTime)
    {
        QCoreApplication::processEvents(QEventLoop::AllEvents, 100);
    }
}


void cleanup()
{
    // Remove the address file
    QFile addrFile(addrFileName);
    addrFile.remove();

    // Remove the log file
    QFile logFile(logFileName);
    logFile.remove();
}


unsigned long sdbm(unsigned char *str)
{
    unsigned long hash = 0;
    int c;

    while ((c = *str++))
        hash = c + (hash << 6) + (hash << 16) - hash;

    return hash;
}

// Shutdown the application server
bool shutdownServer(QUrl url)
{
    QNetworkAccessManager manager;
    QEventLoop loop;
    QNetworkReply *reply;
    QVariant redirectUrl;

    url.setPath("/misc/shutdown");

    do
    {
        reply = manager.get(QNetworkRequest(url));

        QObject::connect(reply, SIGNAL(finished()), &loop, SLOT(quit()));
        loop.exec();

        redirectUrl = reply->attribute(QNetworkRequest::RedirectionTargetAttribute);
        url = redirectUrl.toUrl();

        if (!redirectUrl.isNull())
            delete reply;

    } while (!redirectUrl.isNull());

    if (reply->error() != QNetworkReply::NoError)
    {
        return false;
    }

    QString response = reply->readAll();

    if (response != "SHUTDOWN")
    {
        qDebug() << "Failed to connect, server response: " << response;
        return false;
    }

    return true;
}
