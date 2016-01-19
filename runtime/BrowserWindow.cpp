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
#include <QtWebKitWidgets>
#else
#include <QtWebKit>
#include <QAction>
#include <QMenu>
#include <QMenuBar>
#include <QMessageBox>
#include <QInputDialog>
#include <QLineEdit>
#endif

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

    m_appServerUrl = url;

    // Setup the UI
    createActions();
    createMenus();

    m_tabWidget = new TabWindow(this);
    m_mainGridLayout = new QGridLayout(m_tabWidget);
    m_mainGridLayout->setContentsMargins(0, 0, 0, 0);
    m_pgAdminMainTab = new QWidget(m_tabWidget);
    m_tabGridLayout = new QGridLayout(m_pgAdminMainTab);
    m_tabGridLayout->setContentsMargins(0, 0, 0, 0);
    m_mainWebView = new WebViewWindow(m_pgAdminMainTab);

    m_tabGridLayout->addWidget(m_mainWebView, 0, 0, 1, 1);
    m_tabWidget->addTab(m_pgAdminMainTab, QString());
    m_tabWidget->setCurrentIndex(0);
    m_tabWidget->setTabText(0, PGA_APP_NAME);
    m_tabWidget->setTabToolTipText(0, PGA_APP_NAME) ;

#ifndef __APPLE__
    m_tabWidget->setStyleSheet("QTabBar::tab{max-height:24px;max-width:250px;}");
#endif

    setCentralWidget(m_tabWidget);

    connect(m_mainWebView, SIGNAL(loadFinished(bool)), SLOT(finishLoading(bool)));

    // Register the slot when click on the URL link form main menu bar
    connect(m_mainWebView, SIGNAL(linkClicked(const QUrl &)),SLOT(urlLinkClicked(const QUrl &)));

    // Register the slot on tab index change
    connect(m_tabWidget,SIGNAL(currentChanged(int )),this,SLOT(tabIndexChanged(int )));

    m_mainWebView->page()->setLinkDelegationPolicy(QWebPage::DelegateAllLinks);

    // Restore the geometry
    QSettings settings;
    restoreGeometry(settings.value("Browser/Geometry").toByteArray());
    restoreState(settings.value("Browser/WindowState").toByteArray());

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
    openUrlAction = new QAction(tr("&Open URL..."), this);
    openUrlAction->setShortcut(tr("Ctrl+U"));
    openUrlAction->setStatusTip(tr("Open a URL"));
    connect(openUrlAction, SIGNAL(triggered()), this, SLOT(openUrl()));

    // Set the Python Path
    configurationAction = new QAction(tr("&Configuration..."), this);
    configurationAction->setStatusTip(tr("Configure the application paths"));
    connect(configurationAction, SIGNAL(triggered()), this, SLOT(configuration()));

    // Exit the app
    exitAction = new QAction(tr("E&xit"), this);
    exitAction->setStatusTip(tr("Exit the application"));
    exitAction->setShortcuts(QKeySequence::Quit);
    connect(exitAction, SIGNAL(triggered()), this, SLOT(close()));

    // About box
    aboutAction = new QAction(tr("&About"), this);
    aboutAction->setStatusTip(tr("Show the application's About box"));
    connect(aboutAction, SIGNAL(triggered()), this, SLOT(about()));
}


// Create the application menus
void BrowserWindow::createMenus()
{
    // File
    fileMenu = menuBar()->addMenu(tr("&File"));
    fileMenu->addAction(openUrlAction);
    fileMenu->addSeparator();
    fileMenu->addAction(configurationAction);
    fileMenu->addSeparator();
    fileMenu->addAction(exitAction);

    menuBar()->addSeparator();

    // Help
    helpMenu = menuBar()->addMenu(tr("&Help"));
    helpMenu->addAction(aboutAction);
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

    for (tabCount = 1;tabCount < m_tabWidget->count();tabCount++)
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

	            if (webviewPtr != NULL && !QString::compare(webviewPtr->getFirstLoadURL(),name.url(), Qt::CaseInsensitive))
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

// Slot: When the tab index change, hide/show the toolbutton displayed on tab
void BrowserWindow::tabIndexChanged(int index)
{
    int tabCount = 1;
    for (tabCount = 1;tabCount < m_tabWidget->count();tabCount++)
    {
        if (tabCount != index)
	    m_tabWidget->showHideToolButton(tabCount,0);
        else
	    m_tabWidget->showHideToolButton(tabCount,1);
    }
}

// Close the tab and remove the memory of the given index tab
void BrowserWindow::closetabs()
{
    int loopCount = 0;
    int index = 0;
    QPushButton *btn = NULL;
    int totalTabs = m_tabWidget->count();

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
        for (loopCount = 1;loopCount < totalTabs;loopCount++)
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

// Slot: Link is open from pgAdmin mainwindow
void BrowserWindow::urlLinkClicked(const QUrl &name)
{
    // First check is there any tab opened with same URL then open it again.
    int tabFound = findURLTab(name);

    if (!tabFound)
    {
        m_addNewTab = new QWidget(m_tabWidget);
        m_addNewGridLayout = new QGridLayout(m_addNewTab);
        m_addNewGridLayout->setContentsMargins(0, 0, 0, 0);
        m_addNewWebView = new WebViewWindow(m_addNewTab);

        m_widget = new QWidget(m_addNewTab);
        m_toolBtnBack = new QToolButton(m_widget);
        m_toolBtnBack->setFixedHeight(16);
        m_toolBtnBack->setFixedWidth(16);
        m_toolBtnBack->setText(PGA_BTN_BACK);
        m_toolBtnBack->setDisabled(true);

        m_toolBtnForward = new QToolButton(m_widget);
        m_toolBtnForward->setFixedHeight(16);
        m_toolBtnForward->setFixedWidth(16);
        m_toolBtnForward->setText(PGA_BTN_FORWARD);
        m_toolBtnForward->setDisabled(true);

        QPushButton *m_btnClose = new QPushButton(m_widget);
        m_btnClose->setText(PGA_BTN_CLOSE);
        m_btnClose->setFixedHeight(16);
        m_btnClose->setFixedWidth(16);

        m_horizontalLayout = new QHBoxLayout(m_widget);
        m_horizontalLayout->setSizeConstraint(QLayout::SetMinAndMaxSize);
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
        m_tabWidget->setCurrentIndex((m_tabWidget->count() - 1));

        // Set the back and forward button on tab
        m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::LeftSide, m_widget);
        m_tabWidget->tabBar()->setTabButton((m_tabWidget->count() - 1), QTabBar::RightSide, m_btnClose);

        m_addNewWebView->setFirstLoadURL(name.url());
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

// Open an arbitrary URL
void BrowserWindow::configuration()
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


