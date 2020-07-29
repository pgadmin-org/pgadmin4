//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// pgAdmin4.cpp - Main application entry point
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"
#include "Runtime.h"

#include <stdlib.h>

// Global vars for caching and avoing shutdown issues
const QString g_startupLogFile = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) + ("/pgadmin4.startup.log");
const QString g_serverLogFile = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) + (QString("/pgadmin4.%1.log").arg(getExeHash()));
const QString g_addressFile = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) + (QString("/pgadmin4.%1.addr").arg(getExeHash()));

int main(int argc, char * argv[])
{
    // Make sure we can create logs etc.
    QDir workdir;
    workdir.mkpath(QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation));

    // Let's rock...
    Runtime *runtime = new Runtime();
    return runtime->go(argc, argv);
}

// Cleanup the address and log files
void cleanup()
{
    qDebug() << "Removing:" << g_addressFile;
    QFile addrFile(g_addressFile);
    addrFile.remove();

    qDebug() << "Removing:" << g_serverLogFile;
    QFile logFile(g_serverLogFile);
    logFile.remove();
}


// Get a hash of the executable name and path
QString getExeHash()
{
    return QString(QCryptographicHash::hash(QCoreApplication::applicationFilePath().toUtf8(),QCryptographicHash::Md5).toHex());
}
