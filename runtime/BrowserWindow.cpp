//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// BrowserWindow.cpp - Implementation of the main window class
//
//////////////////////////////////////////////////////////////////////////

#include "pgAdmin4.h"

#if QT_VERSION >= 0x050000
#include <QtWidgets>
#ifdef PGADMIN4_USE_WEBENGINE
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
    is_readyReadSignaled = false;
    m_readBytes = 0;
#ifdef PGADMIN4_USE_WEBENGINE
    m_download = NULL;
#endif

    m_appServerUrl = url;

#ifdef _WIN32
    m_regMessage = "";
#endif

    // Setup the shortcuts
    createActions();

    m_tabWidget = new DockTabWidget(this);
    m_tabWidget->tabBar()->setVisible(false);

    m_mainGridLayout = new QGridLayout(m_tabWidget);
    m_mainGridLayout->setContentsMargins(0, 0, 0, 0);
    m_pgAdminMainTab = new QWidget(m_tabWidget);
    m_tabGridLayout = new QGridLayout(m_pgAdminMainTab);
    m_tabGridLayout->setContentsMargins(0, 0, 0, 0);
    m_mainWebView = new WebViewWindow(m_pgAdminMainTab);

#ifdef PGADMIN4_USE_WEBENGINE
    m_mainWebView->setPage(new WebEnginePage());
#else
    m_cookieJar = new QNetworkCookieJar();
    m_netAccessMan = new QNetworkAccessManager();
    m_netAccessMan->setCookieJar(m_cookieJar);
    m_mainWebView->setPage(new WebViewPage());
    m_mainWebView->page()->setNetworkAccessManager(m_netAccessMan);
    m_mainWebView->settings()->setAttribute(QWebSettings::JavascriptEnabled, true);
    m_mainWebView->settings()->setAttribute(QWebSettings::JavascriptCanOpenWindows, true);
#endif

#ifdef PGADMIN4_DEBUG
    // If pgAdmin4 is run in debug mode, then we should enable the
    // "Inspect" option, when the user right clicks on QWebView widget.
    // This option is useful to debug the pgAdmin4 desktop application and open the developer tools.
#ifdef PGADMIN4_USE_WEBENGINE
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

#ifdef PGADMIN4_USE_WEBENGINE
    // Register the slot when click on the URL link for QWebEnginePage
    connect(m_mainWebView->page(), SIGNAL(createTabWindow(QWebEnginePage * &)),SLOT(createNewTabWindow(QWebEnginePage * &)));
#else
    // Register the slot when click on the URL link form main menu bar
    connect(m_mainWebView, SIGNAL(linkClicked(const QUrl &)),SLOT(urlLinkClicked(const QUrl &)));
    // Register the slot when click on the URL link for QWebPage
    connect(m_mainWebView->page(), SIGNAL(createTabWindowKit(QWebPage * &)),SLOT(createNewTabWindowKit(QWebPage * &)));
#endif

    // Register the slot on tab index change
    connect(m_tabWidget,SIGNAL(currentChanged(int )), m_tabWidget,SLOT(tabIndexChanged(int )));

    // Listen for download file request from the web page
#ifdef PGADMIN4_USE_WEBENGINE
    // Register downloadRequested signal of QWenEngineProfile to start download file to client side.
    connect(m_mainWebView->page()->profile(),SIGNAL(downloadRequested(QWebEngineDownloadItem*)),this,SLOT(downloadRequested(QWebEngineDownloadItem*)));
#else
    m_mainWebView->page()->setForwardUnsupportedContent(true);
    connect(m_mainWebView->page(), SIGNAL(downloadRequested(const QNetworkRequest &)), this, SLOT(download(const QNetworkRequest &)));
    connect(m_mainWebView->page(), SIGNAL(unsupportedContent(QNetworkReply*)), this, SLOT(unsupportedContent(QNetworkReply*)));
    m_mainWebView->page()->setForwardUnsupportedContent(true);
    m_mainWebView->page()->setLinkDelegationPolicy(QWebPage::DelegateAllLinks);
