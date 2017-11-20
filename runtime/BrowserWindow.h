//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// BrowserWindow.h - Declaration of the main window class
//
//////////////////////////////////////////////////////////////////////////

#ifndef BROWSERWINDOW_H
#define BROWSERWINDOW_H

#include "pgAdmin4.h"
#include "TabWindow.h"
#include "WebViewWindow.h"

#if QT_VERSION >= 0x050000
    #include <QtWidgets>

    #ifdef PGADMIN4_USE_WEBENGINE
        #include <QtWebEngineWidgets>
    #else
        #include <QtWebKitWidgets>
        #include <QNetworkCookieJar>
        #include <QNetworkAccessManager>
    #endif
#else
    #include <QMainWindow>

    #ifdef PGADMIN4_USE_WEBENGINE
        #include <QtWebEngineView>
    #else
        #include <QWebView>
        #include <QNetworkCookieJar>
        #include <QNetworkAccessManager>
    #endif
#endif

#ifdef PGADMIN4_USE_WEBENGINE
  #include <QWebEngineHistory>
#else
  #include <QWebHistory>
#endif

QT_BEGIN_NAMESPACE
class QAction;
class QMenu;
QT_END_NAMESPACE

class BrowserWindow : public QMainWindow
{
    Q_OBJECT

public:
    BrowserWindow(QString url);
    ~BrowserWindow();

#ifdef _WIN32
    void setRegistryMessage(const QString &msg);
#endif

protected:
    void closeEvent(QCloseEvent *event);

protected slots:
    void urlLinkClicked(const QUrl &);
    void tabTitleChanged(const QString &);
#ifdef __APPLE__
  #ifdef PGADMIN4_USE_WEBENGINE
    void onMacCut();
    void onMacCopy();
    void onMacPaste();
  #endif
#endif

private slots:
    void openUrl();
    void preferences();
    void about();
    void setZoomLevel(int zoomFlag);
#ifdef PGADMIN4_USE_WEBENGINE
    void downloadRequested(QWebEngineDownloadItem *download);
#endif
    void urlLoadingFinished(bool);

public slots:
    void download(const QNetworkRequest &request);
    void unsupportedContent(QNetworkReply * reply);
    void downloadFinished();
    void downloadFileProgress(qint64 , qint64 );
    void progressCanceled();
    void current_dir_path(const QString &dir);
    void replyReady();
#ifdef PGADMIN4_USE_WEBENGINE
    void createNewTabWindow(QWebEnginePage * &);
    void downloadEngineFileProgress(qint64 , qint64 );
    void downloadEngineFinished();
#else
    void createNewTabWindowKit(QWebPage * &);
#endif

private:
    QString m_appServerUrl;
    WebViewWindow *m_mainWebView;

    QShortcut *openUrlShortcut;
    QShortcut *preferencesShortcut;
    QShortcut *exitShortcut;
    QShortcut *aboutShortcut;
    QShortcut *zoomInShortcut;
    QShortcut *zoomOutShortcut;
    QShortcut *zoomResetShortcut;
    QSignalMapper *signalMapper;

    QGridLayout  *m_tabGridLayout;
    QGridLayout  *m_mainGridLayout;
    DockTabWidget  *m_tabWidget;
    QWidget      *m_pgAdminMainTab;

    QWidget           *m_addNewTab;
    QGridLayout       *m_addNewGridLayout;
    WebViewWindow     *m_addNewWebView;
    QHBoxLayout       *m_horizontalLayout;

    QWidget           *m_widget;
    QToolButton       *m_toolBtnBack;
    QToolButton       *m_toolBtnForward;
    QToolButton       *m_toolBtnClose;

    QString m_downloadFilename;
    int m_downloadStarted;
    int m_downloadCancelled;
    QFile *m_file;
    QProgressDialog *m_progressDialog;
    QString m_defaultFilename;
    QString m_last_open_folder_path;
    QString m_dir;
    QNetworkReply *m_reply;
    bool is_readyReadSignaled;
    qint64 m_readBytes;

#ifdef _WIN32
    QString m_regMessage;
#endif

#ifdef PGADMIN4_USE_WEBENGINE
    QWebEngineDownloadItem *m_download;
#else
    QNetworkCookieJar *m_cookieJar;
    QNetworkAccessManager *m_netAccessMan;
#endif

    void createActions();
    void pause(int seconds = 1);
    int  findURLTab(const QUrl &name);
    void enableDisableToolButtons(WebViewWindow *webViewPtr);
#ifdef _WIN32
    QString getRegistryMessage();
#endif

#ifdef __APPLE__
  #ifdef PGADMIN4_USE_WEBENGINE
    void triggerWebViewWindowEvents(QWebEnginePage::WebAction action);
  #endif
#endif
};

#endif // BROWSERWINDOW_H
