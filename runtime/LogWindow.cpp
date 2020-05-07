//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// LogWindow.cpp - Log viewer window
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"
#include "LogWindow.h"
#include "ui_LogWindow.h"

#include <QTime>

#include <stdio.h>

LogWindow::LogWindow(QWidget *parent, QString serverLogFile) :
    QDialog(parent),
    ui(new Ui::LogWindow),
    m_serverLogFile(serverLogFile)
{
    ui->setupUi(this);
}


LogWindow::~LogWindow()
{
    delete ui;
}


void LogWindow::LoadLog()
{
    int startupLines, serverLines;

    ui->lblStatus->setText(tr("Loading logfiles..."));

    startupLines = this->readLog(QDir::homePath() + (QString("/.%1.startup.log").arg(PGA_APP_NAME)).remove(" "), ui->textStartupLog);
    serverLines = this->readLog(m_serverLogFile, ui->textServerLog);

    ui->lblStatus->setText(QString(tr("Loaded startup log (%1 lines) and server log (%2 lines).")).arg(startupLines).arg(serverLines));
}


void LogWindow::reload()
{
    this->LoadLog();
}


// Read the logfile
int LogWindow::readLog(QString logFile, QPlainTextEdit *logWidget)
{
    FILE *log;
    char *buffer;
    long len = 0;
    int i, lines = 0;

    // Look busy!
    QApplication::setOverrideCursor(Qt::WaitCursor);
    this->setDisabled(true);
    QCoreApplication::processEvents( QEventLoop::AllEvents, 100 );

    logWidget->clear();

    // Attempt to open the file
    log = fopen(logFile.toUtf8().data(), "r");
    if (log == Q_NULLPTR)
    {
            logWidget->setPlainText(QString(tr("The log file (%1) could not be opened.")).arg(m_serverLogFile));
            this->setDisabled(false);
            QApplication::restoreOverrideCursor();
            return 0;
    }

    // Get the file size, and read the data
    fseek(log, 0, SEEK_END);
    len = ftell(log);
    rewind(log);
    buffer = static_cast<char *>(malloc((len + 1) * sizeof(char)));

    for (i = 0; i < len; i++) {
        if (fread(buffer + i, 1, 1, log) > 0)
        {
            if (buffer[i] == '\n')
                lines++;
        }
    }

    buffer[i] = 0;

    fclose(log);
    logWidget->setPlainText(buffer);

    // And... relax
    this->setDisabled(false);
    QApplication::restoreOverrideCursor();

    return lines;
}