#endif

    // Register the signal when base URL loading is finished.
    connect(m_mainWebView, SIGNAL(loadFinished(bool )),this, SLOT(urlLoadingFinished(bool )));

    // Restore the geometry, or set a nice default
    QSettings settings;

    QSize availableSize = qApp->desktop()->availableGeometry().size();
    QSize defaultSize(availableSize.width() * 0.9, availableSize.height() * 0.9);

    QRect defaultGeometry = QStyle::alignedRect(
        Qt::LeftToRight,
        Qt::AlignCenter,
        defaultSize,
        qApp->desktop()->availableGeometry()
    );

    restoreGeometry(settings.value("Browser/Geometry", defaultGeometry).toByteArray());
    restoreState(settings.value("Browser/WindowState").toByteArray());

    // Set the initial zoom
    qreal zoom = settings.value("Browser/Zoom", m_mainWebView->zoomFactor()).toReal();
    m_mainWebView->setZoomFactor(zoom);

    // The last save location
    m_last_open_folder_path = settings.value("Browser/LastSaveLocation", QDir::homePath()).toString();

    // Display the app
    m_mainWebView->setUrl(m_appServerUrl);
}

// Destructor
BrowserWindow::~BrowserWindow()
{
    if (m_tabWidget)
        delete m_tabWidget;
}

// Save the window geometry on close
void BrowserWindow::closeEvent(QCloseEvent *event)
{
    if (QMessageBox::Yes == QMessageBox::question(this, "Exit the application?", "Are you sure you want to exit the application?", QMessageBox::Yes | QMessageBox::No))
    {
        QSettings settings;
        settings.setValue("Browser/Geometry", saveGeometry());
        settings.setValue("Browser/WindowState", saveState());
        QMainWindow::closeEvent(event);
        event->accept();
    }
    else
    {
        event->ignore();
    }
}

#ifdef _WIN32
// Set the message when change in registry value.
void BrowserWindow::setRegistryMessage(const QString &msg)
{
    m_regMessage = msg;
}

QString BrowserWindow::getRegistryMessage()
{
    return m_regMessage;
}
#endif

void BrowserWindow::urlLoadingFinished(bool res)
{
    if (res)
    {
#ifdef _WIN32
        // Check if registry value is set by application then display information message to user.
        // If message is empty string means no value set by application in registry.
        QString message = getRegistryMessage();
        if (message != QString(""))
            QMessageBox::information(this, tr("Registry change"), message);
#endif
    }
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

    signalMapper = new QSignalMapper(this);

    // About box
    aboutShortcut = new QShortcut(QKeySequence(Qt::ALT + Qt::SHIFT + Qt::Key_A), this);
    aboutShortcut->setContext(Qt::ApplicationShortcut);
    connect(aboutShortcut, SIGNAL(activated()), this, SLOT(about()));

    // Zoom in
    zoomInShortcut = new QShortcut(QKeySequence(QKeySequence::ZoomIn), this);
    zoomInShortcut->setContext(Qt::ApplicationShortcut);
    signalMapper->setMapping(zoomInShortcut, 1);
    connect(zoomInShortcut, SIGNAL(activated()), signalMapper, SLOT(map()));

    // Zoom out
    zoomOutShortcut = new QShortcut(QKeySequence(QKeySequence::ZoomOut), this);
    zoomOutShortcut->setContext(Qt::ApplicationShortcut);
    signalMapper->setMapping(zoomOutShortcut, -1);
    connect(zoomOutShortcut, SIGNAL(activated()), signalMapper,  SLOT(map()));

    // Reset Zoom
    zoomResetShortcut = new QShortcut(QKeySequence(Qt::CTRL + Qt::Key_0), this);
    zoomResetShortcut->setContext(Qt::ApplicationShortcut);
    signalMapper->setMapping(zoomResetShortcut,  0);
    connect(zoomResetShortcut, SIGNAL(activated()), signalMapper,  SLOT(map()));

    connect(signalMapper, SIGNAL(mapped(int)), this, SLOT(setZoomLevel(int)));


#ifdef __APPLE__
  #ifdef PGADMIN4_USE_WEBENGINE
    QShortcut *cut_shortcut = new QShortcut(QKeySequence("Ctrl+X"), this);
    QObject::connect(cut_shortcut, SIGNAL(activated()), this, SLOT(onMacCut()));

    QShortcut *copy_shortcut = new QShortcut(QKeySequence("Ctrl+C"), this);
    QObject::connect(copy_shortcut, SIGNAL(activated()), this, SLOT(onMacCopy()));

    QShortcut *paste_shortcut = new QShortcut(QKeySequence("Ctrl+V"), this);
    QObject::connect(paste_shortcut, SIGNAL(activated()), this, SLOT(onMacPaste()));
  #endif
#endif

}

