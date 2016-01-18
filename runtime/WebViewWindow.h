//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2016, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// WebViewWindow.h - Declaration of the custom web view widget
//
//////////////////////////////////////////////////////////////////////////

#ifndef WEBVIEWWINDOW_H
#define WEBVIEWWINDOW_H

#include "pgAdmin4.h"

#include <QtWebKitWidgets>

class WebViewWindow : public QWebView
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
