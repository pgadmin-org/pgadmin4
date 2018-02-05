//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// ConfigWindow.h - Configuration window
//
//////////////////////////////////////////////////////////////////////////

#ifndef CONFIGWINDOW_H
#define CONFIGWINDOW_H

#include <QDialog>

namespace Ui {
class ConfigWindow;
}

class ConfigWindow : public QDialog
{
    Q_OBJECT

public:
    explicit ConfigWindow(QWidget *parent = 0);
    ~ConfigWindow();

    QString getBrowserCommand();
    QString getPythonPath();
    QString getApplicationPath();

    void setBrowserCommand(QString command);
    void setPythonPath(QString path);
    void setApplicationPath(QString path);

private slots:
    void on_buttonBox_accepted();
    void on_buttonBox_rejected();

private:
    Ui::ConfigWindow *ui;
};

#endif // CONFIGWINDOW_H