#ifdef __APPLE__
  #ifdef PGADMIN4_USE_WEBENGINE
// Find current tab widget's webview widget and trigger the respective events of web page
void BrowserWindow::triggerWebViewWindowEvents(QWebEnginePage::WebAction action)
{
    WebViewWindow *webviewPtr = NULL;

    // Find current selected index from the view and set the cut/copy/paste events.
    int index = m_tabWidget->currentIndex();

    // If main web view window is pgAdmin then we should return from here after triggering events
    if (index == 0)
    {
        m_mainWebView->triggerPageAction(action);
        return;
    }

    // if multiple webviews are opened then trigger cut/copy/paste events to respective webviews.
    QWidget *tab = m_tabWidget->widget(index);
    if (tab != NULL)
    {
        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
            {
                webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);

                if (webviewPtr != NULL)
                    webviewPtr->triggerPageAction(action);
            }
        }
    }
}

// Trigger web page's cut event
void BrowserWindow::onMacCut()
{
  triggerWebViewWindowEvents(QWebEnginePage::Cut);
}

// Trigger web page's copy event
void BrowserWindow::onMacCopy()
{
  triggerWebViewWindowEvents(QWebEnginePage::Copy);
}

// Trigger web page's paste event
void BrowserWindow::onMacPaste()
{
  triggerWebViewWindowEvents(QWebEnginePage::Paste);
}
  #endif
#endif

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

#ifdef PGADMIN4_USE_WEBENGINE
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
#ifdef PGADMIN4_USE_WEBENGINE
            WebEnginePage *sender_web_page = dynamic_cast<WebEnginePage*>(obj_web_page);
#else
            QWebPage *sender_web_page = dynamic_cast<QWebPage*>(obj_web_page);
#endif
            if (sender_web_page != NULL)
            {
#ifdef PGADMIN4_USE_WEBKIT
                QNetworkAccessManager *networkManager = sender_web_page->networkAccessManager();
                QNetworkReply *reply = networkManager->get(newRequest);
                if (reply != NULL)
                {
                    m_downloadStarted = 1;
                    m_downloadCancelled = 0;

                    // Download is started so open the file
                    if (!m_file)
                    {
                        if (!m_downloadFilename.isEmpty())
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
                            m_progressDialog = new QProgressDialog (tr("Downloading file: %1 ").arg(m_defaultFilename), "Cancel", 0, 100, this);
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
                    }

                    // Connect the signals for downloadProgress and downloadFinished
                    connect( reply, SIGNAL(readyRead()), this, SLOT(replyReady()));
                    connect( reply, SIGNAL(downloadProgress(qint64, qint64)), this, SLOT(downloadFileProgress(qint64, qint64)) );
                    connect( reply, SIGNAL(finished()), this, SLOT(downloadFinished()));
                }
#endif
            }
        }
    }
}

#ifdef PGADMIN4_USE_WEBENGINE
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

