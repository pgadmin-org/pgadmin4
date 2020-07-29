//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// Logger.h - Logger Utility
//
//////////////////////////////////////////////////////////////////////////

#ifndef LOGGER_H
#define LOGGER_H

#include <QObject>
#include <QFile>

class Logger : public QObject
{
public:
    static Logger* GetLogger();
    static void ReleaseLogger();
    void Log(const QString& sMessage) const;

private:
    Logger();
    virtual ~Logger();

    static Logger* m_pThis;
    static QFile *m_Logfile;
};

#endif // LOGGER_H
