//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// WebViewWindow.h - Declaration of the custom web view widget
//
//////////////////////////////////////////////////////////////////////////

#ifndef WEBVIEWWINDOW_H
#define WEBVIEWWINDOW_H

#include "pgAdmin4.h"

#if QT_VERSION >= 0x050000
#if QT_VERSION >= 0x050500
#include <QtWebEngineWidgets>
#else
#include <QtWebKitWidgets>
#endif
#else
#include <QWebView>
#endif

// Override QWebEnginePage to handle link delegation
#if QT_VERSION >= 0x050500
class WebEnginePage : public QWebEnginePage
{
    Q_OBJECT
protected:
    virtual bool acceptNavigationRequest(const QUrl & url, NavigationType type, bool isMainFrame);
    QWebEnginePage *createWindow(QWebEnginePage::WebWindowType type);

signals:
    void createTabWindow(QWebEnginePage * &);
};
#endif

#if QT_VERSION >= 0x050500
class WebViewWindow : public QWebEngineView
#else
class WebViewWindow : public QWebView
#endif
{
    Q_OBJECT
public:
   WebViewWindow(QWidget *parent = NULL);
   void setFirstLoadURL(const QString &url);
   QString getFirstLoadURL() const;
   void setTabIndex(const int &tabIndex);
   int getTabIndex() const;

private:
    QString m_url;
    int m_tabIndex;

};

#endif // WEBVIEWWINDOW_H
