//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2016, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// BrowserWindow.cpp - Implementation of the main window class
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

#if QT_VERSION >= 0x050000
#include <QtWidgets>
#if QT_VERSION >= 0x050500
#include <QtWebEngineWidgets>
#else
#include <QtWebKitWidgets>
#include <QtWebKit>
#endif
#else

#include <QAction>
#include <QMenu>
#include <QMenuBar>
#include <QMessageBox>
#include <QInputDialog>
#include <QLineEdit>
#endif
#include <QNetworkRequest>
#include <QNetworkReply>
// App headers
#include "BrowserWindow.h"
#include "ConfigWindow.h"

// Constructor
BrowserWindow::BrowserWindow(QString url)
{
    m_tabGridLayout = NULL;
    m_mainGridLayout = NULL;;
    m_tabWidget = NULL;
    m_pgAdminMainTab = NULL;
    m_addNewTab = NULL;
    m_addNewGridLayout = NULL;
    m_addNewWebView = NULL;
    m_horizontalLayout = NULL;
    m_widget = NULL;
    m_toolBtnBack = NULL;
    m_toolBtnForward = NULL;
    m_downloadStarted = 0;
    m_downloadCancelled = 0;
    m_file = NULL;
    m_downloadFilename = "";
    m_defaultFilename = "";
    m_progressDialog = NULL;
    m_last_open_folder_path = "";
    m_dir = "";
    m_reply = NULL;
#if QT_VERSION >= 0x050500
    m_download = NULL;
#endif

    m_appServerUrl = url;

    // Setup the shortcuts
    createActions();

    m_tabWidget = new TabWindow(this);
    m_mainGridLayout = new QGridLayout(m_tabWidget);
    m_mainGridLayout->setContentsMargins(0, 0, 0, 0);
    m_pgAdminMainTab = new QWidget(m_tabWidget);
    m_tabGridLayout = new QGridLayout(m_pgAdminMainTab);
    m_tabGridLayout->setContentsMargins(0, 0, 0, 0);
    m_mainWebView = new WebViewWindow(m_pgAdminMainTab);
#if QT_VERSION >= 0x050500
    m_mainWebView->setPage(new WebEnginePage());
#endif

#ifdef PGADMIN4_DEBUG
    // If pgAdmin4 is run in debug mode, then we should enable the
    // "Inspect" option, when the user right clicks on QWebView widget.
    // This option is useful to debug the pgAdmin4 desktop application and open the developer tools.
#if QT_VERSION >= 0x050500
    // With QWebEngine, run with QTWEBENGINE_REMOTE_DEBUGGING=<port> and then point Google
    // Chrome at 127.0.0.1:<port> to debug the runtime's web engine
#else
    QWebSettings::globalSettings()->setAttribute(QWebSettings::DeveloperExtrasEnabled, true);
#endif
#endif

#ifdef __APPLE__
    m_mainWebView->setStyle(QStyleFactory::create("Fusion"));
#endif

    m_tabGridLayout->addWidget(m_mainWebView, 0, 0, 1, 1);
    m_tabWidget->addTab(m_pgAdminMainTab, QString());
    m_tabWidget->setCurrentIndex(0);
    m_tabWidget->setTabText(0, PGA_APP_NAME);
    m_tabWidget->setTabToolTipText(0, PGA_APP_NAME) ;

    setCentralWidget(m_tabWidget);

    connect(m_mainWebView, SIGNAL(loadFinished(bool)), SLOT(finishLoading(bool)));

#if QT_VERSION >= 0x050500
    // Register the slot when click on the URL link for QWebEnginePage
    connect(m_mainWebView->page(), SIGNAL(createTabWindow(QWebEnginePage * &)),SLOT(createNewTabWindow(QWebEnginePage * &)));
#else
    // Register the slot when click on the URL link form main menu bar
    connect(m_mainWebView, SIGNAL(linkClicked(const QUrl &)),SLOT(urlLinkClicked(const QUrl &)));
#endif

    // Register the slot on tab index change
    connect(m_tabWidget,SIGNAL(currentChanged(int )),this,SLOT(tabIndexChanged(int )));

    // Listen for download file request from the web page
#if QT_VERSION >= 0x050500
    // Register downloadRequested signal of QWenEngineProfile to start download file to client side.
    connect(m_mainWebView->page()->profile(),SIGNAL(downloadRequested(QWebEngineDownloadItem*)),this,SLOT(downloadRequested(QWebEngineDownloadItem*)));
#else
    m_mainWebView->page()->setForwardUnsupportedContent(true);
    connect(m_mainWebView->page(), SIGNAL(downloadRequested(const QNetworkRequest &)), this, SLOT(download(const QNetworkRequest &)));
    connect(m_mainWebView->page(), SIGNAL(unsupportedContent(QNetworkReply*)), this, SLOT(unsupportedContent(QNetworkReply*)));
    m_mainWebView->page()->setLinkDelegationPolicy(QWebPage::DelegateAllLinks);
#endif

    // Restore the geometry
    QSettings settings;
    restoreGeometry(settings.value("Browser/Geometry").toByteArray());
    restoreState(settings.value("Browser/WindowState").toByteArray());

    // Set the initial zoom
    qreal zoom = settings.value("Browser/Zoom", m_mainWebView->zoomFactor()).toReal();
    m_mainWebView->setZoomFactor(zoom);

    // The last save location
    m_last_open_folder_path = settings.value("Browser/LastSaveLocation", QDir::homePath()).toString();

    // Display the app
    m_initialLoad = true;
    m_loadAttempt = 1;
    m_mainWebView->setUrl(m_appServerUrl);
}

