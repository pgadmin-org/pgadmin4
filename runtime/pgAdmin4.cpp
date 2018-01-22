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
#include <QSslConfiguration>
#endif

// App headers
#include "ConfigWindow.h"
#include "Server.h"
#include "TrayIcon.h"

#include <QTime>

// Implement support for system proxies for Qt 4.x on Linux
#if defined (Q_OS_LINUX) && QT_VERSION < 0x050000

#include "qnetworkproxy.h"

#include <QtCore/QByteArray>
#include <QtCore/QUrl>

#ifndef QT_NO_NETWORKPROXY

QT_BEGIN_NAMESPACE

static bool ignoreProxyFor(const QNetworkProxyQuery &query)
{
    const QByteArray noProxy = qgetenv("no_proxy").trimmed();
    if (noProxy.isEmpty())
        return false;

    const QList<QByteArray> noProxyTokens = noProxy.split(',');

    foreach (const QByteArray &rawToken, noProxyTokens) {
        QByteArray token = rawToken.trimmed();
        QString peerHostName = query.peerHostName();

        // Since we use suffix matching, "*" is our 'default' behaviour
        if (token.startsWith("*"))
            token = token.mid(1);

        // Harmonize trailing dot notation
        if (token.endsWith('.') && !peerHostName.endsWith('.'))
            token = token.left(token.length()-1);

        // We prepend a dot to both values, so that when we do a suffix match,
        // we don't match "donotmatch.com" with "match.com"
        if (!token.startsWith('.'))
            token.prepend('.');

        if (!peerHostName.startsWith('.'))
            peerHostName.prepend('.');

        if (peerHostName.endsWith(QString::fromLatin1(token)))
            return true;
    }

    return false;
}

static QList<QNetworkProxy> pgAdminSystemProxyForQuery(const QNetworkProxyQuery &query)
{
    QList<QNetworkProxy> proxyList;

    if (ignoreProxyFor(query))
        return proxyList << QNetworkProxy::NoProxy;

    // No need to care about casing here, QUrl lowercases values already
    const QString queryProtocol = query.protocolTag();
    QByteArray proxy_env;

    if (queryProtocol == QLatin1String("http"))
        proxy_env = qgetenv("http_proxy");
    else if (queryProtocol == QLatin1String("https"))
        proxy_env = qgetenv("https_proxy");
    else if (queryProtocol == QLatin1String("ftp"))
        proxy_env = qgetenv("ftp_proxy");
    else
        proxy_env = qgetenv("all_proxy");

    // Fallback to http_proxy is no protocol specific proxy was found
    if (proxy_env.isEmpty())
        proxy_env = qgetenv("http_proxy");

    if (!proxy_env.isEmpty()) 
    {
        QUrl url = QUrl(QString::fromLocal8Bit(proxy_env));
	if (url.scheme() == QLatin1String("socks5"))
	{
	    QNetworkProxy proxy(QNetworkProxy::Socks5Proxy, url.host(),
				url.port() ? url.port() : 1080, url.userName(), url.password());
	    proxyList << proxy;
	} else if (url.scheme() == QLatin1String("socks5h"))
	{
	    QNetworkProxy proxy(QNetworkProxy::Socks5Proxy, url.host(),
				url.port() ? url.port() : 1080, url.userName(), url.password());
	    proxy.setCapabilities(QNetworkProxy::HostNameLookupCapability);
	    proxyList << proxy;
	} else if ((url.scheme() == QLatin1String("http") || url.scheme() == QLatin1String("https") || url.scheme().isEmpty())
		   && query.queryType() != QNetworkProxyQuery::UdpSocket
		   && query.queryType() != QNetworkProxyQuery::TcpServer)
	{
	    QNetworkProxy proxy(QNetworkProxy::HttpProxy, url.host(),
				url.port() ? url.port() : 8080, url.userName(), url.password());
	    proxyList << proxy;
	}
    }
    if (proxyList.isEmpty())
        proxyList << QNetworkProxy::NoProxy;

    return proxyList;
}

class pgAdminSystemConfigurationProxyFactory : public QNetworkProxyFactory
{
public:
    pgAdminSystemConfigurationProxyFactory() : QNetworkProxyFactory() {}

    virtual QList<QNetworkProxy> queryProxy(const QNetworkProxyQuery& query)
    {
        QList<QNetworkProxy> proxies = pgAdminSystemProxyForQuery(query);

        // Make sure NoProxy is in the list, so that QTcpServer can work:
        // it searches for the first proxy that can has the ListeningCapability capability
        // if none have (as is the case with HTTP proxies), it fails to bind.
        // NoProxy allows it to fallback to the 'no proxy' case and bind.
        proxies.append(QNetworkProxy::NoProxy);

        return proxies;
    }
};

