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
#ifdef PGADMIN4_USE_WEBENGINE
#include <QtWebEngineWidgets>
#else
#include <QtWebKitWidgets>
#endif
#else
#include <QWebView>
#endif

// Override QWebEnginePage to handle link delegation
#ifdef PGADMIN4_USE_WEBENGINE
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

#ifdef PGADMIN4_USE_WEBENGINE
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
   void setBackForwardButtonHidden(const bool hideButton);
   bool getBackForwardButtonHidden() const;

   // Store main webview window of pgAdmin4 application.
   static WebViewWindow *mainWebViewWindow;
   static WebViewWindow* getMainWebViewWindow()
   {
       return mainWebViewWindow;
   }

protected:
    // re-implemnted drag-drop event for docking of tabs.
    void dragEnterEvent(QDragEnterEvent *event);
    void dragMoveEvent(QDragMoveEvent *event);
    void dropEvent(QDropEvent *event);

private:
    QString m_url;
    int m_tabIndex;
    bool m_backForwardBtnHide;
};

#ifndef PGADMIN4_USE_WEBENGINE
class WebViewPage : public QWebPage
{
    Q_OBJECT

public:
    WebViewPage(QObject *parent = 0);
    ~WebViewPage();

protected:
    virtual bool acceptNavigationRequest(QWebFrame *frame, const QNetworkRequest &request, NavigationType type);
    QWebPage *createWindow(QWebPage::WebWindowType type);
    bool javaScriptConfirm(QWebFrame * frame, const QString & msg);

signals:
    void createTabWindowKit(QWebPage * &);
};
#endif

#endif // WEBVIEWWINDOW_H