// Below slot will be called when data are available for download.
void BrowserWindow::replyReady()
{
    is_readyReadSignaled = true;
    // When download is canceled by user then no need to write data to file
    if (m_downloadCancelled)
        return;

    // Write the data received from network to file.
    if (m_reply != NULL && m_file != NULL)
    {
        QByteArray data= m_reply->readAll();
        int l_size = data.size();
        m_readBytes += (qint64)(l_size);
        m_file->write(data);
        // Calculate size in MB to be displayed in progress bar dialog.
        if (m_progressDialog) {
            qreal k_bytes = (((qreal)m_readBytes) / 1024);
            qreal m_bytes = (k_bytes / 1024);
            QString f_str = QString::number(m_bytes, 'f', 1);
            QString set_str = QString("Downloaded ") + f_str + QString(" MB");
            m_progressDialog->setLabelText(set_str);
        }
    }
}

// Below slot will be called when file download is in progress
void BrowserWindow::downloadFileProgress(qint64 readData, qint64 totalData)
{
    // When download is canceled by user then no need to write data to file
    if (m_downloadCancelled)
        return;

    if(m_reply != NULL && m_reply->error() != QNetworkReply::NoError)
    {
        qDebug() << "Network error occurred whilst downloading: " << m_defaultFilename;
        return;
    }

    if (m_file)
    {
        // Only update the status in progress bar as percentage.
        if (!is_readyReadSignaled)
        {
            m_progressDialog->setRange(0, totalData);
            m_progressDialog->setValue(readData);
        }

        // Check if download is finished without readyRead signal then write the data.
        if(m_reply && m_reply->isFinished() && !is_readyReadSignaled)
        {
            // Write data to file
            m_file->write(m_reply->read(readData));
            is_readyReadSignaled = false;

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

        if(m_reply && m_reply->isFinished() && readData == totalData)
            m_readBytes = 0;
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

#ifdef PGADMIN4_USE_WEBKIT
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
    is_readyReadSignaled = false;
    m_readBytes = 0;
}

#ifdef PGADMIN4_USE_WEBENGINE
// Below slot will called when file download is finished (Only for QWebEngine)
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
    is_readyReadSignaled = false;
    m_readBytes = 0;

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

            // Download is started so open the file
            if (!m_file)
            {
                if (!m_downloadFilename.isEmpty())
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
                    m_progressDialog = new QProgressDialog (tr("Downloading file: %1 ").arg(m_defaultFilename), "Cancel", 0, 100, this);
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
            }

            connect( reply, SIGNAL(readyRead()), this, SLOT(replyReady()));
            connect( reply, SIGNAL(downloadProgress(qint64, qint64)), this, SLOT(downloadFileProgress(qint64, qint64)));
            connect( reply, SIGNAL(finished()), this, SLOT(downloadFinished()));
        }
    }
}

