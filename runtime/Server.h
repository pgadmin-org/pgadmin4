//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// Server.h - Thread in which the web server will run.
//
//////////////////////////////////////////////////////////////////////////

#ifndef SERVER_H
#define SERVER_H

#include "Runtime.h"

#include <QThread>
#include <QUrl>

class Server : public QThread
{
    Q_OBJECT

public:
    Server(Runtime *runtime, quint16 port, QString key, QString logFileName);
    ~Server();

    bool Init();
    QString getError() const { return m_error; }

public slots:
    void shutdown(QUrl url);

protected:
    void run();

private:
    void setError(QString error) { m_error = error; }

    QString m_appfile;
    QString m_error;

    Runtime *m_runtime;
    quint16 m_port;
    QString m_key;
    QString m_logFileName;

    // Application name in UTF-8 for Python
    wchar_t *m_wcAppName = Q_NULLPTR;

    // PythonHome for Python
    wchar_t *m_wcPythonHome = Q_NULLPTR;
};

#endif // SERVER_H

