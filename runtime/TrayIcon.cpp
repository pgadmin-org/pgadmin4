//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// TrayIcon.cpp - Manages the tray icon
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

// QT headers
#include <QMessageBox>

// App headers
#include "ConfigWindow.h"
#include "LogWindow.h"
#include "TrayIcon.h"


TrayIcon::TrayIcon(QString logFile) :
    m_logFile(logFile)
{
    m_logWindow = NULL;

    m_trayIcon = NULL;
    m_trayIconMenu = NULL;

    m_newAction = NULL;
    m_configAction = NULL;
    m_logAction = NULL;
    m_quitAction = NULL;
}


TrayIcon::~TrayIcon()
{

}


bool TrayIcon::Init()
{
    if (! isSystemTrayAvailable())
        return false;

    createTrayIcon();

    if (m_trayIcon)
        m_trayIcon->show();

    return true;
}


void TrayIcon::setAppServerUrl(QString appServerUrl)
{
    m_appServerUrl = appServerUrl;
}

// Check whether system tray exists
bool TrayIcon::isSystemTrayAvailable()
{
    int timeout = 10; // 30 sec * 10 = 5 minutes, thus we timeout after 5 minutes
    int iteration = 0;
    bool trayFound = false;

    while (iteration < timeout)
    {
        // Check we can find the system tray.
        if (!QSystemTrayIcon::isSystemTrayAvailable())
        {
            // Wait for 30 seconds.
            wait(3000);
            trayFound = false;
        }
        else
        {
            trayFound = true;
            break;
        }
        iteration++;
    }

    return trayFound;

}


// Make application wait for msec milliseconds
void TrayIcon::wait(int msec)
{
   QMutex mutex;
   QWaitCondition wc;
   mutex.lock();
   wc.wait(&mutex, msec);
   mutex.unlock();
}


// Create the tray icon
void TrayIcon::createTrayIcon()
{
    createActions();

    if (m_trayIconMenu)
    {
        delete m_trayIconMenu;
        m_trayIconMenu = NULL;
    }

    m_trayIconMenu = new QMenu(this);
    m_trayIconMenu->addAction(m_newAction);
    m_trayIconMenu->addSeparator();
    m_trayIconMenu->addAction(m_configAction);
    m_trayIconMenu->addAction(m_logAction);
    m_trayIconMenu->addSeparator();
    m_trayIconMenu->addAction(m_quitAction);

    if (!m_trayIcon)
        m_trayIcon = new QSystemTrayIcon(this);

    m_trayIcon->setContextMenu(m_trayIconMenu);

    // Setup the icon itself. For convenience, we'll also use it for the dialogue.
#ifdef Q_OS_MAC
    QIcon icon(":pgAdmin4-mac.png");
#else
    QIcon icon(":pgAdmin4.png");
#endif

    m_trayIcon->setIcon(icon);
    setWindowIcon(icon);
}


// Create the menu actions
void TrayIcon::createActions()
{
    m_newAction = new QAction(QString(tr("&New %1 window...")).arg(PGA_APP_NAME), this);
    connect(m_newAction, SIGNAL(triggered()), this, SLOT(onNew()));

    m_configAction = new QAction(tr("&Configure..."), this);
    connect(m_configAction, SIGNAL(triggered()), this, SLOT(onConfig()));

    m_logAction = new QAction(tr("&View log..."), this);
    connect(m_logAction, SIGNAL(triggered()), this, SLOT(onLog()));

    m_quitAction = new QAction(tr("&Shut down server"), this);
    m_quitAction->setEnabled(false);
    connect(m_quitAction, SIGNAL(triggered()), this, SLOT(onQuit()));
}


// Create a new application browser window on user request
void TrayIcon::onNew()
{
    QSettings settings;
    QString cmd = settings.value("BrowserCommand").toString();

    if (!cmd.isEmpty())
    {
        cmd.replace("%URL%", m_appServerUrl);
        QProcess::startDetached(cmd);
    }
    else
    {
        if (!QDesktopServices::openUrl(m_appServerUrl))
        {
            QString error(QWidget::tr("Failed to open the system default web browser. Is one installed?."));
            QMessageBox::critical(NULL, QString(QWidget::tr("Fatal Error")), error);

            exit(1);
        }
    }
}

// Show the config dialogue
void TrayIcon::onConfig()
{
    QSettings settings;
    bool ok;

    ConfigWindow *dlg = new ConfigWindow();
    dlg->setWindowTitle(QString(tr("%1 Configuration")).arg(PGA_APP_NAME));
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
        bool needRestart = (settings.value("PythonPath").toString() != pythonpath ||
                            settings.value("ApplicationPath").toString() != applicationpath);

        settings.setValue("BrowserCommand", browsercommand);
        settings.setValue("PythonPath", pythonpath);
        settings.setValue("ApplicationPath", applicationpath);

        if (needRestart)
        {
            if (QMessageBox::Yes == QMessageBox::question(this, tr("Shut down server?"), QString(tr("The %1 server must be restarted for changes to take effect. Do you want to shut down the server now?")).arg(PGA_APP_NAME), QMessageBox::Yes | QMessageBox::No))
            {
                exit(0);
            }
        }
    }
}


// Show the log window
void TrayIcon::onLog()
{
    QSettings settings;

    if (!m_logWindow)
    {
        m_logWindow = new LogWindow(NULL, m_logFile);
        m_logWindow->setWindowTitle(QString(tr("%1 Log")).arg(PGA_APP_NAME));
    }

    m_logWindow->show();
    m_logWindow->raise();
    m_logWindow->activateWindow();

    QCoreApplication::processEvents( QEventLoop::AllEvents, 100 );

    m_logWindow->ReadLog();
}


// Exit
void TrayIcon::onQuit()
{
    if (QMessageBox::Yes == QMessageBox::question(this, tr("Shut down server?"), QString(tr("Are you sure you want to shut down the %1 server?")).arg(PGA_APP_NAME), QMessageBox::Yes | QMessageBox::No))
    {
        // Emit the signal to shut down the python server.
        emit shutdownSignal(m_appServerUrl);
        exit(0);
    }
}

void TrayIcon::enableShutdownMenu()
{
    if (m_quitAction != NULL)
    {
        m_quitAction->setEnabled(true);
    }
}
