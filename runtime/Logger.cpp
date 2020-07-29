//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// Logger.cpp - Logger Utility
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"
#include "Logger.h"

#include <QDateTime>
#include <QTextStream>
#include <QStandardPaths>

Logger* Logger::m_pThis = Q_NULLPTR;
QFile* Logger::m_Logfile = Q_NULLPTR;

Logger::Logger()
{
}

Logger::~Logger()
{
}

Logger* Logger::GetLogger()
{
    if (m_pThis == Q_NULLPTR)
    {
        m_pThis = new Logger();
        m_Logfile = new QFile;
        m_Logfile->setFileName(g_startupLogFile);
        m_Logfile->open(QIODevice::WriteOnly | QIODevice::Text);
        m_Logfile->setPermissions(QFile::ReadOwner|QFile::WriteOwner);
    }

    return m_pThis;
}

void Logger::Log(const QString& sMessage) const
{
    QString text = QDateTime::currentDateTime().toString("yyyy-MM-dd hh:mm:ss: ") + sMessage + "\n";
    if (m_Logfile != Q_NULLPTR)
    {
        QTextStream out(m_Logfile);
        out << text;
    }
}

void Logger::ReleaseLogger()
{
    if (m_pThis != Q_NULLPTR)
    {
        if(m_Logfile != Q_NULLPTR)
            m_Logfile->close();
        delete m_pThis;
        m_pThis = Q_NULLPTR;
    }
}
