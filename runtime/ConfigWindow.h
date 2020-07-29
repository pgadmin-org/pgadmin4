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

signals:
    void accepted(bool needRestart);
    void closing(bool accepted);

private slots:
    void on_buttonBox_accepted();
    void on_buttonBox_rejected();
    void on_chkFixedPort_stateChanged(int state);

private:
    Ui::ConfigWindow *ui;
    bool m_needRestart;

    void initConfigWindow();
};

#endif // CONFIGWINDOW_H
