//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// Runtime.cpp - Core of the runtime
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"
#include "Runtime.h"
#include "Server.h"
#include "TrayIcon.h"
#include "MenuActions.h"
#include "ConfigWindow.h"
#include "FloatingWindow.h"
#include "Logger.h"

#ifdef Q_OS_MAC
#include "macos.h"
#endif

// Must be before QT
#include <Python.h>

#include <QtWidgets>
#include <QNetworkProxyFactory>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QTime>


Runtime::Runtime()
{

}


bool Runtime::go(int argc, char *argv[])
{
    // Before starting main application, need to set 'QT_X11_NO_MITSHM=1'
    // to make the runtime work with IBM PPC machines.
#if defined (Q_OS_LINUX)
    QByteArray val("1");
    qputenv("QT_X11_NO_MITSHM", val);
#endif

    // Create the QT application
    QApplication app(argc, argv);
    app.setQuitOnLastWindowClosed(false);

    // Setup look n feel
    setupStyling(&app);

    // Setup the settings management
    QCoreApplication::setOrganizationName("pgadmin");
    QCoreApplication::setOrganizationDomain("pgadmin.org");
    QCoreApplication::setApplicationName("pgadmin4");

    QSettings settings;

    // Interlock
    if (alreadyRunning())
        exit(0);

    // Proxy config
    configureProxy();

    // Display the spash screen
    m_splash = displaySplash(&app);

    // Generate a random key to authenticate the client to the server
    QString key = QUuid::createUuid().toString();
    key = key.mid(1, key.length() - 2);

    // Create Menu Actions
    MenuActions *menuActions = new MenuActions();

    // Create the control object (tray icon or floating window
    m_splash->showMessage(QString(QWidget::tr("Checking for system tray...")), Qt::AlignBottom | Qt::AlignCenter);

    if (QSystemTrayIcon::isSystemTrayAvailable())
        m_trayIcon = createTrayIcon(menuActions);
    else
        m_floatingWindow = createFloatingWindow(menuActions);

    // Fire up the app server
    const Server *server = startServerLoop(key);

    // Ensure we'll cleanup
    QObject::connect(server, SIGNAL(finished()), server, SLOT(deleteLater()));
    atexit(cleanup);

    // Generate the app server URL
    QString url = QString("http://127.0.0.1:%1/?key=%2").arg(m_port).arg(key);
    Logger::GetLogger()->Log(QString(QWidget::tr("Application Server URL: %1")).arg(url));

    // Check the server is running
    checkServer(url);

    // Stash the URL for any duplicate processes to open
    createAddressFile(url);

    // Go!
    menuActions->setAppServerUrl(url);

    // Enable the shutdown server menu as server started successfully.
    if (m_trayIcon != Q_NULLPTR)
        m_trayIcon->enablePostStartOptions();
    if (m_floatingWindow != Q_NULLPTR)
        m_floatingWindow->enablePostStartOptions();

    // Open the browser if needed
    if (settings.value("OpenTabAtStartup", true).toBool())
        openBrowserTab(url);

    // Make sure the server is shutdown if the server is quit by the user
    QObject::connect(menuActions, SIGNAL(shutdownSignal(QUrl)), server, SLOT(shutdown(QUrl)));

    // Final cleanup
    m_splash->finish(Q_NULLPTR);

    if (m_floatingWindow != Q_NULLPTR)
        m_floatingWindow->show();

    Logger::GetLogger()->Log("Everything works fine, successfully started pgAdmin4.");
    Logger::ReleaseLogger();
    return app.exec();
}


// Setup the styling
void Runtime::setupStyling(QApplication *app) const
{
    // Setup the styling
#ifndef Q_OS_LINUX
    QFile stylesheet;

#ifdef Q_OS_WIN32
    QSettings registry("HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", QSettings::Registry64Format);
    if (!registry.value("AppsUseLightTheme", true).toBool())
    {
        qDebug( "Windows Dark Mode..." );
        stylesheet.setFileName(":/qdarkstyle/style.qss");
        stylesheet.open(QFile::ReadOnly | QFile::Text);
        QTextStream stream(&stylesheet);
        app->setStyleSheet(stream.readAll());
    }
#endif

#ifdef Q_OS_MAC
    if (IsDarkMode())
    {
        qDebug( "macOS Dark Mode...");
        stylesheet.setFileName(":/qdarkstyle/style.qss");
        stylesheet.open(QFile::ReadOnly | QFile::Text);
        QTextStream stream(&stylesheet);
        app->setStyleSheet(stream.readAll());
    }
#endif
#endif

    // Set high DPI pixmap to display icons clear on Qt widget.
    QApplication::setAttribute(Qt::AA_UseHighDpiPixmaps);
}

