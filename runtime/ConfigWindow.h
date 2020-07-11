//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
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
    explicit ConfigWindow(QWidget *parent = Q_NULLPTR);

    void LoadSettings();
    bool SaveSettings();

private slots:
    void on_buttonBox_accepted();
    void on_buttonBox_rejected();
    void on_chkFixedPort_stateChanged(int state);

private:
    Ui::ConfigWindow *ui;
    void initConfigWindow();
};

#endif // CONFIGWINDOW_H
