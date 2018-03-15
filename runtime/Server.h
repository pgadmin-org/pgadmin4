//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// Server.h - Thread in which the web server will run.
//
//////////////////////////////////////////////////////////////////////////

#ifndef SERVER_H
#define SERVER_H

#include "pgAdmin4.h"

// QT headers
#include <QThread>
#include <QMessageBox>

class Server : public QThread
{
    Q_OBJECT

public:
    Server(quint16 port, QString key, QString logFileName);
    ~Server();

    bool Init();
    QString getError() { return m_error; }

public slots:
    void shutdown(QUrl url);

protected:
    void run();

private:
    void setError(QString error) { m_error = error; }

    QString m_appfile;
    QString m_error;

    quint16  m_port;
    QString m_key;
    QString m_logFileName;

    // Application name in UTF-8 for Python
    wchar_t *m_wcAppName;
    QByteArray PGA_APP_NAME_UTF8;

    // PythonHome for Python
    wchar_t *m_wcPythonHome;
    QByteArray pythonHome_utf8;
};

#endif // SERVER_H