// Save the window geometry on close
void BrowserWindow::closeEvent(QCloseEvent *event)
{
    QSettings settings;
    settings.setValue("Browser/Geometry", saveGeometry());
    settings.setValue("Browser/WindowState", saveState());
    QMainWindow::closeEvent(event);
}


// Create the actions for the window
void BrowserWindow::createActions()
{
    // Open an arbitrary URL
    openUrlShortcut = new QShortcut(QKeySequence(Qt::ALT + Qt::SHIFT + Qt::Key_U), this);
    openUrlShortcut->setContext(Qt::ApplicationShortcut);
    connect(openUrlShortcut, SIGNAL(activated()), this, SLOT(openUrl()));

    // Set the Python Path
    preferencesShortcut = new QShortcut(QKeySequence(Qt::ALT + Qt::SHIFT + Qt::Key_P), this);
    preferencesShortcut->setContext(Qt::ApplicationShortcut);
    connect(preferencesShortcut, SIGNAL(activated()), this, SLOT(preferences()));

    // Exit the app
    exitShortcut = new QShortcut(QKeySequence::Quit, this);
    exitShortcut->setContext(Qt::ApplicationShortcut);
    connect(exitShortcut, SIGNAL(activated()), this, SLOT(close()));

    // About box
    aboutShortcut = new QShortcut(QKeySequence(Qt::ALT + Qt::SHIFT + Qt::Key_A), this);
    aboutShortcut->setContext(Qt::ApplicationShortcut);
    connect(aboutShortcut, SIGNAL(activated()), this, SLOT(about()));

    // Zoom in
    zoomInShortcut = new QShortcut(QKeySequence(QKeySequence::ZoomIn), this);
    zoomInShortcut->setContext(Qt::ApplicationShortcut);
    connect(zoomInShortcut, SIGNAL(activated()), this, SLOT(zoomIn()));

    // Zoom out
    zoomOutShortcut = new QShortcut(QKeySequence(QKeySequence::ZoomOut), this);
    zoomOutShortcut->setContext(Qt::ApplicationShortcut);
    connect(zoomOutShortcut, SIGNAL(activated()), this, SLOT(zoomOut()));
}


// Process loading finished signals from the web view.
void BrowserWindow::finishLoading(bool ok)
{
    if (m_initialLoad && !ok)
    {
        // The load attempt failed. Try again up to 4 times with an
        // incremental backoff.
        if (m_loadAttempt < 5)
        {
            if (m_loadAttempt > 1)
            {
                qDebug() << "Initial connection failed. Retrying in" << m_loadAttempt << "seconds.";
                m_mainWebView->setHtml(QString(tr("<p>Failed to connect to the pgAdmin application server. Retrying in %1 seconds, ") +
                                         tr("or click <a href=\"%2\">here</a> to try again now.</p>")).arg(m_loadAttempt).arg(m_appServerUrl));
            }
            else
            {
               m_mainWebView->setHtml(QString(tr("<p>Connecting to the application server...</p>")));
            }

            pause(m_loadAttempt);
            m_mainWebView->setUrl(m_appServerUrl);
            m_loadAttempt++;

            return;
        }
        else
        {
            qDebug() << "Initial connection failed after multiple attempts. Aborting.";
            m_mainWebView->setHtml(QString(tr("<p>Failed to connect to the pgAdmin application server. ") +
                                     tr("Click <a href=\"%1\">here</a> to try again.</p>")).arg(m_appServerUrl));
        }
    }

    m_initialLoad = false;
}

// Check if Tab is already open with given URL name
int BrowserWindow::findURLTab(const QUrl &name)
{
    int tabCount = 0;
    WebViewWindow *webviewPtr = NULL;

    for (tabCount = 1; tabCount < m_tabWidget->count(); tabCount++)
    {
        QWidget *tab = m_tabWidget->widget(tabCount);
        if (tab != NULL)
        {
            QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
            foreach( QWidget* widgetPtr, widgetList )
            {
                if (widgetPtr != NULL)
                {
                    webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);

                    if (webviewPtr != NULL && !QString::compare(webviewPtr->getFirstLoadURL(),name.host(), Qt::CaseInsensitive))
                    {
                        m_tabWidget->setCurrentIndex(tabCount);
                        return 1;
                    }
                }
            }
        }
    }

    return 0;
}

