//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// MenuActions.cpp - Common file for menu actions.
//
//////////////////////////////////////////////////////////////////////////

#include "MenuActions.h"

// QT headers
#include <QClipboard>
#include <QMessageBox>

MenuActions::MenuActions()
{
    m_logWindow = NULL;
    m_logFile = "";
    m_appServerUrl = "";
}

MenuActions::~MenuActions()
{
}

void MenuActions::setAppServerUrl(QString appServerUrl)
{
    m_appServerUrl = appServerUrl;
}

void MenuActions::setLogFile(QString logFile)
{
    m_logFile = logFile;
}

// Create a new application browser window on user request
void MenuActions::onNew()
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


// Copy the application server URL to the clipboard
void MenuActions::onCopyUrl()
{
    QClipboard *clipboard = QApplication::clipboard();
    clipboard->setText(m_appServerUrl);
}


// Show the config dialogue
void MenuActions::onConfig()
{
    QSettings settings;
    bool ok;

    ConfigWindow *dlg = new ConfigWindow();
    dlg->setWindowTitle(QString(tr("%1 Configuration")).arg(PGA_APP_NAME));
    dlg->setBrowserCommand(settings.value("BrowserCommand").toString());
    dlg->setFixedPort(settings.value("FixedPort").toBool());
    dlg->setPortNumber(settings.value("PortNumber").toInt());
    dlg->setPythonPath(settings.value("PythonPath").toString());
    dlg->setApplicationPath(settings.value("ApplicationPath").toString());
    dlg->setModal(true);
    ok = dlg->exec();

    QString browsercommand = dlg->getBrowserCommand();
    bool fixedport = dlg->getFixedPort();
    int portnumber = dlg->getPortNumber();
    QString pythonpath = dlg->getPythonPath();
    QString applicationpath = dlg->getApplicationPath();

    if (ok)
    {
        bool needRestart = (settings.value("FixedPort").toBool() != fixedport ||
                            settings.value("PortNumber").toInt() != portnumber ||
                            settings.value("PythonPath").toString() != pythonpath ||
                            settings.value("ApplicationPath").toString() != applicationpath);

        settings.setValue("BrowserCommand", browsercommand);
        settings.setValue("FixedPort", fixedport);
        settings.setValue("PortNumber", portnumber);
        settings.setValue("PythonPath", pythonpath);
        settings.setValue("ApplicationPath", applicationpath);

        if (needRestart)
        {
            if (QMessageBox::Yes == QMessageBox::question(NULL, tr("Shut down server?"), QString(tr("The %1 server must be restarted for changes to take effect. Do you want to shut down the server now?")).arg(PGA_APP_NAME), QMessageBox::Yes | QMessageBox::No))
            {
                exit(0);
            }
        }
    }
}


// Show the log window
void MenuActions::onLog()
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
void MenuActions::onQuit()
{
    if (QMessageBox::Yes == QMessageBox::question(NULL, tr("Shut down server?"), QString(tr("Are you sure you want to shut down the %1 server?")).arg(PGA_APP_NAME), QMessageBox::Yes | QMessageBox::No))
    {
        // Emit the signal to shut down the python server.
        emit shutdownSignal(m_appServerUrl);
        exit(0);
    }
}
