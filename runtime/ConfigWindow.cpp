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

#include "pgAdmin4.h"

#include "ConfigWindow.h"
#include "ui_ConfigWindow.h"

ConfigWindow::ConfigWindow(QWidget *parent) :
    QDialog(parent)
{
    initConfigWindow();
}

void ConfigWindow::initConfigWindow()
{
    ui = new Ui::ConfigWindow;
    ui->setupUi(this);
}

void ConfigWindow::on_buttonBox_accepted()
{
    this->close();
}

void ConfigWindow::on_buttonBox_rejected()
{
    this->close();
}

void ConfigWindow::on_chkFixedPort_stateChanged(int state)
{
    if (state == Qt::Checked)
        ui->spinPortNumber->setEnabled(true);
    else
        ui->spinPortNumber->setEnabled(false);
}

void ConfigWindow::LoadSettings()
{
    QSettings settings;

    setWindowTitle(QString(tr("%1 Configuration")).arg(PGA_APP_NAME));

    ui->browserCommandLineEdit->setText(settings.value("BrowserCommand").toString());

    if(settings.value("FixedPort").toBool())
    {
        ui->chkFixedPort->setCheckState(Qt::Checked);
        ui->spinPortNumber->setEnabled(true);
    }
    else
    {
        ui->chkFixedPort->setCheckState(Qt::Unchecked);
        ui->spinPortNumber->setEnabled(false);
    }

    ui->spinPortNumber->setValue(settings.value("PortNumber").toInt());

    if (settings.value("OpenTabAtStartup", true).toBool())
    {
        ui->chkOpenTabAtStartup->setCheckState(Qt::Checked);
    }
    else
    {
        ui->chkOpenTabAtStartup->setCheckState(Qt::Unchecked);
    }

    ui->pythonPathLineEdit->setText(settings.value("PythonPath").toString());
    ui->applicationPathLineEdit->setText(settings.value("ApplicationPath").toString());
}

bool ConfigWindow::SaveSettings()
{
    QSettings settings;

    // Save the settings, and return true if a restart is required, otherwise false.
    QString browsercommand = ui->browserCommandLineEdit->text();
    bool fixedport = ui->chkFixedPort->isChecked();
    int portnumber = ui->spinPortNumber->value();
    bool opentabatstartup = ui->chkOpenTabAtStartup->isChecked();
    QString pythonpath = ui->pythonPathLineEdit->text();
    QString applicationpath = ui->applicationPathLineEdit->text();

    bool needRestart = (settings.value("FixedPort").toBool() != fixedport ||
                        settings.value("PortNumber").toInt() != portnumber ||
                        settings.value("PythonPath").toString() != pythonpath ||
                        settings.value("ApplicationPath").toString() != applicationpath);

    settings.setValue("BrowserCommand", browsercommand);
    settings.setValue("FixedPort", fixedport);
    settings.setValue("PortNumber", portnumber);
    settings.setValue("OpenTabAtStartup", opentabatstartup);
    settings.setValue("PythonPath", pythonpath);
    settings.setValue("ApplicationPath", applicationpath);

    settings.sync();

    return needRestart;
}

