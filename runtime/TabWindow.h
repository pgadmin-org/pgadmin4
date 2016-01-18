//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2016, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// TabWindow.h - Declaration of the custom tab widget
//
//////////////////////////////////////////////////////////////////////////

#ifndef TABWINDOW_H
#define TABWINDOW_H

#include "pgAdmin4.h"
#include "WebViewWindow.h"

// Define button characters
const QString PGA_BTN_FORWARD = QString("\u2192");
const QString PGA_BTN_BACK = QString("\u2190");
const QString PGA_BTN_CLOSE = QString("\u2715");

class TabBar : public QTabBar
{
    Q_OBJECT
public:
    TabBar(QWidget* parent=0) : QTabBar(parent)
    {
    }

protected:
    QSize tabSizeHint(int) const
    {
        return QSize(250, 24);
    }
};

class TabWindow : public QTabWidget
{
    Q_OBJECT
public:
    TabWindow(QWidget *parent = 0);

    int getButtonIndex(QPushButton *btn);
    void showHideToolButton(const int &index,const int &option);
    void enableDisableToolButton(const int &index);
    void setTabToolTipText(const int &index, const QString &toolTipString);
    QTabBar *tabBar() const
    {
        return QTabWidget::tabBar();
    }

private:
    TabBar *m_testTabBar;
};

#endif // TABWINDOW_H
