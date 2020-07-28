//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// MenuActions.h - Common file for menu actions.
//
//////////////////////////////////////////////////////////////////////////

#ifndef MENUACTIONS_H
#define MENUACTIONS_H

#include "LogWindow.h"
#include "ConfigWindow.h"

class MenuActions: public QObject
{
    Q_OBJECT
public:
    MenuActions();

    void setAppServerUrl(QString appServerUrl);
    QString getAppServerUrl() { return m_appServerUrl; }

private:
    QString m_appServerUrl = "";
    LogWindow *m_logWindow = Q_NULLPTR;
    ConfigWindow *m_configWindow = Q_NULLPTR;

public slots:
    void onConfigDone(bool needRestart);

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