#if QT_VERSION >= 0x050500
// Below slot will be called when user start download (Only for QWebEngine. Qt version >= 5.5)
void BrowserWindow::downloadRequested(QWebEngineDownloadItem *download)
{
    // Save the web engine download item state. it require when user cancel the download.
    if (download != NULL)
        m_download = download;

    // Extract filename and query from encoded URL
    QUrlQuery query_data(download->url());
    QString file_name = query_data.queryItemValue("filename");
    QString query = query_data.queryItemValue("query");

    if (m_downloadStarted)
    {
        // Inform user that download is already started
        QMessageBox::information(this, tr("Download warning"), tr("File download already in progress: %1").arg(m_defaultFilename));
        return;
    }

    // If encoded URL contains 'filename' attribute then use that filename in file dialog.
    if (file_name.isEmpty() && query.isEmpty())
        m_defaultFilename = QFileInfo(download->url().toString()).fileName();
    else
        m_defaultFilename = file_name;

    QFileDialog save_dialog(this);
    save_dialog.setAcceptMode(QFileDialog::AcceptSave);
    save_dialog.setWindowTitle(tr("Save file"));
    save_dialog.setDirectory(m_last_open_folder_path);
    save_dialog.selectFile(m_defaultFilename);

    QObject::connect(&save_dialog, SIGNAL(directoryEntered(const QString &)), this, SLOT(current_dir_path(const QString &)));
    m_dir = m_last_open_folder_path;
    QString fileName = "";
    QString f_name = "";

    if (save_dialog.exec() == QDialog::Accepted) {
        fileName = save_dialog.selectedFiles().first();
        f_name = fileName.replace(m_dir, "");
        // Remove the first character(/) from fiename
        f_name.remove(0,1);
        m_defaultFilename = f_name;
    }
    else
        return;

    fileName = m_dir + fileName;
    // Clear last open folder path
    m_dir.clear();

#ifdef __APPLE__
    // Check that user has given valid file name or not - forward slash is not allowed in file name
    // In Mac OSX, forward slash is converted to colon(:) by Qt so we need to check for colon.
    if (f_name.indexOf(":") != -1)
    {
        QMessageBox::information(this, tr("File name error"), tr("Invalid file name"));
        return;
    }
#else
    // Check that user has given valid file name or not - forward slash is not allowed in file name
    if (f_name.indexOf("/") != -1)
    {
        QMessageBox::information(this, tr("File name error"), tr("Invalid file name"));
        return;
    }
#endif

    if (fileName.isEmpty())
        return;
    else
    {
        m_downloadFilename = fileName;
        if (download != NULL)
        {
            m_downloadStarted = 1;
            m_downloadCancelled = 0;
            connect(download, SIGNAL(downloadProgress(qint64,qint64)), this, SLOT(downloadEngineFileProgress(qint64,qint64)));
            connect(download, SIGNAL(finished()), this, SLOT(downloadEngineFinished()));
            download->setPath(m_downloadFilename);
            download->accept();
        }
    }
}
#endif

// Below slot will be called when user right click on download link and select "Save Link..." option from context menu
void BrowserWindow::download(const QNetworkRequest &request)
{
    // Check that request contains data for download at client side
    QUrl name;

    if (m_downloadStarted)
    {
        // Inform user that a download is already started
        QMessageBox::information(this, tr("Download warning"), tr("File download already in progress: %1").arg(m_defaultFilename));
        return;
    }

    m_defaultFilename = QFileInfo(request.url().toString()).fileName();

    // Open the dialog to save file
    QFileDialog save_dialog(this);
    save_dialog.setAcceptMode(QFileDialog::AcceptSave);
    save_dialog.setWindowTitle(tr("Save file"));
    save_dialog.setDirectory(m_last_open_folder_path);
    save_dialog.selectFile(m_defaultFilename);

    // Register the slot for directory travesing when file dialog is opened and save the last open directory
    QObject::connect(&save_dialog, SIGNAL(directoryEntered(const QString &)), this, SLOT(current_dir_path(const QString &)));
    m_dir = m_last_open_folder_path;
    QString fileName = "";
    QString f_name = "";

    if (save_dialog.exec() == QDialog::Accepted) {
        fileName = save_dialog.selectedFiles().first();
        f_name = fileName.replace(m_dir, "");

        // Remove the first character(/) from fiename
        f_name.remove(0,1);
        m_defaultFilename = f_name;
    }
    else
        return;

    fileName = m_dir + fileName;
    // Clear the last open directory path
    m_dir.clear();

#ifdef __APPLE__
    // Check that user has given valid file name or not - forward slash is not allowed in file name
    // In Mac OSX, forward slash is converted to colon(:) by Qt so we need to check for colon.
    if (f_name.indexOf(":") != -1)
    {
        QMessageBox::information(this, tr("File name error"), tr("Invalid file name"));
        return;
    }
#else
    // Check that user has given valid file name or not - forward slash is not allowed in file name
    if (f_name.indexOf("/") != -1)
    {
        QMessageBox::information(this, tr("File name error"), tr("Invalid file name"));
        return;
    }
#endif

    if (fileName.isEmpty())
        return;
    else
    {
        m_downloadFilename = fileName;

        QNetworkRequest newRequest = request;
        newRequest.setAttribute(QNetworkRequest::User, fileName);

        QObject *obj_web_page = QObject::sender();
        if (obj_web_page != NULL)
        {
#if QT_VERSION >= 0x050500
            WebEnginePage *sender_web_page = dynamic_cast<WebEnginePage*>(obj_web_page);
#else
            QWebPage *sender_web_page = dynamic_cast<QWebPage*>(obj_web_page);
#endif
            if (sender_web_page != NULL)
            {
#if QT_VERSION < 0x050500
                QNetworkAccessManager *networkManager = sender_web_page->networkAccessManager();
                QNetworkReply *reply = networkManager->get(newRequest);
                if (reply != NULL)
                {
                    m_downloadStarted = 1;
                    m_downloadCancelled = 0;

                    // Connect the signals for downloadProgress and downloadFinished
                    connect( reply, SIGNAL(downloadProgress(qint64, qint64)), this, SLOT(downloadFileProgress(qint64, qint64)) );
                    connect( reply, SIGNAL(finished()), this, SLOT(downloadFinished()));
                }
#endif
            }
        }
    }
}

