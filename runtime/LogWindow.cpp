//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// LogWindow.cpp - Log viewer window
//
//////////////////////////////////////////////////////////////////////////

#include "LogWindow.h"
#include "ui_LogWindow.h"

#include <QTime>

#include <stdio.h>

LogWindow::LogWindow(QWidget *parent, QString logFile) :
    QDialog(parent),
    ui(new Ui::LogWindow),
    m_logFile(logFile)
{
    ui->setupUi(this);
}


LogWindow::~LogWindow()
{
    delete ui;
}


void LogWindow::reload()
{
    this->ReadLog();
}


// Read the logfile
void LogWindow::ReadLog()
{
    FILE *log;
    char *buffer;
    long len = 0;
    int i, lines = 0;

    // Look busy!
    QApplication::setOverrideCursor(Qt::WaitCursor);
    ui->lblStatus->setText(tr("Loading logfile..."));
    this->setDisabled(true);
    QCoreApplication::processEvents( QEventLoop::AllEvents, 100 );

    ui->textLog->clear();

    // Attempt to open the file
    log = fopen(m_logFile.toUtf8().data(), "r");
    if (log == NULL)
    {
            ui->textLog->setPlainText(QString(tr("The log file (%1) could not be opened.")).arg(m_logFile));
            this->setDisabled(false);
            QApplication::restoreOverrideCursor();
            return;
    }

    // Get the file size, and read the data
    fseek(log, 0, SEEK_END);
    len = ftell(log);
    rewind(log);
    buffer = (char *)malloc((len + 1) * sizeof(char));

    for (i = 0; i < len; i++) {
        if (fread(buffer + i, 1, 1, log) > 0)
        {
            if (buffer[i] == '\n')
                lines++;
        }
    }

    buffer[i] = 0;

    fclose(log);
    ui->textLog->setPlainText(buffer);

    // And... relax
    ui->lblStatus->setText(QString(tr("Loaded logfile (%1 lines).")).arg(lines));
    this->setDisabled(false);
    QApplication::restoreOverrideCursor();
}
