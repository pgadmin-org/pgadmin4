//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// Server.cpp - Thread in which the web server will run.
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

// Must be before QT
#include <Python.h>

// QT headers
#include <QDebug>
#include <QDir>
#include <QMessageBox>

// App headers
#include "Server.h"

Server::Server()
{
    // Initialise Python
    Py_SetProgramName(PGA_APPNAME.toUtf8().data());
    Py_Initialize();
}

Server::~Server()
{
    // Shutdown Python
    Py_Finalize();
}

bool Server::Init()
{
    // Find the webapp
    QStringList paths;
    paths.append("../web/"); // Windows/Linux source tree
    paths.append("../../../../web/"); // Mac source tree (in the app bundle)
    paths.append(""); // Should be last!

    for (int i = 0; i < paths.size(); ++i)
    {
        QDir dir(QCoreApplication::applicationDirPath() + "/" + paths[i]);
        m_appfile = dir.canonicalPath() + "/pgAdmin4.py";

        if (QFile::exists(m_appfile))
        {
            qDebug() << "Webapp path: " << m_appfile;
            break;
        }
    }

    if (!QFile::exists(m_appfile))
    {
	setError("Failed to locate pgAdmin4.py, terminating server thread.");
        return false;
    }

    return true;
}

void Server::run()
{
    // Open the application code and run it.
    FILE *cp = fopen(m_appfile.toUtf8().data(), "r");
    if (!cp)
    {
        setError("Failed to open the application file: " + m_appfile + ", server thread exiting.");
        return;
    }

    if (PyRun_SimpleFile(cp, m_appfile.toUtf8().data()) != 0)
        setError("Failed to launch the application server, server thread exiting.");

    fclose(cp);
}