#if QT_VERSION >= 0x050500
// Below slot will be called when file download is in progress ( Only for QWebEngine Qt version >= 5.5 )
void BrowserWindow::downloadEngineFileProgress(qint64 readData, qint64 totalData)
{
    // Check if progress dialog is already opened then only update the progress bar status
    if (!m_progressDialog)
    {
        // Create progress bar dialog
        m_progressDialog = new QProgressDialog (tr("Downloading file: %1 ").arg(m_defaultFilename), "Cancel", 0, totalData, this);
        m_progressDialog->setWindowModality(Qt::WindowModal);
        m_progressDialog->setWindowTitle(tr("Download progress"));
        m_progressDialog->setMinimumWidth(450);
        m_progressDialog->setMinimumHeight(80);
        m_progressDialog->setWindowFlags(Qt::Window | Qt::CustomizeWindowHint | Qt::WindowMinimizeButtonHint | Qt::WindowCloseButtonHint);

        // Register slot for file download cancel request
        QObject::connect(m_progressDialog, SIGNAL(canceled()), this, SLOT(progressCanceled()));

        // Show downloading progress bar
        m_progressDialog->show();
    }
    else
        m_progressDialog->setValue(readData);
}
#endif

// Below slot will be called when file download is in progress
void BrowserWindow::downloadFileProgress(qint64 readData, qint64 totalData)
{
    QNetworkReply *reply = ((QNetworkReply*)sender());
    QNetworkRequest request = reply->request();
    QVariant v = request.attribute(QNetworkRequest::User);

    // When download is canceled by user then no need to write data to file
    if (m_downloadCancelled)
        return;

    if(reply != NULL && reply->error() != QNetworkReply::NoError)
    {
        qDebug() << "Network error occurred whilst downloading: " << m_defaultFilename;
        return;
    }

    // Download is started so open the file
    if (!m_file)
    {
        m_file = new QFile(m_downloadFilename);
        if (!m_file->open(QIODevice::WriteOnly))
        {
            qDebug() << "Error opening file: " << m_downloadFilename;
            m_downloadFilename.clear();
            m_defaultFilename.clear();
            m_downloadStarted = 0;
            return;
        }

        // Create progress bar dialog
        m_progressDialog = new QProgressDialog (tr("Downloading file: %1 ").arg(m_defaultFilename), "Cancel", readData, totalData, this);
        m_progressDialog->setWindowModality(Qt::WindowModal);
        m_progressDialog->setWindowTitle(tr("Download progress"));
        m_progressDialog->setMinimumWidth(450);
        m_progressDialog->setMinimumHeight(80);
        m_progressDialog->setWindowFlags(Qt::Window | Qt::CustomizeWindowHint | Qt::WindowMinimizeButtonHint | Qt::WindowCloseButtonHint);

        // Register slot for file download cancel request
        QObject::connect(m_progressDialog, SIGNAL(canceled()), this, SLOT(progressCanceled()));
        m_reply = reply;

        // Show downloading progress bar
        m_progressDialog->show();
    }

    if (m_file)
    {
        // Write data to file
        m_file->write(reply->read(readData));
        m_progressDialog->setValue(readData);

        // As read data and totalData difference is zero means downloading is finished.
        if ((totalData - readData) == 0 ||
            (readData != 0 && totalData == -1))
        {
            // As downloading is finished so remove progress bar dialog
            if (m_progressDialog)
            {
                m_progressDialog->deleteLater();
                m_progressDialog = NULL;
            }

            m_downloadStarted = 0;
            m_downloadFilename.clear();
            m_defaultFilename.clear();
            m_downloadCancelled = 0;

            if (m_file)
            {
                m_file->close();
                delete m_file;
                m_file = NULL;
            }

            if (m_reply)
              m_reply = NULL;
        }
    }
}