// Check if we're already running. If we are, open a new browser tab.
bool Runtime::alreadyRunning()
{
    // Create a system-wide semaphore keyed by app name, exe hash and the username
    // to ensure instances are unique to the user and path
    QString userName = qgetenv("USER"); // *nix
    if (userName.isEmpty())
        userName = qgetenv("USERNAME"); // Windows

    QString semaName = QString("pgadmin4-%1-%2-sema").arg(userName).arg(getExeHash());
    QString shmemName = QString("pgadmin4-%1-%2-shmem").arg(userName).arg(getExeHash());
    qDebug() << "Semaphore name:" << semaName;
    qDebug() << "Shared memory segment name:" << shmemName;

    QSystemSemaphore sema(semaName, 1);
    sema.acquire();

#ifndef Q_OS_WIN32
    // We may need to clean up stale shmem segments on *nix. Attaching and detaching
    // should remove the segment if it is orphaned.
    QSharedMemory stale_shmem(shmemName);
    if (stale_shmem.attach())
        stale_shmem.detach();
#endif

    m_shmem = new QSharedMemory(shmemName);
    bool is_running;
    if (m_shmem->attach())
        is_running = true;
    else
    {
        m_shmem->create(1);
        is_running = false;
    }
    sema.release();

    if (is_running)
    {
        QFile addressFile(g_addressFile);
        addressFile.open(QIODevice::ReadOnly | QIODevice::Text);
        QTextStream in(&addressFile);
        QString url = in.readLine();

        qDebug() << "Already running. Opening browser tab to: " << url << "and exiting.";
        openBrowserTab(url);
        return true;
    }

    return false;
}


void Runtime::configureProxy() const
{
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
}


// Display the splash screen
QSplashScreen * Runtime::displaySplash(QApplication *app)
{
    QSplashScreen *splash = new QSplashScreen();
    splash->setPixmap(QPixmap(":/splash.png"));
    splash->setWindowFlags(splash->windowFlags() | Qt::WindowStaysOnTopHint);
    splash->show();
    app->processEvents(QEventLoop::AllEvents);

    return splash;
}


// Get the port number we're going to use
quint16 Runtime::getPort() const
{
    quint16 port = 0L;
    QSettings settings;

    if (settings.value("FixedPort", false).toBool())
    {
        // Use the fixed port number
        port = settings.value("PortNumber", 5050).toUInt();
    }
    else
    {
        // Find an unused port number. Essentially, we're just reserving one
        // here that Flask will use when we start up the server.
        QTcpSocket socket;

#if QT_VERSION >= 0x050900
        socket.setProxy(QNetworkProxy::NoProxy);
#endif

        socket.bind(0, QTcpSocket::ShareAddress);
        port = socket.localPort();
    }

    return port;
}


// Create a tray icon
TrayIcon * Runtime::createTrayIcon(MenuActions *menuActions)
{
    TrayIcon *trayIcon = Q_NULLPTR;

    m_splash->showMessage(QString(QWidget::tr("Checking for system tray...")), Qt::AlignBottom | Qt::AlignCenter);
    Logger::GetLogger()->Log("Checking for system tray...");

    // Start the tray service
    trayIcon = new TrayIcon();

    // Set the MenuActions object to connect to slot
    if (trayIcon != Q_NULLPTR)
        trayIcon->setMenuActions(menuActions);

    trayIcon->Init();

    return trayIcon;
}


// Create a floating window
FloatingWindow * Runtime::createFloatingWindow(MenuActions *menuActions)
{
    FloatingWindow *floatingWindow = Q_NULLPTR;

    m_splash->showMessage(QString(QWidget::tr("System tray not found, creating floating window...")), Qt::AlignBottom | Qt::AlignCenter);
    Logger::GetLogger()->Log("System tray not found, creating floating window...");
    floatingWindow = new FloatingWindow();
    if (floatingWindow == Q_NULLPTR)
    {
        QString error = QString(QWidget::tr("Unable to initialize either a tray icon or floating window."));
        QMessageBox::critical(Q_NULLPTR, QString(QWidget::tr("Fatal Error")), error);
        Logger::GetLogger()->Log(error);
        Logger::ReleaseLogger();
        exit(1);
    }

    // Set the MenuActions object to connect to slot
    floatingWindow->setMenuActions(menuActions);
    floatingWindow->Init();

    return floatingWindow;
}