// Slot: set the title of tab when the new tab created or existing tab contents changed
void BrowserWindow::tabTitleChanged(const QString &str)
{
    WebViewWindow *nextWebViewPtr = NULL;
    bool flagTabText = false;
    QToolButton *backToolButton = NULL;
    QToolButton *forwardToolButton = NULL;

    if (!str.isEmpty())
    {
        QObject *senderPtr = QObject::sender();
        WebViewWindow *webViewPtr = NULL;
        if (senderPtr != NULL)
        {
            webViewPtr = dynamic_cast<WebViewWindow*>(senderPtr);
            if (webViewPtr != NULL)
            {
                DockTabWidget *dock_tab_widget = dynamic_cast<DockTabWidget*>(webViewPtr->parent()->parent()->parent());
                if (dock_tab_widget != NULL)
                {
                    for (int loopCount = dock_tab_widget->count();loopCount >= 0;loopCount--)
                    {
                        QWidget *tab = dock_tab_widget->widget(loopCount);
                        if (tab != NULL)
                        {
                            QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
                            foreach( QWidget* widgetPtr, widgetList )
                            {
                                if (widgetPtr != NULL)
                                    nextWebViewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);

                                if (nextWebViewPtr != NULL && nextWebViewPtr == webViewPtr)
                                {
                                    // If tab title is for Query tool then we should hide tool buttons.
                                    QWidget *tab = dock_tab_widget->tabBar()->tabButton(loopCount, QTabBar::LeftSide);
                                    if (tab != NULL)
                                    {
                                        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
                                        foreach( QWidget* widgetPtr, widgetList )
                                        {
                                            if (widgetPtr != NULL)
                                            {
                                                QToolButton *toolBtnPtr = dynamic_cast<QToolButton*>(widgetPtr);
                                                if (toolBtnPtr != NULL)
                                                {
                                                    if (!QString::compare(toolBtnPtr->toolTip(), tr("Go back"), Qt::CaseInsensitive))
                                                        backToolButton = toolBtnPtr;
                                                    if (!QString::compare(toolBtnPtr->toolTip(), tr("Go forward"), Qt::CaseInsensitive))
                                                        forwardToolButton = toolBtnPtr;
                                                }
                                            }
                                        }
                                    }

                                    if (backToolButton != NULL && forwardToolButton != NULL)
                                    {
                                        if (!str.startsWith("Query -"))
                                        {
                                            if (str.startsWith("Debugger"))
                                            {
                                                backToolButton->hide();
                                                forwardToolButton->hide();
                                                webViewPtr->setBackForwardButtonHidden(true);
                                            }
                                            // If user open any file in query tool then "Query -" name will not appear
                                            // but it is still query tool so hide the tool button.
                                            else if (!webViewPtr->getBackForwardButtonHidden())
                                            {
                                                backToolButton->show();
                                                forwardToolButton->show();
                                                webViewPtr->setBackForwardButtonHidden(false);
                                            }
                                        }
                                        else
                                        {
                                            backToolButton->hide();
                                            forwardToolButton->hide();
                                            webViewPtr->setBackForwardButtonHidden(true);
                                        }
                                    }

                                    dock_tab_widget->setTabText(loopCount, str);
                                    dock_tab_widget->setTabToolTipText(loopCount, str);
                                    dock_tab_widget->enableDisableToolButton(loopCount);
                                    flagTabText = true;
                                    break;
                                }
                            }
                        }

                        if (flagTabText)
                            break;
                    }

                    if (!flagTabText)
                    {
                        dock_tab_widget->setTabText(dock_tab_widget->currentIndex(), str);
                        dock_tab_widget->setTabToolTipText(dock_tab_widget->currentIndex(), str);
                        dock_tab_widget->enableDisableToolButton(dock_tab_widget->currentIndex());
                    }
                }
            }
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

#ifndef PGADMIN4_USE_WEBENGINE
void BrowserWindow::createNewTabWindowKit(QWebPage * &p)
{
    m_addNewTab = new QWidget(m_tabWidget);

    m_addNewGridLayout = new QGridLayout(m_addNewTab);
    m_addNewGridLayout->setContentsMargins(0, 0, 0, 0);

    m_addNewWebView = new WebViewWindow(m_addNewTab);
    m_addNewWebView->setPage(new WebViewPage());
    m_addNewWebView->setZoomFactor(m_mainWebView->zoomFactor());

    // Register the slot when click on the URL link form main menu bar
    connect(m_addNewWebView, SIGNAL(linkClicked(const QUrl &)),SLOT(urlLinkClicked(const QUrl &)));
    // Register the slot when click on the URL link for QWebPage
    connect(m_addNewWebView->page(), SIGNAL(createTabWindowKit(QWebPage * &)),SLOT(createNewTabWindowKit(QWebPage * &)));

    m_addNewWebView->page()->setForwardUnsupportedContent(true);
    connect(m_addNewWebView->page(), SIGNAL(downloadRequested(const QNetworkRequest &)), this, SLOT(download(const QNetworkRequest &)));
    connect(m_addNewWebView->page(), SIGNAL(unsupportedContent(QNetworkReply*)), this, SLOT(unsupportedContent(QNetworkReply*)));
    m_addNewWebView->page()->setLinkDelegationPolicy(QWebPage::DelegateAllLinks);

    m_addNewWebView->settings()->setAttribute(QWebSettings::JavascriptEnabled, true);
    m_addNewWebView->settings()->setAttribute(QWebSettings::JavascriptCanOpenWindows, true);

    m_widget = new QWidget(m_addNewTab);

    m_toolBtnBack = new QToolButton(m_widget);
    m_toolBtnBack->setFixedHeight(PGA_BTN_SIZE);
    m_toolBtnBack->setFixedWidth(PGA_BTN_SIZE);
    m_toolBtnBack->setIcon(QIcon(":/back.png"));
    m_toolBtnBack->setToolTip(tr("Go back"));
    m_toolBtnBack->hide();

    m_toolBtnForward = new QToolButton(m_widget);
    m_toolBtnForward->setFixedHeight(PGA_BTN_SIZE);
    m_toolBtnForward->setFixedWidth(PGA_BTN_SIZE);
    m_toolBtnForward->setIcon(QIcon(":/forward.png"));
    m_toolBtnForward->setToolTip(tr("Go forward"));
    m_toolBtnForward->hide();

    QToolButton *m_btnClose = new QToolButton(m_widget);
    m_btnClose->setFixedHeight(PGA_BTN_SIZE);
    m_btnClose->setFixedWidth(PGA_BTN_SIZE);
    m_btnClose->setIcon(QIcon(":/close.png"));
    m_btnClose->setToolTip(tr("Close tab"));

    m_horizontalLayout = new QHBoxLayout(m_widget);
    m_horizontalLayout->setContentsMargins(0,1,0,0);
    m_horizontalLayout->setSizeConstraint(QLayout::SetMinAndMaxSize);
    m_horizontalLayout->setSpacing(1);
    m_horizontalLayout->addWidget(m_toolBtnBack);
    m_horizontalLayout->addWidget(m_toolBtnForward);

    // Register the slot on titleChange so set the tab text accordingly
    connect(m_addNewWebView, SIGNAL(titleChanged(const QString &)), SLOT(tabTitleChanged(const QString &)));

    // Register the slot on toolbutton to show the previous history of web
    connect(m_toolBtnBack, SIGNAL(clicked()), m_tabWidget, SLOT(dockGoBackPage()));

    // Register the slot on toolbutton to show the next history of web
    connect(m_toolBtnForward, SIGNAL(clicked()), m_tabWidget, SLOT(dockGoForwardPage()));

    // Register the slot on close button , added manually
    connect(m_btnClose, SIGNAL(clicked()), m_tabWidget, SLOT(dockClosetabs()));

    m_addNewGridLayout->addWidget(m_addNewWebView, 0, 0, 1, 1);
    m_tabWidget->addTab(m_addNewTab, QString());
    m_tabWidget->tabBar()->setVisible(true);
    m_tabWidget->setCurrentIndex((m_tabWidget->count() - 1));

    // Set the back and forward button on tab
    m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::LeftSide, m_widget);
    m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::RightSide, m_btnClose);

    m_addNewWebView->setTabIndex((m_tabWidget->count() - 1));
    m_addNewWebView->page()->setNetworkAccessManager(m_netAccessMan);
    p = m_addNewWebView->page();
}
#endif

