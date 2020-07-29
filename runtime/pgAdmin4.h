//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// pgAdmin4.h - Main application header
//
//////////////////////////////////////////////////////////////////////////

#ifndef PGADMIN4_H
#define PGADMIN4_H

// QT headers
#include <QString>

// Global function prototypes
int main(int argc, char * argv[]);

extern const QString g_startupLogFile;
extern const QString g_serverLogFile;
extern const QString g_addressFile;

QString getExeHash();

void cleanup();

#endif // PGADMIN4_H
