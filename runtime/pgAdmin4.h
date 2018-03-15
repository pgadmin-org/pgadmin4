//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// pgAdmin4.h - Main application header
//
//////////////////////////////////////////////////////////////////////////

#ifndef PGADMIN4_H
#define PGADMIN4_H

// Include the Python header here as it needs to appear before any QT 
// headers anywhere in the app.
#ifdef __MINGW32__
#include <cmath>
#endif
#include <Python.h>

// QT headers
#include <QtGlobal>

#if QT_VERSION >= 0x050000
#include <QtWidgets>
#else
#include <QApplication>
#include <QtGui>
#include <Qt/qurl.h>
#endif

// Application name
const QString PGA_APP_NAME = QString("pgAdmin 4");

// Global function prototypes
int main(int argc, char * argv[]);
bool PingServer(QUrl url);
void delay(int milliseconds);
void cleanup();
unsigned long sdbm(unsigned char *str);
bool shutdownServer(QUrl url);

#endif // PGADMIN4_H