#ifdef PGADMIN4_USE_WEBENGINE
// Below slot will be called when link is required to open in new tab.
void BrowserWindow::createNewTabWindow(QWebEnginePage * &p)
{
    m_addNewTab = new QWidget(m_tabWidget);

    m_addNewGridLayout = new QGridLayout(m_addNewTab);
    m_addNewGridLayout->setContentsMargins(0, 0, 0, 0);

    m_addNewWebView = new WebViewWindow();
    m_addNewWebView->setPage(new WebEnginePage());
    m_addNewWebView->setZoomFactor(m_mainWebView->zoomFactor());

    m_widget = new QWidget(m_addNewTab);

    m_toolBtnBack = new QToolButton(m_widget);
    m_toolBtnBack->setFixedHeight(PGA_BTN_SIZE);
    m_toolBtnBack->setFixedWidth(PGA_BTN_SIZE);
    m_toolBtnBack->setIcon(QIcon(":/back.png"));
    m_toolBtnBack->setToolTip(tr("Go back"));
    m_toolBtnBack->hide();

    m_toolBtnForward = new QToolButton(m_widget);
    m_toolBtnForward->setFixedHeight(PGA_BTN_SIZE);
    m_toolBtnForward->setFixedWidth(PGA_BTN_SIZE);
    m_toolBtnForward->setIcon(QIcon(":/forward.png"));
    m_toolBtnForward->setToolTip(tr("Go forward"));
    m_toolBtnForward->hide();

    m_toolBtnClose = new QToolButton(m_widget);
    m_toolBtnClose->setFixedHeight(PGA_BTN_SIZE);
    m_toolBtnClose->setFixedWidth(PGA_BTN_SIZE);
    m_toolBtnClose->setIcon(QIcon(":/close.png"));
    m_toolBtnClose->setToolTip(tr("Close tab"));

    m_horizontalLayout = new QHBoxLayout(m_widget);
    m_horizontalLayout->setContentsMargins(0,1,0,0);
    m_horizontalLayout->setSizeConstraint(QLayout::SetMinAndMaxSize);
    m_horizontalLayout->setSpacing(1);
    m_horizontalLayout->addWidget(m_toolBtnBack);
    m_horizontalLayout->addWidget(m_toolBtnForward);

    // Register the slot on titleChange so set the tab text accordingly
    connect(m_addNewWebView, SIGNAL(titleChanged(const QString &)), SLOT(tabTitleChanged(const QString &)));

    // Register the slot on toolbutton to show the previous history of web
    connect(m_toolBtnBack, SIGNAL(clicked()), m_tabWidget, SLOT(dockGoBackPage()));

    // Register the slot on toolbutton to show the next history of web
    connect(m_toolBtnForward, SIGNAL(clicked()), m_tabWidget, SLOT(dockGoForwardPage()));

    // Register the slot on close button , added manually
    connect(m_toolBtnClose, SIGNAL(clicked()), m_tabWidget, SLOT(dockClosetabs()));

    m_addNewGridLayout->addWidget(m_addNewWebView, 0, 0, 1, 1);
    m_tabWidget->addTab(m_addNewTab, QString());
    m_tabWidget->tabBar()->setVisible(true);
    m_tabWidget->setCurrentIndex((m_tabWidget->count() - 1));

    // Set the back and forward button on tab
    m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::LeftSide, m_widget);
    m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::RightSide, m_toolBtnClose);

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

        m_addNewWebView = new WebViewWindow();
        m_addNewWebView->setZoomFactor(m_mainWebView->zoomFactor());

        // Listen for the download request from the web page
