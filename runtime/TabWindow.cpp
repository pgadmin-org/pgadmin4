//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// TabWindow.cpp - Implementation of the custom tab widget
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

// App headers
#include "TabWindow.h"

#ifdef PGADMIN4_USE_WEBENGINE
#include <QWebEngineHistory>
#else
#include <QWebHistory>
#endif

TabWindow::TabWindow(QWidget *parent) :
    QTabWidget(parent)
{
    setParent(parent);
    setTabsClosable(false);
    setElideMode(Qt::ElideRight);

    // Get the system colours we need
    QPalette palette = QApplication::palette("QPushButton");
    QColor activebg = palette.color(QPalette::Button);
    QColor activefg = palette.color(QPalette::ButtonText);
    QColor inactivebg = palette.color(QPalette::Dark);
    QColor inactivefg = palette.color(QPalette::ButtonText);
    QColor border = palette.color(QPalette::Mid);

    setStyleSheet(
        "QTabBar::tab { "
                "background-color: " + inactivebg.name() + "; "
                "color: " + inactivefg.name() + "; "
                "border: 1px solid " + border.name() + "; "
                "padding: 1px 0px; "
                "margin-left: 0px; "
                "margin-top: 1px; "
#ifndef __APPLE__
                "width: 15em; "
#ifdef _WIN32
                "height: 1.5em; "
#else
                "height: 1em; "
#endif
#endif
            "} "
        "QTabBar::tab:selected { "
                "background-color: " + activebg.name() + "; "
                "color: " + activefg.name() + "; "
                "border-bottom-style: none; "
            "} "
        "QTabWidget::pane { "
                "border: 0; "
            "} "
        "QTabWidget::tab-bar {"
                "alignment: left; "
            "}"
    );
#ifdef __APPLE__
    m_testTabBar = new TabBar();
    setTabBar(m_testTabBar);
#endif

    // Hide the default tab
    tabBar()->setVisible(false);
}

// Hide the close button of given index displayed on right side of tab
void TabWindow::enableDisableToolButton(const int &index)
{
    QToolButton *toolBtnPtr = NULL;
    WebViewWindow *tmpwebviewPtr = NULL;
    WebViewWindow *webviewPtr = NULL;

    // Enable/disable the toolbutton based on the history
    QWidget *tab1 = this->widget(index);
    if (tab1 != NULL)
    {
        QList<QWidget*> widgetList = tab1->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
                tmpwebviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);

            if (tmpwebviewPtr != NULL)
                webviewPtr = tmpwebviewPtr;
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
                    if (!QString::compare(toolBtnPtr->toolTip(), tr("Go back"), Qt::CaseInsensitive))
                    {
                        if (webviewPtr->page()->history()->canGoBack())
                            toolBtnPtr->setDisabled(false);
                        else
                            toolBtnPtr->setDisabled(true);
                    }

                    if (!QString::compare(toolBtnPtr->toolTip(), tr("Go forward"), Qt::CaseInsensitive))
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