void Runtime::openConfigureWindow(const QString errorMsg)
{
    m_splash->finish(Q_NULLPTR);

    qDebug() << errorMsg;
    QMessageBox::critical(Q_NULLPTR, QString(QWidget::tr("Fatal Error")), errorMsg);
    Logger::GetLogger()->Log(errorMsg);

    // Allow the user to tweak the configuration if needed
    m_configDone = false;
    QSettings settings;
    bool oldFixedPort = settings.value("FixedPort", false).toBool();


    ConfigWindow *dlg = new ConfigWindow();
    dlg->setAttribute(Qt::WA_DeleteOnClose);
    dlg->show();
    dlg->raise();
    dlg->activateWindow();
    QObject::connect(dlg, SIGNAL(closing(bool)), this, SLOT(onConfigDone(bool)));

    // Wait for configuration to be completed
    while (!m_configDone)
        delay(100);

    // Read the value of port again if user has changed.
    bool newFixedPort = settings.value("FixedPort", false).toBool();
    quint16 newPort = settings.value("PortNumber").toUInt();

    // User hasn't changed the value of fixed port check box
    // only change the value of the port
    if (oldFixedPort == newFixedPort && newFixedPort && m_port != newPort)
        m_port = newPort;
    // User has selected the fixed port and it's old value is random port,
    // so port needs to be updated.
    else if (oldFixedPort != newFixedPort && newFixedPort)
        m_port = newPort;
    // User has deselect the fixed port and it's old value is fixed port,
    // so we will have to get the random port
    else if (oldFixedPort != newFixedPort && !newFixedPort)
        m_port = getPort();
}

// Server startup loop
Server * Runtime::startServerLoop(QString key)
{
    bool done = false;
    Server *server;

    // Get the port number to use
    m_port = getPort();

    while (!done)
    {
        server = startServer(key);
        if (server == NULL)
        {
            Logger::ReleaseLogger();
            QApplication::quit();
        }

        // Check for server startup errors
        if (server->isFinished() || server->getError().length() > 0)
        {
            QString error = QString(QWidget::tr("An error occurred initialising the pgAdmin 4 server:\n\n%1")).arg(server->getError());

            delete server;

            // Enable the View Log option for diagnostics
            if (m_floatingWindow)
                m_floatingWindow->enableViewLogOption();
            if (m_trayIcon)
                m_trayIcon->enableViewLogOption();

            // Open the configuration window
            openConfigureWindow(error);

            // Disable the View Log option again
            if (m_floatingWindow)
                m_floatingWindow->disableViewLogOption();
            if (m_trayIcon)
                m_trayIcon->disableViewLogOption();
        }
        else
        {
            // Startup appears successful
            done = true;
        }
    }

    return server;
}


// Slot called when re-configuration is done.
void Runtime::onConfigDone(bool accepted)
{
    if (accepted)
        m_configDone = true;
    else
        exit(0);
}


// Start the server
Server * Runtime::startServer(QString key)
{
    Server *server;

    m_splash->showMessage(QString(QWidget::tr("Starting pgAdmin4 server...")), Qt::AlignBottom | Qt::AlignCenter);
    Logger::GetLogger()->Log("Starting pgAdmin4 server...");

    QString msg = QString(QWidget::tr("Creating server object, port:%1, key:%2, logfile:%3")).arg(m_port).arg(key).arg(g_serverLogFile);
    Logger::GetLogger()->Log(msg);
    server = new Server(this, m_port, key, g_serverLogFile);

    Logger::GetLogger()->Log("Initializing server...");
    if (!server->Init())
    {
        m_splash->finish(Q_NULLPTR);

        qDebug() << server->getError();

        QString error = QString(QWidget::tr("An error occurred initialising the pgAdmin 4 server:\n\n%1")).arg(server->getError());
        QMessageBox::critical(Q_NULLPTR, QString(QWidget::tr("Fatal Error")), error);

        Logger::GetLogger()->Log(error);
        Logger::ReleaseLogger();

        exit(1);
    }

    Logger::GetLogger()->Log("Server initialized, starting server thread...");
    server->start();

    // This is a hack to give the server a chance to start and potentially fail. As
    // the Python interpreter is a synchronous call, we can't check for proper startup
    // easily in a more robust way - we have to rely on a clean startup not returning.
    // It should always fail pretty quickly, and take longer to start if it succeeds, so
    // we don't really get a visible delay here.
    delay(1000);

    return server;
}