// Below slot will be called when user cancel the downloading file which is in progress.
void BrowserWindow::progressCanceled()
{
    m_downloadCancelled = 1;

    if (m_progressDialog)
    {
        m_progressDialog->deleteLater();
        m_progressDialog = NULL;
    }

#if QT_VERSION < 0x050500
    if (m_file)
    {
        m_file->close();
        // Remove the file from file system as downloading is canceled by user
        m_file->remove();
        delete m_file;
        m_file = NULL;
    }

    if (m_reply)
    {
        m_reply->abort();
        m_reply = NULL;
    }
#else
    m_download->cancel();
#endif

    m_downloadFilename.clear();
    m_defaultFilename.clear();
    m_downloadStarted = 0;
}

#if QT_VERSION >= 0x050500
// Below slot will called when file download is finished ( Only for QWebEngine, Qt version >= 5.5 )
void BrowserWindow::downloadEngineFinished()
{
    // Check download finished state.
    if (m_download)
    {
        QWebEngineDownloadItem::DownloadState state = m_download->state();

        switch (state)
        {
            case QWebEngineDownloadItem::DownloadRequested:
            case QWebEngineDownloadItem::DownloadInProgress:
                Q_UNREACHABLE();
                break;
            case QWebEngineDownloadItem::DownloadCompleted:
            case QWebEngineDownloadItem::DownloadCancelled:
            case QWebEngineDownloadItem::DownloadInterrupted:
                m_download = NULL;
                break;
        }
    }

    if (m_progressDialog)
    {
        m_progressDialog->deleteLater();
        m_progressDialog = NULL;
    }

    m_downloadFilename.clear();
    m_defaultFilename.clear();
    m_downloadStarted = 0;
    m_downloadCancelled = 0;
}
#endif

// Below slot will called when file download is finished
void BrowserWindow::downloadFinished()
{
    if (m_progressDialog)
    {
        m_progressDialog->deleteLater();
        m_progressDialog = NULL;
    }

    m_downloadFilename.clear();
    m_defaultFilename.clear();
    m_downloadStarted = 0;
    m_downloadCancelled = 0;

    if (m_file)
    {
        m_file->close();
        delete m_file;
        m_file = NULL;
    }

    if (m_reply)
        m_reply = NULL;
}

// Below slot will be called when user directly click on any download link
void BrowserWindow::unsupportedContent(QNetworkReply * reply)
{
#if QT_VERSION >= 0x050000
    // Extract filename and query from encoded URL
    QUrlQuery query_data(reply->url());
    QString file_name = query_data.queryItemValue("filename");
    QString query = query_data.queryItemValue("query");
#else
    QUrl url(reply->url());
    QString file_name = url.queryItemValue("filename");
    QString query = url.queryItemValue("query");
#endif

    if (m_downloadStarted)
    {
        // Inform user that download is already started
        QMessageBox::information(this, tr("Download warning"), tr("File download already in progress: %1").arg(m_defaultFilename));
        return;
    }

    // If encoded URL contains 'filename' attribute then use that filename in file dialog.
    if (file_name.isEmpty() && query.isEmpty())
        m_defaultFilename = QFileInfo(reply->url().toString()).fileName();
    else
        m_defaultFilename = file_name;

    QFileDialog save_dialog(this);
    save_dialog.setAcceptMode(QFileDialog::AcceptSave);
    save_dialog.setWindowTitle(tr("Save file"));
    save_dialog.setDirectory(m_last_open_folder_path);
    save_dialog.selectFile(m_defaultFilename);

    QObject::connect(&save_dialog, SIGNAL(directoryEntered(const QString &)), this, SLOT(current_dir_path(const QString &)));
    m_dir = m_last_open_folder_path;
    QString fileName = "";
    QString f_name = "";

    if (save_dialog.exec() == QDialog::Accepted) {
        fileName = save_dialog.selectedFiles().first();
        f_name = fileName.replace(m_dir, "");
        // Remove the first character(/) from fiename
        f_name.remove(0,1);
        m_defaultFilename = f_name;
    }
    else
        return;

    fileName = m_dir + fileName;
    // Clear last open folder path
    m_dir.clear();

#ifdef __APPLE__
    // Check that user has given valid file name or not - forward slash is not allowed in file name
    // In Mac OSX, forward slash is converted to colon(:) by Qt so we need to check for colon.
    if (f_name.indexOf(":") != -1)
    {
        QMessageBox::information(this, tr("File name error"), tr("Invalid file name"));
        return;
    }
#else
    // Check that user has given valid file name or not - forward slash is not allowed in file name
    if (f_name.indexOf("/") != -1)
    {
        QMessageBox::information(this, tr("File name error"), tr("Invalid file name"));
        return;
    }
#endif

    if (fileName.isEmpty())
        return;
    else
    {
        m_downloadFilename = fileName;
        if (reply != NULL)
        {
            m_downloadStarted = 1;
            m_downloadCancelled = 0;
            connect( reply, SIGNAL(downloadProgress(qint64, qint64)), this, SLOT(downloadFileProgress(qint64, qint64)));
            connect( reply, SIGNAL(finished()), this, SLOT(downloadFinished()));
        }
    }
}

