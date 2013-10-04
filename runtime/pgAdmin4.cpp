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

    // Find an unused port number.
    QTcpSocket socket;
    socket.bind(0, QAbstractSocket::DontShareAddress);
    quint16 port = socket.localPort();

    // Fire up the webserver
    Server *server = new Server(port);

    if (!server->Init())
    {
        qDebug() << server->getError();

        QString error("An error occurred initialising the application server:\n\n" + server->getError());
        QMessageBox::critical(NULL, QString("Fatal Error"), error);
	
        exit(1);
    }

    server->start();

    // Create & show the main window
    BrowserWindow browserWindow(port);
    browserWindow.show();

    // Go!
    return app.exec();
}