// Check the server is running properly
void Runtime::checkServer(QString url)
{
    // Read the server connection timeout from the registry or set the default timeout.
    QSettings settings;
    int timeout = settings.value("ConnectionTimeout", 90).toInt();

    // Now the server should be up, we'll attempt to connect and get a response.
    // We'll retry in a loop a few time before aborting if necessary.

    QTime endTime = QTime::currentTime().addSecs(timeout);
    QTime midTime1 = QTime::currentTime().addSecs(timeout/3);
    QTime midTime2 = QTime::currentTime().addSecs(timeout*2/3);
    bool alive = false;
    bool enableOptions = false;

    Logger::GetLogger()->Log("The server should be up. Attempting to connect and get a response.");
    while(QTime::currentTime() <= endTime)
    {
        alive = pingServer(QUrl(url));

        if (alive)
        {
            break;
        }

        if(QTime::currentTime() >= midTime1)
        {
            if (m_floatingWindow && !enableOptions)
            {
                m_floatingWindow->enableViewLogOption();
                m_floatingWindow->enableConfigOption();
                enableOptions = true;
            }

            if (m_trayIcon && !enableOptions)
            {
                m_trayIcon->enableViewLogOption();
                m_trayIcon->enableConfigOption();
                enableOptions = true;
            }

            if(QTime::currentTime() < midTime2) {
                m_splash->showMessage(QString(QWidget::tr("Taking longer than usual...")), Qt::AlignBottom | Qt::AlignCenter);
            }
            else
            {
                m_splash->showMessage(QString(QWidget::tr("Almost there...")), Qt::AlignBottom | Qt::AlignCenter);
            }
        }

        delay(200);
    }

    // Attempt to connect one more time in case of a long network timeout while looping
    Logger::GetLogger()->Log("Attempt to connect one more time in case of a long network timeout while looping");
    if (!alive && !pingServer(QUrl(url)))
    {
        m_splash->finish(Q_NULLPTR);
        QString error(QWidget::tr("The pgAdmin 4 server could not be contacted."));
        QMessageBox::critical(Q_NULLPTR, QString(QWidget::tr("Fatal Error")), error);

        Logger::ReleaseLogger();
        exit(1);
    }
}


// Create the address file
void Runtime::createAddressFile(QString url) const
{
    QFile addressFile(g_addressFile);
    if (addressFile.open(QIODevice::WriteOnly))
    {
        addressFile.setPermissions(QFile::ReadOwner|QFile::WriteOwner);
        QTextStream out(&addressFile);
        out << url << endl;
    }
}


// Open a browser tab
void Runtime::openBrowserTab(QString url) const
{
    QSettings settings;
    QString cmd = settings.value("BrowserCommand").toString();

    if (!cmd.isEmpty())
    {
        cmd.replace("%URL%", url);
        QProcess::startDetached(cmd);
    }
    else
    {
        if (!QDesktopServices::openUrl(url))
        {
            QString error(QWidget::tr("Failed to open the system default web browser. Is one installed?."));
            QMessageBox::critical(Q_NULLPTR, QString(QWidget::tr("Fatal Error")), error);

            Logger::GetLogger()->Log(error);
            Logger::ReleaseLogger();
            exit(1);
        }
    }
}


// Make a request to the Python API server
QString Runtime::serverRequest(QUrl url, QString path)
{
    QNetworkAccessManager manager;
    QEventLoop loop;
    QNetworkReply *reply;
    QVariant redirectUrl;


    url.setPath(path);
    QString requestUrl = url.toString();

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
        qDebug() << "Failed to connect to the server:" << reply->errorString() << "- request URL:" << requestUrl << ".";
        return QString();
    }

    QString response = reply->readAll();
    qDebug() << "Server response:" << response << "- request URL:" << requestUrl << ".";

    return response;
}


// Ping the application server to see if it's alive
bool Runtime::pingServer(QUrl url)
{
    return serverRequest(url, "/misc/ping") == "PING";
}


// Shutdown the application server
bool Runtime::shutdownServer(QUrl url)
{
    return serverRequest(url, "/misc/shutdown") == "SHUTDOWN";
}


void Runtime::delay(int milliseconds) const
{
    QTime endTime = QTime::currentTime().addMSecs(milliseconds);
    while(QTime::currentTime() < endTime)
    {
        QCoreApplication::processEvents(QEventLoop::AllEvents, 100);
    }
}

