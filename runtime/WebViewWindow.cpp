//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// WebViewWindow.cpp - Implementation of the custom web view widget
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

// App headers
#include "WebViewWindow.h"
#include "TabWindow.h"

#ifndef PGADMIN4_USE_WEBENGINE
#include <QWebPage>
#include <QNetworkRequest>
#endif

WebViewWindow *WebViewWindow::mainWebViewWindow = NULL;

// Override QWebEnginePage to handle link delegation
#ifdef PGADMIN4_USE_WEBENGINE
bool WebEnginePage::acceptNavigationRequest(const QUrl & url, NavigationType type, bool isMainFrame)
{
    Q_UNUSED(type);
    Q_UNUSED(url);
    Q_UNUSED(isMainFrame);

    return true;
}

QWebEnginePage *WebEnginePage::createWindow(QWebEnginePage::WebWindowType type)
{
    if (type == QWebEnginePage::WebBrowserTab)
    {
        QWebEnginePage *_page = NULL;
        emit createTabWindow(_page);
        return _page;
    }
    return NULL;
}
#endif

WebViewWindow::WebViewWindow(QWidget *parent) :
#ifdef PGADMIN4_USE_WEBENGINE
    QWebEngineView(parent)
#else
    QWebView(parent)
#endif
{
    m_url = QString("");
    m_tabIndex = 0;
    m_backForwardBtnHide = false;

    // Accept drop event for only main pgAdmin4 application window.
    if (mainWebViewWindow == NULL)
        mainWebViewWindow = this;

    setAcceptDrops(true);
}

// Actual tab drag started.
void WebViewWindow::dragEnterEvent(QDragEnterEvent *event)
{
    //DockTabWidget *mainTabWidget = DockTabWidget::getMainTabWidget();
    //if (this->parent()->parent()->parent() == mainTabWidget)
        event->accept();
}

void WebViewWindow::dragMoveEvent(QDragMoveEvent *event)
{
    event->acceptProposedAction();
}

// Drop event handler for tabbar.
void WebViewWindow::dropEvent(QDropEvent *event)
{
    DockTabWidget *oldTabWidget;
    int oldIndex;
    DockTabWidget::decodeTabDropEvent(event, &oldTabWidget, &oldIndex);

    //DockTabWidget *mainTabWidget = DockTabWidget::getMainTabWidget();
    DockTabWidget *mainTabWidget = dynamic_cast<DockTabWidget*>(this->parent()->parent()->parent());

    if (oldTabWidget && mainTabWidget && oldTabWidget != mainTabWidget)
    //if (oldTabWidget && mainTabWidget)
    {
        mainTabWidget->tabBar()->setVisible(true);
        QPoint pos = event->pos();
        int index = mainTabWidget->tabBar()->count();
        for (int i = 0; i < mainTabWidget->tabBar()->count(); ++i)
        {
            QRect rect = mainTabWidget->tabBar()->tabRect(i);
            QRect rect1(rect.x(), rect.y(), rect.width() / 2, rect.height());
            QRect rect2(rect.x() + rect1.width(), rect.y(), rect.width() - rect1.width(), rect.height());
            if (rect1.contains(pos))
            {
                index = i;
                break;
            }
            if (rect2.contains(pos))
            {
                index = i + 1;
                break;
            }
        }

        DockTabWidget::moveTab(oldTabWidget, oldIndex, mainTabWidget, index);

        // create new back/forward/close buttons and register its events.
        mainTabWidget->setButtonsNewTabbar(index);
        mainTabWidget->enableDisableToolButton(index);

        // Check if main pgAdmin4 application has only one tab then close tab bar.
        // Here - check for count 2 because tab will be deleted later.
        DockTabWidget *mainTab = DockTabWidget::getMainTabWidget();
        if (mainTab != NULL && oldTabWidget != NULL && oldTabWidget == mainTab && mainTab->count() == 1)
            mainTab->tabBar()->setVisible(false);

        event->acceptProposedAction();
    }
}

void WebViewWindow::setBackForwardButtonHidden(const bool hideButton)
{
   m_backForwardBtnHide = hideButton;
}

bool WebViewWindow::getBackForwardButtonHidden() const
{
    return m_backForwardBtnHide;
}

void WebViewWindow::setFirstLoadURL(const QString &url)
{
    m_url = url;
}

QString WebViewWindow::getFirstLoadURL() const
{
    return m_url;
}

void WebViewWindow::setTabIndex(const int &tabIndex)
{
    m_tabIndex = tabIndex;
}

int WebViewWindow::getTabIndex() const
{
    return m_tabIndex;
}

#ifndef PGADMIN4_USE_WEBENGINE
WebViewPage::WebViewPage(QObject *parent)
    : QWebPage(parent)
{
}

bool WebViewPage::acceptNavigationRequest(QWebFrame *frame, const QNetworkRequest &request, NavigationType type)
{
    Q_UNUSED(type);
    Q_UNUSED(request);
    Q_UNUSED(frame);
    return true;
}

QWebPage *WebViewPage::createWindow(QWebPage::WebWindowType type)
{
    if (type == QWebPage::WebBrowserWindow)
    {
        QWebPage *_page = NULL;
        emit createTabWindowKit(_page);
        return _page;
    }
    return NULL;
}

bool WebViewPage::javaScriptConfirm(QWebFrame * frame, const QString & msg)
{
    // If required, override the QDialog to give custom confirmation message to user.
    Q_UNUSED(frame);
    Q_UNUSED(msg);
    return false;
}

WebViewPage::~WebViewPage()
{
}

#endif
