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

#include "ConfigWindow.h"
#include "ui_ConfigWindow.h"

ConfigWindow::ConfigWindow(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::ConfigWindow)
{
    ui->setupUi(this);
}

ConfigWindow::~ConfigWindow()
{
    delete ui;
}

void ConfigWindow::on_buttonBox_accepted()
{
    this->close();
}

void ConfigWindow::on_buttonBox_rejected()
{
    this->close();
}

QString ConfigWindow::getBrowserCommand()
{
    return ui->browserCommandLineEdit->text();
}

QString ConfigWindow::getPythonPath()
{
    return ui->pythonPathLineEdit->text();
}

QString ConfigWindow::getApplicationPath()
{
    return ui->applicationPathLineEdit->text();
}


void ConfigWindow::setBrowserCommand(QString command)
{
    ui->browserCommandLineEdit->setText(command);
}

void ConfigWindow::setPythonPath(QString path)
{
    ui->pythonPathLineEdit->setText(path);
}

void ConfigWindow::setApplicationPath(QString path)
{
    ui->applicationPathLineEdit->setText(path);
}

