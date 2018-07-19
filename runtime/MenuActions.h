//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// MenuActions.h - Common file for menu actions.
//
//////////////////////////////////////////////////////////////////////////

#ifndef MENUACTIONS_H
#define MENUACTIONS_H

#include "pgAdmin4.h"

// App headers
#include "LogWindow.h"
#include "ConfigWindow.h"

class MenuActions: public QObject
{
    Q_OBJECT
public:
    MenuActions();
    ~MenuActions();

    void setAppServerUrl(QString appServerUrl);
    void setLogFile(QString logFile);
    QString getAppServerUrl() { return m_appServerUrl; }

private:
    QString m_appServerUrl, m_logFile;
    LogWindow *m_logWindow;

protected slots:
    void onNew();
    void onCopyUrl();
    void onConfig();
    void onLog();
    void onQuit();

signals:
    void shutdownSignal(QUrl);
};

#endif // MENUACTIONS_H