QT_END_NAMESPACE

#endif // QT_NO_NETWORKINTERFACE

#endif


void delay( int milliseconds )
{
    QTime endTime = QTime::currentTime().addMSecs( milliseconds );
    while( QTime::currentTime() < endTime )
    {
        QCoreApplication::processEvents( QEventLoop::AllEvents, 100 );
    }
}

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

    // Check for an existing instance
    QString homeDir = QDir::homePath();
    QLockFile lockFile(homeDir + QString("/.%1.lock").arg(PGA_APP_NAME));
    QFile addrFile(homeDir + QString("/.%1.addr").arg(PGA_APP_NAME));

    if(!lockFile.tryLock(100)){
        addrFile.open(QIODevice::ReadOnly | QIODevice::Text);
        QTextStream in(&addrFile);
        QString addr = in.readLine();
        QDesktopServices::openUrl(addr);
        return 0;
    }

    atexit(cleanup);

    // In windows and linux, it is required to set application level proxy
    // becuase socket bind logic to find free port gives socket creation error
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
    splash->show();
    app.processEvents(QEventLoop::AllEvents);

    quint16 port = 0L;

    // Find an unused port number. Essentially, we're just reserving one
    // here that Flask will use when we start up the server.
    // In order to use the socket, we need to free this socket ASAP.
    // Hence - putting this code in a code block so the scope of the socket
    // variable vanishes to make that socket available.
    {
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

#if defined (Q_OS_LINUX) && QT_VERSION < 0x050000
    QNetworkProxyFactory::setApplicationProxyFactory(new pgAdminSystemConfigurationProxyFactory);
    QSslConfiguration sslCfg = QSslConfiguration::defaultConfiguration();
    QList<QSslCertificate> ca_list = sslCfg.caCertificates();
    QList<QSslCertificate> ca_new = QSslCertificate::fromData("CaCertificates");
    ca_list += ca_new;

    sslCfg.setCaCertificates(ca_list);
    sslCfg.setProtocol(QSsl::AnyProtocol);
    QSslConfiguration::setDefaultConfiguration(sslCfg);
#else
    QNetworkProxyFactory::setUseSystemConfiguration(true);
#endif

    // Start the tray service
    TrayIcon *trayicon = new TrayIcon();

    if (!trayicon->Init())
    {
        QString error = QString(QWidget::tr("An error occurred initialising the tray icon"));
        QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

        exit(1);
    }

    // Fire up the webserver
    Server *server;

    bool done = false;

    while (done != true)
    {
        server = new Server(port, key);

        if (!server->Init())
        {
            splash->finish(NULL);

            qDebug() << server->getError();

            QString error = QString(QWidget::tr("An error occurred initialising the application server:\n\n%1")).arg(server->getError());
            QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

            exit(1);
        }

        server->start();

        // Any errors?
        if (server->isFinished() || server->getError().length() > 0)
        {
            splash->finish(NULL);

            qDebug() << server->getError();

            QString error = QString(QWidget::tr("An error occurred initialising the application server:\n\n%1")).arg(server->getError());
            QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

            // Allow the user to tweak the Python Path if needed
            QSettings settings;
            bool ok;

            ConfigWindow *dlg = new ConfigWindow();
            dlg->setWindowTitle(QWidget::tr("Configuration"));
            dlg->setPythonPath(settings.value("PythonPath").toString());
            dlg->setApplicationPath(settings.value("ApplicationPath").toString());
            dlg->setModal(true);
            ok = dlg->exec();

            QString pythonpath = dlg->getPythonPath();
            QString applicationpath = dlg->getApplicationPath();

            if (ok)
            {
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


    // Generate the app server URL
    QString appServerUrl = QString("http://127.0.0.1:%1/?key=%2").arg(port).arg(key);

    // Read the server connection timeout from the registry or set the default timeout.
    QSettings settings;
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
        QTextStream out(&addrFile);
        out << appServerUrl << endl;
    }

    // Go!
    trayicon->setAppServerUrl(appServerUrl);
    if (!QDesktopServices::openUrl(appServerUrl))
    {
        QString error(QWidget::tr("Failed to open the system default web browser. Is one installed?."));
        QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

        exit(1);
    }
    splash->finish(NULL);

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

void cleanup()
{
    // Check for an existing instance
    QString homeDir = QDir::homePath();
    QFile addrFile(homeDir + QString("/.%1.addr").arg(PGA_APP_NAME));

    addrFile.remove();
}