// Slot: When the tab index change, hide/show the toolbutton displayed on tab
void BrowserWindow::tabIndexChanged(int index)
{
    int tabCount = 1;
    for (tabCount = 1; tabCount < m_tabWidget->count(); tabCount++)
    {
        if (tabCount != index)
            m_tabWidget->showHideToolButton(tabCount, 0);
        else
            m_tabWidget->showHideToolButton(tabCount, 1);
    }
}

// Close the tab and remove the memory of the given index tab
void BrowserWindow::closetabs()
{
    int loopCount = 0;
    int index = 0;
    QPushButton *btn = NULL;
    int totalTabs = m_tabWidget->count();

    // If QTabWidget contains only one tab then hide the TabBar window
    if ((totalTabs - 1) < 2)
	    m_tabWidget->tabBar()->setVisible(false);
    else
	    m_tabWidget->tabBar()->setVisible(true);

    QObject *senderPtr = QObject::sender();
    if (senderPtr != NULL)
    {
        btn = dynamic_cast<QPushButton*>(senderPtr);
        index = m_tabWidget->getButtonIndex(btn);
    }

    if (index != 0)
    {
        QWidget *tab = m_tabWidget->widget(index);
        WebViewWindow *webviewPtr = NULL;
        loopCount = 0;

        // free the allocated memory when the tab is closed
        if (tab != NULL)
            delete tab;

        // Adjust the tab index value if the tab is closed in between
        for (loopCount = 1; loopCount < totalTabs; loopCount++)
        {
            if (index > loopCount)
                continue;

            QWidget *tab = m_tabWidget->widget(loopCount);
            if (tab != NULL)
            {
                QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
                foreach( QWidget* widgetPtr, widgetList )
                {
                    if (widgetPtr != NULL)
                    {
                        webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);
                        if (webviewPtr != NULL)
                            webviewPtr->setTabIndex((webviewPtr->getTabIndex() - 1));
                    }
                }
            }
        }
    }
}

// Slot: go back to page and enable/disable toolbutton
void BrowserWindow::goBackPage()
{
    WebViewWindow *webviewPtr = NULL;

    QWidget *tab = m_tabWidget->widget(m_tabWidget->currentIndex());
    if (tab != NULL)
    {
        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
            {
                webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);
                if (webviewPtr != NULL)
                {
                    webviewPtr->back();
                    m_tabWidget->enableDisableToolButton(m_tabWidget->currentIndex());
                }
            }
        }
    }
}

// Slot: go forward to page and enable/disable toolbutton
void BrowserWindow::goForwardPage()
{
    WebViewWindow *webviewPtr = NULL;

    QWidget *tab = m_tabWidget->widget(m_tabWidget->currentIndex());
    if (tab != NULL)
    {
        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
            {
                webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);
                if (webviewPtr != NULL)
                {
                    webviewPtr->forward();
                    m_tabWidget->enableDisableToolButton(m_tabWidget->currentIndex());
                }
            }
        }
    }
}

// Slot: set the title of tab when the new tab created or existing tab contents changed
void BrowserWindow::tabTitleChanged(const QString &str)
{
    if (!str.isEmpty())
    {
        QObject *senderPtr = QObject::sender();
        WebViewWindow *webViewPtr = NULL;
        if (senderPtr != NULL)
        {
            webViewPtr = dynamic_cast<WebViewWindow*>(senderPtr);
            if (webViewPtr != NULL)
            {
                m_tabWidget->setTabText(webViewPtr->getTabIndex(), str);
                m_tabWidget->setTabToolTipText(webViewPtr->getTabIndex(), str);
                m_tabWidget->enableDisableToolButton(webViewPtr->getTabIndex());
            }
        }
        else
        {
            m_tabWidget->setTabText(m_tabWidget->currentIndex(), str);
            m_tabWidget->setTabToolTipText(m_tabWidget->currentIndex(), str);
        }
    }
}

void BrowserWindow::current_dir_path(const QString &dir)
{
    m_dir = dir;
    m_last_open_folder_path = dir;

    QSettings settings;
    settings.setValue("Browser/LastSaveLocation", m_last_open_folder_path);
}

