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
QString g_startupLogFile;
QString g_serverLogFile;
QString g_addressFile;

int main(int argc, char * argv[])
{
    // Make sure we can create logs etc.
    QDir workdir;
    workdir.mkpath(QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation));

    // Let's rock...
    Runtime *runtime = new Runtime();
    return runtime->go(argc, argv);
}


// Get the filename for the startup log
QString getStartupLogFile()
{
    if (g_startupLogFile == "")
        g_startupLogFile = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) + ("/pgadmin4.startup.log");

    return g_startupLogFile;
}


// Get the filename for the server log
QString getServerLogFile()
{
    if (g_serverLogFile == "")
        g_serverLogFile = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) + (QString("/pgadmin4.%1.log").arg(getExeHash()));

    return g_serverLogFile;
}


// Get the filename for the address file
QString getAddressFile()
{
    if (g_addressFile == "")
        g_addressFile = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) + (QString("/pgadmin4.%1.addr").arg(getExeHash()));

    return g_addressFile;
}


// Cleanup the address and log files
void cleanup()
{
    qDebug() << "Removing:" << getAddressFile();
    QFile addrFile(getAddressFile());
    addrFile.remove();

    qDebug() << "Removing:" << getServerLogFile();
    QFile logFile(getServerLogFile());
    logFile.remove();
}


// Get a hash of the executable name and path
QString getExeHash()
{
    return QString(QCryptographicHash::hash(QCoreApplication::applicationFilePath().toUtf8(),QCryptographicHash::Md5).toHex());
}