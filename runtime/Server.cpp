//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// Server.cpp - Thread in which the web server will run.
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"
#include "Logger.h"

// Must be before QT
#include <Python.h>

// QT headers
#include <QDebug>
#include <QDir>
#include <QFile>
#include <QMessageBox>

// App headers
#include "Server.h"

static void add_to_path(QString &python_path, QString path, bool prepend=false)
{
    if (!python_path.contains(path))
    {
        if (!prepend)
        {
#if defined(Q_OS_WIN)
            if (!python_path.isEmpty() && !python_path.endsWith(";"))
                python_path.append(";");
#else
            if (!python_path.isEmpty() && !python_path.endsWith(":"))
                python_path.append(":");
#endif

            python_path.append(path);
        }
        else
        {
#if defined(Q_OS_WIN)
            if (!python_path.isEmpty() && !python_path.startsWith(";"))
                python_path.prepend(";");
#else
            if (!python_path.isEmpty() && !python_path.startsWith(":"))
                python_path.prepend(":");
#endif

            python_path.prepend(path);
        }
    }
}

Server::Server(quint16 port, QString key, QString logFileName)
{
    // Appserver port etc
    m_port = port;
    m_key = key;
    m_logFileName = logFileName;
    m_wcAppName = Q_NULLPTR;
    m_wcPythonHome = Q_NULLPTR;

    // Initialise Python
    Py_NoSiteFlag=1;
    Py_NoUserSiteDirectory=1;
    Py_DontWriteBytecodeFlag=1;

    PGA_APP_NAME_UTF8 = PGA_APP_NAME.toUtf8();

    // Python3 requires conversion of char  * to wchar_t *, so...
#ifdef PYTHON2
    Py_SetProgramName(PGA_APP_NAME_UTF8.data());
#else
    char *appName = PGA_APP_NAME_UTF8.data();
    const size_t cSize = strlen(appName)+1;
    m_wcAppName = new wchar_t[cSize];
    mbstowcs (m_wcAppName, appName, cSize);
    Py_SetProgramName(m_wcAppName);
#endif

    // Setup the search path
    QSettings settings;
    QString python_path = settings.value("PythonPath").toString();

    // Get the application directory
    QString app_dir = qApp->applicationDirPath(),
            path_env = qgetenv("PATH"),
            pythonHome;
    QStringList path_list;
    int i;

#ifdef Q_OS_MAC
    // In the case we're running in a release appbundle, we need to ensure the
    // bundled virtual env is included in the Python path. We include it at the
    // end, so expert users can override the path, but we do not save it, because
    // if users move the app bundle, we'll end up with dead entries

    // Build (and canonicalise) the virtual environment path
    QFileInfo venvBinPath(app_dir + "/../Resources/venv/bin");
    QFileInfo venvLibPath(app_dir + "/../Resources/venv/lib/python");
    QFileInfo venvDynLibPath(app_dir + "/../Resources/venv/lib/python/lib-dynload");
    QFileInfo venvSitePackagesPath(app_dir + "/../Resources/venv/lib/python/site-packages");
    QFileInfo venvPath(app_dir + "/../Resources/venv");

    // Prepend the bin directory to the path
    add_to_path(path_env, venvBinPath.canonicalFilePath(), true);
    // Append the path, if it's not already there
    add_to_path(python_path, venvLibPath.canonicalFilePath());
    add_to_path(python_path, venvDynLibPath.canonicalFilePath());
    add_to_path(python_path, venvSitePackagesPath.canonicalFilePath());
    add_to_path(pythonHome, venvPath.canonicalFilePath());
#elif defined(Q_OS_WIN)

    // In the case we're running in a release application, we need to ensure the
    // bundled virtual env is included in the Python path. We include it at the
    // end, so expert users can override the path, but we do not save it.

    // Build (and canonicalise) the virtual environment path
    QFileInfo venvBinPath(app_dir + "/../venv");
    QFileInfo venvLibPath(app_dir + "/../venv/Lib");
    QFileInfo venvDLLsPath(app_dir + "/../venv/DLLs");
    QFileInfo venvSitePackagesPath(app_dir + "/../venv/Lib/site-packages");
    QFileInfo venvPath(app_dir + "/../venv");

    // Prepend the bin directory to the path
    add_to_path(path_env, venvBinPath.canonicalFilePath(), true);
    // Append paths, if they're not already there
    add_to_path(python_path, venvLibPath.canonicalFilePath());
    add_to_path(python_path, venvDLLsPath.canonicalFilePath());
    add_to_path(python_path, venvSitePackagesPath.canonicalFilePath());
    add_to_path(pythonHome, venvPath.canonicalFilePath());
#else
    // Build (and canonicalise) the virtual environment path
    QFileInfo venvBinPath(app_dir + "/../venv/bin");
    QFileInfo venvLibPath(app_dir + "/../venv/lib/python");
    QFileInfo venvDynLibPath(app_dir + "/../venv/lib/python/lib-dynload");
    QFileInfo venvSitePackagesPath(app_dir + "/../venv/lib/python/site-packages");
    QFileInfo venvPath(app_dir + "/../venv");

    // Prepend the bin directory to the path
    add_to_path(path_env, venvBinPath.canonicalFilePath(), true);
    // Append the path, if it's not already there
    add_to_path(python_path, venvLibPath.canonicalFilePath());
    add_to_path(python_path, venvDynLibPath.canonicalFilePath());
    add_to_path(python_path, venvSitePackagesPath.canonicalFilePath());
    add_to_path(pythonHome, venvPath.canonicalFilePath());
#endif

    qputenv("PATH", path_env.toUtf8().data());

    if (python_path.length() > 0)
    {
        // Split the path setting into individual entries
        path_list = python_path.split(";", QString::SkipEmptyParts);
        python_path = QString();

        // Add new additional path elements
        for (i = path_list.size() - 1; i >= 0 ; --i)
        {
            python_path.append(path_list.at(i));
            if (i > 0)
            {
#if defined(Q_OS_WIN)
                python_path.append(";");
#else
                python_path.append(":");
#endif
            }
        }
        qputenv("PYTHONPATH", python_path.toUtf8().data());
    }

    qDebug() << "Python path: " << python_path
             << "\nPython Home: " << pythonHome;

    Logger::GetLogger()->Log(QString("Python Path: %1").arg(python_path));
    Logger::GetLogger()->Log(QString("Python Home: %1").arg(pythonHome));

    if (!pythonHome.isEmpty())
    {
        pythonHome_utf8 = pythonHome.toUtf8();
#ifdef PYTHON2
        Py_SetPythonHome(pythonHome_utf8.data());
#else
        char *python_home = pythonHome_utf8.data();
        const size_t cSize = strlen(python_home) + 1;
        m_wcPythonHome = new wchar_t[cSize];
        mbstowcs (m_wcPythonHome, python_home, cSize);

        Py_SetPythonHome(m_wcPythonHome);
#endif
    }

    Logger::GetLogger()->Log("Initializing Python...");
    Py_Initialize();
    Logger::GetLogger()->Log("Python initialized.");

    // Get the current path
    PyObject* sysPath = PySys_GetObject(const_cast<char *>("path"));
    if (sysPath != Q_NULLPTR)
    {
        // Add new additional path elements
        Logger::GetLogger()->Log("Adding new additional path elements");
        for (i = path_list.size() - 1; i >= 0 ; --i)
        {
#ifdef PYTHON2
            PyList_Append(sysPath, PyString_FromString(path_list.at(i).toUtf8().data()));
#else
#if PY_MINOR_VERSION > 2
            PyList_Append(sysPath, PyUnicode_DecodeFSDefault(path_list.at(i).toUtf8().data()));
#else
            PyList_Append(sysPath, PyBytes_FromString(path_list.at(i).toUtf8().data()));
#endif
#endif
        }
    }
    else
       Logger::GetLogger()->Log("Unable to get the current path.");

    // Redirect stderr
    Logger::GetLogger()->Log("Redirecting stderr...");
    PyObject *sys = PyImport_ImportModule("sys");
    if (sys != Q_NULLPTR)
    {
        PyObject *err = Q_NULLPTR;
#ifdef PYTHON2
        err = PyFile_FromString(m_logFileName.toUtf8().data(), (char *)"w");
#else
        FILE *log = Q_NULLPTR;

#if defined(Q_OS_WIN)
        char *logFile = m_logFileName.toUtf8().data();
        size_t fileSize = strlen(logFile) + 1;
        wchar_t * wcLogFileName = new wchar_t[fileSize];
        mbstowcs (wcLogFileName, logFile, fileSize);

        log = _wfopen(wcLogFileName, (wchar_t *)"w");
#else
        log = fopen(m_logFileName.toUtf8().data(), const_cast<char *>("w"));
#endif
        if (log != Q_NULLPTR)
        {
            int fd = fileno(log);
            err = PyFile_FromFd(fd, Q_NULLPTR, const_cast<char *>("w"), -1, Q_NULLPTR, Q_NULLPTR, Q_NULLPTR, 0);
        }
        else
            Logger::GetLogger()->Log(QString("Failed to open log file: %1").arg(m_logFileName));

#if defined(Q_OS_WIN)
        if (wcLogFileName != NULL)
        {
            delete wcLogFileName;
            wcLogFileName = NULL;
        }
#endif
#endif
        QFile(m_logFileName).setPermissions(QFile::ReadOwner|QFile::WriteOwner);
        if (err != Q_NULLPTR)
        {
            PyObject_SetAttrString(sys, "stderr", err);
            Logger::GetLogger()->Log("stderr redirected successfully.");
        }
        else
            Logger::GetLogger()->Log(QString("Failed to get the file pointer of: %1 ").arg(m_logFileName));
    }
    else
      Logger::GetLogger()->Log("Failed to import 'sys' module.");
}

