//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// LogWindow.h - Log viewer window
//
//////////////////////////////////////////////////////////////////////////

#ifndef LOGWINDOW_H
#define LOGWINDOW_H

#include <QDialog>

namespace Ui {
class LogWindow;
}

class LogWindow : public QDialog
{
    Q_OBJECT

public:
    explicit LogWindow(QWidget *parent = Q_NULLPTR, QString logFile = "");
    ~LogWindow();

    void ReadLog();

private slots:
    void reload();

private:
    Ui::LogWindow *ui;

    QString m_logFile;
};

#endif // LOGWINDOW_H
