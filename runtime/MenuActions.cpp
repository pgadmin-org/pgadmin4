//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// MenuActions.cpp - Common file for menu actions.
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"
#include "MenuActions.h"

#include <QApplication>
#include <QClipboard>
#include <QDesktopServices>
#include <QEventLoop>
#include <QMessageBox>
#include <QProcess>
#include <QSettings>

MenuActions::MenuActions()
{
}

void MenuActions::setAppServerUrl(QString appServerUrl)
{
    m_appServerUrl = appServerUrl;
}


// Create a new application browser window on user request
void MenuActions::onNew() const
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
            QMessageBox::critical(Q_NULLPTR, QString(QWidget::tr("Fatal Error")), error);

            exit(1);
        }
    }
}


// Copy the application server URL to the clipboard
void MenuActions::onCopyUrl() const
{
    QClipboard *clipboard = QApplication::clipboard();
    clipboard->setText(m_appServerUrl);
}


// Show the config dialogue
void MenuActions::onConfig()
{
    if (!m_configWindow)
        m_configWindow = new ConfigWindow();

    m_configWindow->show();
    m_configWindow->raise();
    m_configWindow->activateWindow();
    connect(m_configWindow, SIGNAL(accepted(bool)), this, SLOT(onConfigDone(bool)));
}


void MenuActions::onConfigDone(bool needRestart) const
{
    if (needRestart && QMessageBox::Yes == QMessageBox::question(Q_NULLPTR,
                                                                 tr("Shut down server?"),
                                                                 tr("The pgAdmin 4 server must be restarted for changes to take effect. Do you want to shut down the server now?"),
                                                                 QMessageBox::Yes | QMessageBox::No))
    {
        exit(0);
    }
}


// Show the log window
void MenuActions::onLog()
{
    QSettings settings;

    if (!m_logWindow)
        m_logWindow = new LogWindow();

    m_logWindow->show();
    m_logWindow->raise();
    m_logWindow->activateWindow();

    QCoreApplication::processEvents(QEventLoop::AllEvents, 100);

    m_logWindow->LoadLog();
}


// Exit
void MenuActions::onQuit()
{
    if (QMessageBox::Yes == QMessageBox::question(Q_NULLPTR, tr("Shut down server?"), tr("Are you sure you want to shut down the pgAdmin 4 server?"), QMessageBox::Yes | QMessageBox::No))
    {
        // Emit the signal to shut down the python server.
        emit shutdownSignal(m_appServerUrl);
        QApplication::quit();
    }
}
