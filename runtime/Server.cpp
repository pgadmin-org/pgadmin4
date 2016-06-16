//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2016, The pgAdmin Development Team
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
    m_wcAppName = NULL;

    // Initialise Python
    Py_NoSiteFlag=1;
    Py_DontWriteBytecodeFlag=1;

    // Python3 requires conversion of char  * to wchar_t *, so...
#ifdef PYTHON2
    Py_SetProgramName(PGA_APP_NAME.toUtf8().data());
#else
    char *appName = PGA_APP_NAME.toUtf8().data();
    const size_t cSize = strlen(appName)+1;
    m_wcAppName = new wchar_t[cSize];
    mbstowcs (m_wcAppName, appName, cSize);
    Py_SetProgramName(m_wcAppName);
#endif

    Py_Initialize();

    // Setup the search path
    QSettings settings;
    QString python_path = settings.value("PythonPath").toString();

#ifdef Q_OS_MAC

    // In the case we're running in a release appbundle, we need to ensure the
    // bundled virtual env is included in the Python path. We include it at the
    // end, so expert users can override the path, but we do not save it, because
    // if users move the app bundle, we'll end up with dead entries

    // Get the application directory
    QString app_dir = qApp->applicationDirPath();

    // Build (and canonicalise) the virtual environment path
    QString get_pymodules_path = (app_dir + "/../Resources/venv/lib/python/site-packages");
    QFileInfo fi(get_pymodules_path);
    QString pymodules_path = fi.canonicalFilePath();

    // Append the path, if it's not already there
    if (!python_path.contains(pymodules_path))
    {
        if (!python_path.isEmpty())
            python_path.append(";");

        python_path.append(pymodules_path);
    }
#endif

    if (python_path.length() > 0)
    {
        // Split the path setting into individual entries
        QStringList path_list = python_path.split(";", QString::SkipEmptyParts);

        // Get the current path
        PyObject* sysPath = PySys_GetObject((char*)"path");

        // Add new additional path elements
        for (int i = path_list.size() - 1; i >= 0 ; --i)
        {
#ifdef PYTHON2
            PyList_Append(sysPath, PyString_FromString(path_list.at(i).toUtf8().data()));
#else
            PyList_Append(sysPath, PyBytes_FromString(path_list.at(i).toUtf8().data()));
#endif
        }
    }
    python_path = settings.value("PythonPath").toString();
    qDebug() << "Python path: " << python_path;
}

Server::~Server()
{
    if (m_wcAppName)
        delete m_wcAppName;

    // Shutdown Python
    Py_Finalize();
}

bool Server::Init()
{
    QSettings settings;

    // Find the webapp
    QStringList paths;
    paths.append("../web/"); // Linux source tree
    paths.append("../../web/"); // Windows source tree
    paths.append("../../../../web/"); // Mac source tree (in a dev env)
#ifdef Q_OS_MAC
    paths.append("../Resources/web/"); // Mac source tree (in a release app bundle)
#endif
    paths.append(settings.value("ApplicationPath").toString()); // System configured value
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

    // Run the app!
#ifdef PYTHON2
    PyObject* PyFileObject = PyFile_FromString(m_appfile.toUtf8().data(), (char *)"r");
    if (PyRun_SimpleFile(PyFile_AsFile(PyFileObject), m_appfile.toUtf8().data()) != 0)
        setError(tr("Failed to launch the application server, server thread exiting."));
#else
    int fd = fileno(cp);
    PyObject* PyFileObject = PyFile_FromFd(fd, m_appfile.toUtf8().data(), (char *)"r", -1, NULL, NULL,NULL,1);
    if (PyRun_SimpleFile(fdopen(PyObject_AsFileDescriptor(PyFileObject),"r"), m_appfile.toUtf8().data()) != 0)
        setError(tr("Failed to launch the application server, server thread exiting."));
#endif

    fclose(cp);
}
