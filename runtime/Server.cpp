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

Server::Server(quint16 port)
{    
    // Appserver port
    m_port = port;

    // Initialise Python
    Py_SetProgramName(PGA_APP_NAME.toUtf8().data());
    Py_Initialize();

    // Setup the search path
    QSettings settings;
    QString python_path = settings.value("PythonPath").toString();

    if (python_path.length() > 0)
    {
        PyObject* sysPath = PySys_GetObject((char*)"path");
        PyList_Append(sysPath, PyString_FromString(python_path.toUtf8().data()));
    }
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
        setError(tr("Failed to locate pgAdmin4.py, terminating server thread."));
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
        setError(QString(tr("Failed to open the application file: %1, server thread exiting.")).arg(m_appfile));
        return;
    }

    // Set the port number
    PyRun_SimpleString(QString("PGADMIN_PORT = %1").arg(m_port).toLatin1());

    if (PyRun_SimpleFile(cp, m_appfile.toUtf8().data()) != 0)
        setError(tr("Failed to launch the application server, server thread exiting."));

    fclose(cp);
}