#if QT_VERSION >= 0x050500
// Below slot will be called when link is required to open in new tab.
void BrowserWindow::createNewTabWindow(QWebEnginePage * &p)
{
    m_addNewTab = new QWidget(m_tabWidget);
    m_addNewGridLayout = new QGridLayout(m_addNewTab);
    m_addNewGridLayout->setContentsMargins(0, 0, 0, 0);
    m_addNewWebView = new WebViewWindow(m_addNewTab);
    m_addNewWebView->setPage(new WebEnginePage());
    m_addNewWebView->setZoomFactor(m_mainWebView->zoomFactor());

    m_widget = new QWidget(m_addNewTab);
    m_toolBtnBack = new QToolButton(m_widget);
    m_toolBtnBack->setFixedHeight(PGA_BTN_SIZE);
    m_toolBtnBack->setFixedWidth(PGA_BTN_SIZE);
    m_toolBtnBack->setIcon(QIcon(":/back.png"));
    m_toolBtnBack->setToolTip(tr("Go back"));
    m_toolBtnBack->setDisabled(true);

    m_toolBtnForward = new QToolButton(m_widget);
    m_toolBtnForward->setFixedHeight(PGA_BTN_SIZE);
    m_toolBtnForward->setFixedWidth(PGA_BTN_SIZE);
    m_toolBtnForward->setIcon(QIcon(":/forward.png"));
    m_toolBtnForward->setToolTip(tr("Go forward"));
    m_toolBtnForward->setDisabled(true);

    QPushButton *m_btnClose = new QPushButton(m_widget);
    m_btnClose->setFixedHeight(PGA_BTN_SIZE);
    m_btnClose->setFixedWidth(PGA_BTN_SIZE);
    m_btnClose->setIcon(QIcon(":/close.png"));
    m_btnClose->setToolTip(tr("Close tab"));

    m_horizontalLayout = new QHBoxLayout(m_widget);
    m_horizontalLayout->setSizeConstraint(QLayout::SetMinAndMaxSize);
    m_horizontalLayout->setSpacing(1);
    m_horizontalLayout->addWidget(m_toolBtnBack);
    m_horizontalLayout->addWidget(m_toolBtnForward);

    // Register the slot on titleChange so set the tab text accordingly
    connect(m_addNewWebView, SIGNAL(titleChanged(const QString &)), SLOT(tabTitleChanged(const QString &)));

    // Register the slot on toolbutton to show the previous history of web
    connect(m_toolBtnBack, SIGNAL(clicked()), this, SLOT(goBackPage()));

    // Register the slot on toolbutton to show the next history of web
    connect(m_toolBtnForward, SIGNAL(clicked()), this, SLOT(goForwardPage()));

    // Register the slot on close button , added manually
    connect(m_btnClose, SIGNAL(clicked()), SLOT(closetabs()));

    m_addNewGridLayout->addWidget(m_addNewWebView, 0, 0, 1, 1);
    m_tabWidget->addTab(m_addNewTab, QString());
    m_tabWidget->tabBar()->setVisible(true);
    m_tabWidget->setCurrentIndex((m_tabWidget->count() - 1));

    // Set the back and forward button on tab
    m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::LeftSide, m_widget);
    m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::RightSide, m_btnClose);

    m_addNewWebView->setTabIndex((m_tabWidget->count() - 1));
    p = m_addNewWebView->page();
}
#endif

// Slot: Link is open from pgAdmin mainwindow
void BrowserWindow::urlLinkClicked(const QUrl &name)
{
    // Check that request contains the data download at client side
    QNetworkRequest request;

    // First check is there any tab opened with same URL then open it again.
    int tabFound = findURLTab(name);

    if (!tabFound)
    {
        m_addNewTab = new QWidget(m_tabWidget);
        m_addNewGridLayout = new QGridLayout(m_addNewTab);
        m_addNewGridLayout->setContentsMargins(0, 0, 0, 0);
        m_addNewWebView = new WebViewWindow(m_addNewTab);
        m_addNewWebView->setZoomFactor(m_mainWebView->zoomFactor());

        // Listen for the download request from the web page
#if QT_VERSION >= 0x050500
        connect(m_addNewWebView->page()->profile(),SIGNAL(downloadRequested(QWebEngineDownloadItem*)),this,SLOT(downloadRequested(QWebEngineDownloadItem*)));
#else
        m_addNewWebView->page()->setForwardUnsupportedContent(true);
        connect(m_addNewWebView->page(), SIGNAL(downloadRequested(const QNetworkRequest &)), this, SLOT(download(const QNetworkRequest &)));
        connect(m_addNewWebView->page(), SIGNAL(unsupportedContent(QNetworkReply*)), this, SLOT(unsupportedContent(QNetworkReply*)));
#endif

        m_widget = new QWidget(m_addNewTab);
        m_toolBtnBack = new QToolButton(m_widget);
        m_toolBtnBack->setFixedHeight(PGA_BTN_SIZE);
        m_toolBtnBack->setFixedWidth(PGA_BTN_SIZE);
        m_toolBtnBack->setIcon(QIcon(":/back.png"));
        m_toolBtnBack->setToolTip(tr("Go back"));
        m_toolBtnBack->setDisabled(true);

        m_toolBtnForward = new QToolButton(m_widget);
        m_toolBtnForward->setFixedHeight(PGA_BTN_SIZE);
        m_toolBtnForward->setFixedWidth(PGA_BTN_SIZE);
        m_toolBtnForward->setIcon(QIcon(":/forward.png"));
        m_toolBtnForward->setToolTip(tr("Go forward"));
        m_toolBtnForward->setDisabled(true);

        QPushButton *m_btnClose = new QPushButton(m_widget);
        m_btnClose->setFixedHeight(PGA_BTN_SIZE);
        m_btnClose->setFixedWidth(PGA_BTN_SIZE);
        m_btnClose->setIcon(QIcon(":/close.png"));
        m_btnClose->setToolTip(tr("Close tab"));

        m_horizontalLayout = new QHBoxLayout(m_widget);
        m_horizontalLayout->setSizeConstraint(QLayout::SetMinAndMaxSize);
        m_horizontalLayout->setSpacing(1);
        m_horizontalLayout->addWidget(m_toolBtnBack);
        m_horizontalLayout->addWidget(m_toolBtnForward);

        // Register the slot on titleChange so set the tab text accordingly
        connect(m_addNewWebView, SIGNAL(titleChanged(const QString &)), SLOT(tabTitleChanged(const QString &)));

        // Register the slot on toolbutton to show the previous history of web
        connect(m_toolBtnBack, SIGNAL(clicked()), this, SLOT(goBackPage()));

        // Register the slot on toolbutton to show the next history of web
        connect(m_toolBtnForward, SIGNAL(clicked()), this, SLOT(goForwardPage()));

        // Register the slot on close button , added manually
        connect(m_btnClose, SIGNAL(clicked()), SLOT(closetabs()));

        m_addNewGridLayout->addWidget(m_addNewWebView, 0, 0, 1, 1);
        m_tabWidget->addTab(m_addNewTab, QString());
        m_tabWidget->tabBar()->setVisible(true);
        m_tabWidget->setCurrentIndex((m_tabWidget->count() - 1));

        // Set the back and forward button on tab
        m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::LeftSide, m_widget);
        m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::RightSide, m_btnClose);

        m_addNewWebView->setFirstLoadURL(name.host());
        m_addNewWebView->setTabIndex((m_tabWidget->count() - 1));
        m_addNewWebView->setUrl(name);
    }
}

