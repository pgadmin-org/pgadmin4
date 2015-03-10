//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// pgAdmin4.cpp - Main application entry point
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

// Must be before QT
#include <Python.h>

// QT headers
#include <QtGlobal>

#if QT_VERSION >= 0x050000
#include <QtWidgets>
#else
#include <QApplication>
#include <QDebug>
#endif

// App headers
#include "BrowserWindow.h"
#include "Server.h"

int main(int argc, char * argv[])
{
    // Create the QT application
    QApplication app(argc, argv);

    // Setup the settings management
    QCoreApplication::setOrganizationName("pgAdmin Development Team");
    QCoreApplication::setOrganizationDomain("pgadmin.org");
    QCoreApplication::setApplicationName(PGA_APP_NAME);

    // Find an unused port number. Essentially, we're just reserving one
    // here that Flask will use when we start up the server.
    QTcpSocket socket;
    socket.bind(0, QAbstractSocket::DontShareAddress);
    quint16 port = socket.localPort();

    // Fire up the webserver
    Server *server = new Server(port);

    if (!server->Init())
    {
        qDebug() << server->getError();

        QString error = QString(QWidget::tr("An error occurred initialising the application server:\n\n%1")).arg(server->getError());
        QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);
	
        exit(1);
    }

    server->start();

    // This is a hack. Wait a second and then check to see if the server thread
    // is still running. If it's not, we probably had a startup error
    sleep(1);

    // Any errors?
    if (server->isFinished() || server->getError().length() > 0)
    {
        qDebug() << server->getError();

        QString error = QString(QWidget::tr("An error occurred initialising the application server:\n\n%1")).arg(server->getError());
        QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

        // Allow the user to tweak the Python Path if needed
        QSettings settings;
        bool ok;

        QString path = QInputDialog::getText(NULL, QWidget::tr("Python Path"), QWidget::tr("Set the Python search path:"), QLineEdit::Normal, settings.value("PythonPath").toString(), &ok);

        if (ok)
            settings.setValue("PythonPath", path);

        exit(1);
    }

    // Generate the app server URL
    QString appServerUrl = QString("http://localhost:%1/").arg(port);

    // Now the server should be up, we'll attempt to connect and get a response.
    // We'll retry in a loop a few time before aborting if necessary. The browser
    // will also retry - that shouldn't (in theory) be necessary, but it won't
    // hurt.
    int attempt = 0;
    while (attempt++ < 3)
    {
        bool alive = PingServer(QUrl(appServerUrl));

        if (alive)
        {
            break;
        }

        if (attempt == 10)
        {
            QString error(QWidget::tr("The application server could not be contacted."));
            QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

            exit(1);
        }

        sleep(1);
    }

    // Create & show the main window
    BrowserWindow browserWindow(appServerUrl);
    browserWindow.show();

    // Go!
    return app.exec();
}


// Ping the application server to see if it's alive
bool PingServer(QUrl url)
{
    QNetworkAccessManager manager;
    QEventLoop loop;
    QNetworkReply *reply;
    QVariant redirectUrl;

    url.setPath("/ping");

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

