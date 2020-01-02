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
Logger* Logger::m_pThis = Q_NULLPTR;
QString Logger::m_sFileName = "";
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
        m_sFileName = QDir::homePath() + (QString("/.%1.startup.log").arg(PGA_APP_NAME)).remove(" ");
        m_Logfile = new QFile;
        m_Logfile->setFileName(m_sFileName);
        m_Logfile->open(QIODevice::WriteOnly | QIODevice::Text);
        m_Logfile->setPermissions(QFile::ReadOwner|QFile::WriteOwner);
    }

    return m_pThis;
}

void Logger::Log(const QString& sMessage)
{
    QString text = QDateTime::currentDateTime().toString("dd.MM.yyyy hh:mm:ss ") + sMessage + "\n";
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