#ifdef PGADMIN4_USE_WEBENGINE
        m_addNewWebView->setPage(new WebEnginePage());
        connect(m_addNewWebView->page()->profile(),SIGNAL(downloadRequested(QWebEngineDownloadItem*)),this,SLOT(downloadRequested(QWebEngineDownloadItem*)));
#else
        m_addNewWebView->setPage(new WebViewPage());
        m_addNewWebView->page()->setForwardUnsupportedContent(true);
        connect(m_addNewWebView->page(), SIGNAL(downloadRequested(const QNetworkRequest &)), this, SLOT(download(const QNetworkRequest &)));
        connect(m_addNewWebView->page(), SIGNAL(unsupportedContent(QNetworkReply*)), this, SLOT(unsupportedContent(QNetworkReply*)));

        // Register the slot when click on the URL link form main menu bar
        connect(m_addNewWebView, SIGNAL(linkClicked(const QUrl &)),SLOT(urlLinkClicked(const QUrl &)));
        // Register the slot when click on the URL link for QWebPage
        connect(m_addNewWebView->page(), SIGNAL(createTabWindowKit(QWebPage * &)),SLOT(createNewTabWindowKit(QWebPage * &)));

        m_addNewWebView->page()->setLinkDelegationPolicy(QWebPage::DelegateAllLinks);
