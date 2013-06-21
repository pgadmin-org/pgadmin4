//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// pgAdmin4.h - Main application header
//
//////////////////////////////////////////////////////////////////////////

#ifndef PGADMIN4_H
#define PGADMIN4_H

// Include the Python header here as it needs to appear before any QT 
// headers anywhere in the app.
#include <Python.h>

// QT headers
#include <QtGlobal>

#if QT_VERSION >= 0x050000
#include <QtWidgets>
#else
#include <QApplication>
#endif

// char *PGA_APPNAME = "pgAdmin 4";
const QString PGA_APPNAME = QString("pgAdmin 4");

#endif // PGADMIN4_H