// Pause for n seconds, without freezing the UI.
void BrowserWindow::pause(int seconds)
{
    QTime dieTime = QTime::currentTime().addSecs(seconds);

    while (QTime::currentTime() < dieTime)
        QCoreApplication::processEvents(QEventLoop::AllEvents, 100);    
}

// Display the about box
void BrowserWindow::about()
{
    QMessageBox::about(this, tr("About %1").arg(PGA_APP_NAME), tr("%1 - PostgreSQL Tools").arg(PGA_APP_NAME));
}


// Zoom in
void BrowserWindow::zoomIn()
{
    int tabCount = 0;
    WebViewWindow *webviewPtr = NULL;

    // Loop through all the tabs
    for (tabCount = 0; tabCount < m_tabWidget->count(); tabCount++)
    {
        QWidget *tab = m_tabWidget->widget(tabCount);
        if (tab != NULL)
        {
            // Find and loop through any child controls
            QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
            foreach( QWidget* widgetPtr, widgetList )
            {
                if (widgetPtr != NULL)
                {
                    // If it's a web view control, set the zoom level based on the main view
                    webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);

                    if (webviewPtr != NULL)
                    {
                        webviewPtr->setZoomFactor(m_mainWebView->zoomFactor() + 0.1);
                    }
                }
            }
        }
    }

    // Save the zoom factor for next time
    QSettings settings;
    settings.setValue("Browser/Zoom", m_mainWebView->zoomFactor());
}


// Zoom out
void BrowserWindow::zoomOut()
{
    int tabCount = 0;
    WebViewWindow *webviewPtr = NULL;

    // Loop through all the tabs
    for (tabCount = 0; tabCount < m_tabWidget->count(); tabCount++)
    {
        QWidget *tab = m_tabWidget->widget(tabCount);
        if (tab != NULL)
        {
            // Find and loop through any child controls
            QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
            foreach( QWidget* widgetPtr, widgetList )
            {
                if (widgetPtr != NULL)
                {
                    // If it's a web view control, set the zoom level based on the main view
                    webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);

                    if (webviewPtr != NULL)
                    {
                        webviewPtr->setZoomFactor(m_mainWebView->zoomFactor() - 0.1);
                    }
                }
            }
        }
    }

    // Save the zoom factor for next time
    QSettings settings;
    settings.setValue("Browser/Zoom", m_mainWebView->zoomFactor());
}


// Open an arbitrary URL
void BrowserWindow::openUrl()
{
    bool ok;

    QInputDialog *dlg = new QInputDialog();
    dlg->setInputMode(QInputDialog::TextInput);
    dlg->setWindowTitle(QWidget::tr("Open URL"));
    dlg->setLabelText(QWidget::tr("Enter a URL"));
    dlg->setTextValue("http://");
    dlg->resize(600,100);

    ok = dlg->exec();

    QString url = dlg->textValue();

    if (ok && !url.isEmpty())
        urlLinkClicked(QUrl(url));
}

// Edit the app configuration
void BrowserWindow::preferences()
{
    QSettings settings;
    bool ok;

    ConfigWindow *dlg = new ConfigWindow();
    dlg->setWindowTitle(QWidget::tr("Configuration"));
    dlg->setPythonPath(settings.value("PythonPath").toString());
    dlg->setApplicationPath(settings.value("ApplicationPath").toString());
    dlg->setModal(true);
    ok = dlg->exec();

    QString pythonpath = dlg->getPythonPath();
    QString applicationpath = dlg->getApplicationPath();

    if (ok)
    {
        settings.setValue("PythonPath", pythonpath);
        settings.setValue("ApplicationPath", applicationpath);
    }
}