#endif

        m_widget = new QWidget(m_addNewTab);

        m_toolBtnBack = new QToolButton(m_widget);
        m_toolBtnBack->setFixedHeight(PGA_BTN_SIZE);
        m_toolBtnBack->setFixedWidth(PGA_BTN_SIZE);
        m_toolBtnBack->setIcon(QIcon(":/back.png"));
        m_toolBtnBack->setToolTip(tr("Go back"));
        m_toolBtnBack->hide();

        m_toolBtnForward = new QToolButton(m_widget);
        m_toolBtnForward->setFixedHeight(PGA_BTN_SIZE);
        m_toolBtnForward->setFixedWidth(PGA_BTN_SIZE);
        m_toolBtnForward->setIcon(QIcon(":/forward.png"));
        m_toolBtnForward->setToolTip(tr("Go forward"));
        m_toolBtnForward->hide();

        m_toolBtnClose = new QToolButton(m_widget);
        m_toolBtnClose->setFixedHeight(PGA_BTN_SIZE);
        m_toolBtnClose->setFixedWidth(PGA_BTN_SIZE);
        m_toolBtnClose->setIcon(QIcon(":/close.png"));
        m_toolBtnClose->setToolTip(tr("Close tab"));

        m_horizontalLayout = new QHBoxLayout(m_widget);
        m_horizontalLayout->setContentsMargins(0,1,0,0);
        m_horizontalLayout->setSizeConstraint(QLayout::SetMinAndMaxSize);
        m_horizontalLayout->setSpacing(1);
        m_horizontalLayout->addWidget(m_toolBtnBack);
        m_horizontalLayout->addWidget(m_toolBtnForward);

        // Register the slot on titleChange so set the tab text accordingly
        connect(m_addNewWebView, SIGNAL(titleChanged(const QString &)), SLOT(tabTitleChanged(const QString &)));

        // Register the slot on toolbutton to show the previous history of web
        connect(m_toolBtnBack, SIGNAL(clicked()), m_tabWidget, SLOT(dockGoBackPage()));

        // Register the slot on toolbutton to show the next history of web
        connect(m_toolBtnForward, SIGNAL(clicked()), m_tabWidget, SLOT(dockGoForwardPage()));

        // Register the slot on close button , added manually
        connect(m_toolBtnClose, SIGNAL(clicked()), m_tabWidget, SLOT(dockClosetabs()));

        m_addNewGridLayout->addWidget(m_addNewWebView, 0, 0, 1, 1);
        m_tabWidget->addTab(m_addNewTab, QString());
        m_tabWidget->tabBar()->setVisible(true);
        m_tabWidget->setCurrentIndex((m_tabWidget->count() - 1));

        // Set the back and forward button on tab
        m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::LeftSide, m_widget);
        m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::RightSide, m_toolBtnClose);

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


// Set Zoom Level
void BrowserWindow::setZoomLevel(int zoomFlag)
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
                        if (zoomFlag == 1) {
                             webviewPtr->setZoomFactor(m_mainWebView->zoomFactor() + 0.1);
                        }
                        else if (zoomFlag == -1) {
                            webviewPtr->setZoomFactor(m_mainWebView->zoomFactor() - 0.1);
                        }
                        else if(zoomFlag == 0) {
                            webviewPtr->setZoomFactor(1.0);
                        }
                    }
                }
            }
        }
    }

    // Set the zoom value for the next time
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

