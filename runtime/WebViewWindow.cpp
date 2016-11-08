//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2016, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// WebViewWindow.cpp - Implementation of the custom web view widget
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

// App headers
#include "WebViewWindow.h"

// Override QWebEnginePage to handle link delegation
#if QT_VERSION >= 0x050500
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
#if QT_VERSION >= 0x050500
    QWebEngineView(parent)
#else
    QWebView(parent)
#endif
{
    m_url = QString("");
    m_tabIndex = 0;
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
