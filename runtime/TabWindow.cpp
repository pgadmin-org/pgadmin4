//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2016, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// TabWindow.cpp - Implementation of the custom tab widget
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

// App headers
#include "TabWindow.h"


TabWindow::TabWindow(QWidget *parent) :
    QTabWidget(parent)
{
    setParent(parent);
    setTabsClosable(false);
    setElideMode(Qt::ElideRight);
#ifdef __APPLE__
    m_testTabBar = new TabBar();
    setTabBar(m_testTabBar);
#endif

}

// Hide the close button of given index displayed on right side of tab
void TabWindow::enableDisableToolButton(const int &index)
{
    QToolButton *toolBtnPtr = NULL;
    WebViewWindow *webviewPtr = NULL;

    // Enable/disable the toolbutton based on the history
    QWidget *tab1 = this->widget(index);
    if (tab1 != NULL)
    {
        QList<QWidget*> widgetList = tab1->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
                webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);
        }
    }

    QWidget *tab = tabBar()->tabButton(index, QTabBar::LeftSide);
    if (tab != NULL)
    {
        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
            {
                toolBtnPtr = dynamic_cast<QToolButton*>(widgetPtr);
                if (webviewPtr != NULL && toolBtnPtr != NULL)
                {
                    if (!QString::compare(toolBtnPtr->text(), PGA_BTN_BACK, Qt::CaseInsensitive))
                    {
                        if (webviewPtr->page()->history()->canGoBack())
                            toolBtnPtr->setDisabled(false);
                        else
                            toolBtnPtr->setDisabled(true);
                    }

                    if (!QString::compare(toolBtnPtr->text(), PGA_BTN_FORWARD, Qt::CaseInsensitive))
                    {
                        if (webviewPtr->page()->history()->canGoForward())
                            toolBtnPtr->setDisabled(false);
                        else
                        toolBtnPtr->setDisabled(true);
                    }
                }
            }
        }
    }
}

// Get the index of the pushbutton which is requested by user to close the tab
int TabWindow::getButtonIndex(QPushButton *btn)
{
    QPushButton *nextBtnPtr = NULL;
    int loopCount = 0;
    int totalTabs = this->count();

    for (loopCount = 1;loopCount < totalTabs;loopCount++)
    {
        QWidget *tab = tabBar()->tabButton(loopCount, QTabBar::RightSide);
        if (tab != NULL)
        {
            nextBtnPtr = dynamic_cast<QPushButton*>(tab);
            if (nextBtnPtr != NULL && btn != NULL && nextBtnPtr == btn)
                return loopCount;
        }
    }

    return 0;
}

// Show and Hide the toolbutton once the tab is deselected depending on the option
// option 0: Hide the toolButton
// option 1: Show the toolButton
void TabWindow::showHideToolButton(const int &index, const int &option)
{
    QToolButton *toolBtnPtr = NULL;

    QWidget *tab = tabBar()->tabButton(index, QTabBar::LeftSide);
    if (tab != NULL)
    {
        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
            {
                toolBtnPtr = dynamic_cast<QToolButton*>(widgetPtr);
                if (toolBtnPtr != NULL)
                {
                    if (!option)
                        toolBtnPtr->hide();
                    else
                        toolBtnPtr->show();
                }
            }
        }
    }
}

// Set the tab tool tip text
void TabWindow::setTabToolTipText(const int &index, const QString &toolTipString)
{
    tabBar()->setTabToolTip(index, toolTipString);
}