Server::~Server()
{
    if (m_wcAppName)
        delete m_wcAppName;

    if (m_wcPythonHome)
        delete m_wcPythonHome;

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
        QDir dir;

        if (paths[i].startsWith('/'))
            dir = paths[i];
        else
            dir = QCoreApplication::applicationDirPath() + "/" + paths[i];

        m_appfile = dir.canonicalPath() + "/pgAdmin4.py";

        if (QFile::exists(m_appfile))
        {
            qDebug() << "Webapp path: " << m_appfile;
            Logger::GetLogger()->Log(QString("Webapp Path: %1").arg(m_appfile));
            break;
        }
    }

    if (!QFile::exists(m_appfile))
    {
        Logger::GetLogger()->Log("Failed to locate pgAdmin4.py, terminating server thread.");
        setError(tr("Failed to locate pgAdmin4.py, terminating server thread."));
        return false;
    }

    return true;
}

void Server::run()
{
    // Open the application code and run it.
    Logger::GetLogger()->Log("Open the application code and run it.");
    FILE *cp = fopen(m_appfile.toUtf8().data(), "r");
    if (!cp)
    {
        Logger::GetLogger()->Log(QString(tr("Failed to open the application file: %1, server thread exiting.")).arg(m_appfile));
        setError(QString(tr("Failed to open the application file: %1, server thread exiting.")).arg(m_appfile));
        return;
    }

    // Set the port number and key, and force SERVER_MODE off.
    Logger::GetLogger()->Log("Set the port number, key and force SERVER_MODE off");
    PyRun_SimpleString(QString("PGADMIN_PORT = %1").arg(m_port).toLatin1());
    PyRun_SimpleString(QString("PGADMIN_KEY = '%1'").arg(m_key).toLatin1());
    PyRun_SimpleString(QString("SERVER_MODE = False").toLatin1());

    // Run the app!
    QByteArray m_appfile_utf8 = m_appfile.toUtf8();
#ifdef PYTHON2
    /*
     * Untrusted search path vulnerability in the PySys_SetArgv API function in Python 2.6 and earlier, and possibly later
     * versions, prepends an empty string to sys.path when the argv[0] argument does not contain a path separator,
     * which might allow local users to execute arbitrary code via a Trojan horse Python file in the current working directory.
     * Here we have to set arguments explicitly to python interpreter. Check more details in 'PySys_SetArgv' documentation.
     */
    char* n_argv[] = { m_appfile_utf8.data() };
    PySys_SetArgv(1, n_argv);

    Logger::GetLogger()->Log("PyRun_SimpleFile launching application server...");
    PyObject* PyFileObject = PyFile_FromString(m_appfile_utf8.data(), (char *)"r");
    int ret = PyRun_SimpleFile(PyFile_AsFile(PyFileObject), m_appfile_utf8.data());
    if (ret != 0)
    {
        Logger::GetLogger()->Log("Failed to launch the application server, server thread exiting.");
        setError(tr("Failed to launch the application server, server thread exiting."));
    }
#else
    /*
     * Untrusted search path vulnerability in the PySys_SetArgv API function in Python 2.6 and earlier, and possibly later
     * versions, prepends an empty string to sys.path when the argv[0] argument does not contain a path separator,
     * which might allow local users to execute arbitrary code via a Trojan horse Python file in the current working directory.
     * Here we have to set arguments explicitly to python interpreter. Check more details in 'PySys_SetArgv' documentation.
     */
    char *appName = m_appfile_utf8.data();
    const size_t cSize = strlen(appName)+1;
    wchar_t* wcAppName = new wchar_t[cSize];
    mbstowcs (wcAppName, appName, cSize);
    wchar_t* n_argv[] = { wcAppName };
    PySys_SetArgv(1, n_argv);

    Logger::GetLogger()->Log("PyRun_SimpleFile launching application server...");
    if (PyRun_SimpleFile(cp, m_appfile_utf8.data()) != 0)
    {
        Logger::GetLogger()->Log("Failed to launch the application server, server thread exiting.");
        setError(tr("Failed to launch the application server, server thread exiting."));
    }
#endif

    fclose(cp);
}

void Server::shutdown(QUrl url)
{
    bool shotdown = shutdownServer(url);
    if (!shotdown)
        setError(tr("Failed to shut down application server thread."));

    QThread::quit();
    QThread::wait();
    while(!this->isFinished()){}
}

