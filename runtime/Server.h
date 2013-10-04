//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013, The pgAdmin Development Team
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
    Server(quint16 port);
    ~Server();

    bool Init();
    QString getError() { return m_error; };

protected:
    void run();

private:
    void setError(QString error) { m_error = error; };

    QString m_appfile;
    QString m_error;

    quint16 m_port;
};

#endif // SERVER_H

