//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
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

DockTabWidget *DockTabWidget::mainTabWidget = NULL;

DockTabWidget::DockTabWidget(QWidget *parent) :
    QTabWidget(parent)
{
    floatingWidget = NULL;
    floatingEnabled = false;

    setParent(parent);
    setTabsClosable(false);
    setElideMode(Qt::ElideRight);

    // set custom tab bar in tab widget to receive events for docking.
    setTabBar(new DockTabBar(this));
    setDocumentMode(true);
    setAcceptDrops(true);

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
                "height: 1.5em; "
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

    if (mainTabWidget == NULL)
        mainTabWidget = this;
}

DockTabWidget::DockTabWidget(DockTabWidget *other, QWidget *parent) :
        QTabWidget(parent)
{
    setFloatingBaseWidget(other->floatingBaseWidget());
    setFloatingEnabled(other->isFloatingEnabled());
    resize(other->size());

    // set custom tab bar in tab widget to receive events for docking.
    setTabBar(new DockTabBar(this));
    setDocumentMode(true);
    setAcceptDrops(true);

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
                "height: 1.5em; "
#else
                "font: 11pt; "
                "width: 19em; "
                "height: 1.5em; "
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
}

void DockTabWidget::setFloatingBaseWidget(QWidget *widget)
{
    floatingWidget = widget;
    if (floatingEnabled && parentWidget() == 0)
        setParent(widget);
}

void DockTabWidget::setFloatingEnabled(bool x)
{
    floatingEnabled = x;

    if (parent() == 0)
    {
        if (x)
            setWindowFlags(Qt::Tool);
        else
            setWindowFlags(Qt::Window);
    }
}

// Slot: go back to page and enable/disable toolbutton
void DockTabWidget::dockGoBackPage()
{
    WebViewWindow *webviewPtr = NULL;

    QWidget *tab = this->widget(this->currentIndex());
    if (tab != NULL)
    {
        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
            {
                webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);
                if (webviewPtr != NULL)
                    webviewPtr->back();
            }
        }
    }
}

// Slot: go forward to page and enable/disable toolbutton
void DockTabWidget::dockGoForwardPage()
{
    WebViewWindow *webviewPtr = NULL;

    QWidget *tab = this->widget(this->currentIndex());
    if (tab != NULL)
    {
        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
            {
                webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);
                if (webviewPtr != NULL)
                    webviewPtr->forward();
            }
        }
    }
}

// Close the tab and remove the memory of the given index tab
void DockTabWidget::dockClosetabs()
{
    int totalTabs = 0;
    QToolButton *btn = NULL;
    QWidget *tab = NULL;
    DockTabWidget *l_tab_widget = NULL;

    QObject *senderPtr = QObject::sender();
    if (senderPtr != NULL)
    {
        btn = dynamic_cast<QToolButton*>(senderPtr);
        if (btn != NULL)
        {
            l_tab_widget = dynamic_cast<DockTabWidget*>(btn->parent()->parent());
            int current_tab_index = 0;

            if (l_tab_widget != NULL)
            {
                totalTabs = l_tab_widget->count();
                for (int loopCount = l_tab_widget->count();loopCount >= 0;loopCount--)
                {
                    QWidget *l_tab = l_tab_widget->tabBar()->tabButton(loopCount, QTabBar::RightSide);
                    if (l_tab != NULL)
                    {
                        QToolButton *nextBtnPtr = dynamic_cast<QToolButton*>(l_tab);
                        if (nextBtnPtr != NULL && btn != NULL && nextBtnPtr == btn)
                            current_tab_index = loopCount;
                    }
                }

                QList<QWidget*> widgetList = l_tab_widget->tabBar()->findChildren<QWidget*>();
                foreach(QWidget* widgetPtr, widgetList)
                {
                    if (widgetPtr != NULL)
                    {
                        QToolButton *toolBtnPtr = dynamic_cast<QToolButton*>(widgetPtr);
                        if (toolBtnPtr != NULL && toolBtnPtr == btn)
                        {
                            tab = l_tab_widget->widget(current_tab_index);
                            break;
                        }
                    }
                }
            }

            if (tab != NULL)
                tab->deleteLater();

            // If user close the last tab then close the parent tab widget also.
            if (totalTabs == 1 && l_tab_widget != NULL)
                l_tab_widget->deleteLater();
        }
    }

    if (tab != NULL)
    {
        WebViewWindow *webviewPtr = NULL;

        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
        foreach (QWidget* widgetPtr, widgetList)
        {
            if (widgetPtr != NULL)
            {
                webviewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);
                if (webviewPtr != NULL)
                {
                    /* Trigger the action for tab window close so unload event will be called and
                     * resources will be freed properly.
                     * Trigger 'RequestClose' action from Qt5 onwards. Here we have triggerred the action
                     * 'ToggleVideoFullscreen + 1' because we do not know from which webkit
                     * version 'RequestClose' action was added so increment with previous enum value so that
                     * it will be backward webkit version compatible.
                     */
                    #if QT_VERSION >= 0x050000
                      #ifndef PGADMIN4_USE_WEBENGINE
                        webviewPtr->page()->triggerAction(static_cast<QWebPage::WebAction>(QWebPage::ToggleVideoFullscreen + 1));
                      #endif
                    #endif
                }
            }
        }
    }

    // Check if main pgAdmin4 application has only one tab then close tab bar.
    // Here - check for count 2 because tab will be deleted later.
    DockTabWidget *mainTab = DockTabWidget::getMainTabWidget();
    if (mainTab != NULL && l_tab_widget != NULL && l_tab_widget == mainTab && mainTab->count() == 2)
        mainTab->tabBar()->setVisible(false);
}

// This function is used to set back/forward/close buttons on new tabbar.
void DockTabWidget::setButtonsNewTabbar(int index)
{
    QWidget *m_widget = new QWidget();

    QToolButton *m_toolBtnBack = new QToolButton(m_widget);
    m_toolBtnBack->setFixedHeight(PGA_BTN_SIZE);
    m_toolBtnBack->setFixedWidth(PGA_BTN_SIZE);
    m_toolBtnBack->setIcon(QIcon(":/back.png"));
    m_toolBtnBack->setToolTip(tr("Go back"));

    QToolButton *m_toolBtnForward = new QToolButton(m_widget);
    m_toolBtnForward->setFixedHeight(PGA_BTN_SIZE);
    m_toolBtnForward->setFixedWidth(PGA_BTN_SIZE);
    m_toolBtnForward->setIcon(QIcon(":/forward.png"));
    m_toolBtnForward->setToolTip(tr("Go forward"));

    QToolButton *m_btnClose = new QToolButton(m_widget);
    m_btnClose->setFixedHeight(PGA_BTN_SIZE);
    m_btnClose->setFixedWidth(PGA_BTN_SIZE);
    m_btnClose->setIcon(QIcon(":/close.png"));
    m_btnClose->setToolTip(tr("Close tab"));

    QHBoxLayout *m_horizontalLayout = new QHBoxLayout(m_widget);
    m_horizontalLayout->setContentsMargins(0,1,0,0);
    m_horizontalLayout->setSizeConstraint(QLayout::SetMinAndMaxSize);
    m_horizontalLayout->setSpacing(1);
    m_horizontalLayout->addWidget(m_toolBtnBack);
    m_horizontalLayout->addWidget(m_toolBtnForward);

    // Register the slot on toolbutton to show the previous history of web
    connect(m_toolBtnBack, SIGNAL(clicked()), this, SLOT(dockGoBackPage()));

    // Register the slot on toolbutton to show the next history of web
    connect(m_toolBtnForward, SIGNAL(clicked()), this, SLOT(dockGoForwardPage()));

    // Register the slot on close button , added manually
    connect(m_btnClose, SIGNAL(clicked()), SLOT(dockClosetabs()));

    // Register the slot on tab index change
    connect(this, SIGNAL(currentChanged(int )), this,SLOT(tabIndexChanged(int )));

    // Set the back and forward button on tab
    this->tabBar()->setTabButton(index, QTabBar::LeftSide, m_widget);
    this->tabBar()->setTabButton(index, QTabBar::RightSide, m_btnClose);

    // find the webview and hide/show button depending on flag set with web view.
    QWidget *tab = this->widget(index);
    if (tab != NULL)
    {
        QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
        foreach( QWidget* widgetPtr, widgetList )
        {
            if (widgetPtr != NULL)
            {
                WebViewWindow *webViewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);
                if (webViewPtr != NULL)
                {
                    // If user open any file in query tool then "Query -" name will not appear
                    // but it is still query tool so hide the tool button.
                    if (!webViewPtr->getBackForwardButtonHidden())
                    {
                        m_toolBtnBack->show();
                        m_toolBtnForward->show();
                    }
                    else
                    {
                        m_toolBtnBack->hide();
                        m_toolBtnForward->hide();
                    }
                    break;
                }
            }
        }
    }
}

// This function is used to move to old tab widget to new tab widget.
void DockTabWidget::moveTab(DockTabWidget *source, int sourceIndex, DockTabWidget *dest, int destIndex)
{
    if (source == dest && sourceIndex < destIndex)
        destIndex--;

    QWidget *widget = source->widget(sourceIndex);
    QString text = source->tabText(sourceIndex);

    source->removeTab(sourceIndex);

    dest->insertTab(destIndex, widget, text);
    dest->setCurrentIndex(destIndex);
}

// This function is used to decode actual drop event on tab widget.
void DockTabWidget::decodeTabDropEvent(QDropEvent *event, DockTabWidget **p_tabWidget, int *p_index)
{
    DockTabBar *tabBar = qobject_cast<DockTabBar *>(event->source());
    if (!tabBar)
    {
        *p_tabWidget = NULL;
        *p_index = 0;
        return;
    }

    QByteArray data = event->mimeData()->data(MIMETYPE_TABINDEX);
    QDataStream stream(&data, QIODevice::ReadOnly);

    int index;
    stream >> index;

    *p_tabWidget = tabBar->tabWidget();
    *p_index = index;
}

// This function is used to check event is actually drop event or not.
bool DockTabWidget::eventIsTabDrag(QDragEnterEvent *event)
{
    return event->mimeData()->hasFormat(MIMETYPE_TABINDEX) && qobject_cast<DockTabBar *>(event->source());
}

// This function is used to delete tab widget when there is no tab inside.
void DockTabWidget::deleteIfEmpty()
{
    if (count() == 0)
    {
        emit willBeAutomaticallyDeleted(this);
        deleteLater();
    }
}

// This is function is used to create another tab widget from parent window.
DockTabWidget *DockTabWidget::createAnotherTabWidget(QWidget *parent)
{
    DockTabWidget *tab_widget = new DockTabWidget(this, parent);
    tab_widget->tabBar()->setVisible(true);
    return tab_widget;
}

// Check wether tab is insertable or not.
bool DockTabWidget::isInsertable(QWidget *widget)
{
    Q_UNUSED(widget)
    return true;
}

// Hide the close button of given index displayed on right side of tab
void DockTabWidget::enableDisableToolButton(const int &index)
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

// Slot: When the tab index change, hide/show the toolbutton displayed on tab
void DockTabWidget::tabIndexChanged(int index)
{
    int tabCount = 0;
    WebViewWindow *webViewPtr = NULL;

    for (tabCount = 0; tabCount < this->count(); tabCount++)
    {
        // if main pgAdmin4 application tab then do nothing.
        if (!QString::compare(this->tabText(tabCount), tr("pgAdmin 4"), Qt::CaseInsensitive))
            continue;

        QWidget *tab = this->widget(tabCount);
        if (tab != NULL)
        {
            QList<QWidget*> widgetList = tab->findChildren<QWidget*>();
            foreach( QWidget* widgetPtr, widgetList )
            {
                if (widgetPtr != NULL)
                {
                    webViewPtr = dynamic_cast<WebViewWindow*>(widgetPtr);
                    if (webViewPtr != NULL)
                        break;
                }
            }
        }

        if (tabCount != index)
            this->showHideToolButton(tabCount, 0);
        else
        {
            if (!webViewPtr->getBackForwardButtonHidden())
                this->showHideToolButton(tabCount, 1);
            else
                this->showHideToolButton(tabCount, 0);
        }
    }

    // paint the tab text again as index of the tab widget changed.
    this->tabBar()->update();
}

// Show and Hide the toolbutton once the tab is deselected depending on the option
// option 0: Hide the toolButton
// option 1: Show the toolButton
void DockTabWidget::showHideToolButton(const int &index, const int &option)
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
void DockTabWidget::setTabToolTipText(const int &index, const QString &toolTipString)
{
    tabBar()->setTabToolTip(index, toolTipString);
}

// Implementation of custom tab bar for docking window.
DockTabBar::DockTabBar(DockTabWidget *tabWidget, QWidget *parent) :
    QTabBar(parent),
    tab_widget(tabWidget)
{
    isStartingDrag = false;
    setAcceptDrops(true);
}

// Insert new tab at specified index.
int DockTabBar::insertionIndexAt(const QPoint &pos)
{
    int index = count();
    for (int i = 0; i < count(); ++i)
    {
        QRect rect = tabRect(i);
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
    return index;
}

// Mouse press event handler for tab drag.
void DockTabBar::mousePressEvent(QMouseEvent *event)
{
    if (event->button() == Qt::LeftButton)
    {
        dragStartPos = event->pos();
        isStartingDrag = true;
    }
    QTabBar::mousePressEvent(event);
}

// Mouse move event handler for tab drag.
void DockTabBar::mouseMoveEvent(QMouseEvent *event)
{
    if (!isStartingDrag)
        return;

    if ((!event->buttons()) && Qt::LeftButton)
        return;

    if ((event->pos() - dragStartPos).manhattanLength() < QApplication::startDragDistance())
        return;

    int index = tabAt(event->pos());

    if (index < 0)
        return;

    // Don't allow to drag the pgAdmin4 main tab.
    if (!QString::compare(tab_widget->tabText(index), tr("pgAdmin 4"), Qt::CaseInsensitive))
    {
        return;
    }

    // create data
    QMimeData *mimeData = new QMimeData;

    QByteArray data;
    QDataStream stream(&data, QIODevice::WriteOnly);
    stream << index;

    mimeData->setData(MIMETYPE_TABINDEX, data);

    // create pixmap
    QRect rect = tabRect(index);
    QPixmap pixmap(rect.size());

    render(&pixmap, QPoint(), QRegion(rect));

    // exec drag
    QDrag *drag = new QDrag(this);
    drag->setMimeData(mimeData);
    drag->setPixmap(pixmap);
    QPoint offset = dragStartPos - rect.topLeft();
    drag->setHotSpot(offset);
    Qt::DropAction dropAction = drag->exec(Qt::MoveAction | Qt::IgnoreAction);

    if (dropAction != Qt::MoveAction)
    {
        DockTabWidget *newTabWidget = tab_widget->createAnotherTabWidget();
        if (!newTabWidget->isInsertable(tab_widget, index))
        {
            newTabWidget->deleteLater();
            return;
        }

        DockTabWidget::moveTab(tab_widget, index, newTabWidget, 0);

        newTabWidget->setButtonsNewTabbar(0);
        newTabWidget->enableDisableToolButton(0);

        QRect newGeometry = newTabWidget->geometry();
        newGeometry.moveTopLeft(QCursor::pos() - offset);
        newTabWidget->setGeometry(newGeometry);
        newTabWidget->show();

        // Check if main pgAdmin4 application has only one tab then close tab bar.
        // Here - check for count 2 because tab will be deleted later.
        DockTabWidget *mainTab = DockTabWidget::getMainTabWidget();
        if (mainTab != NULL && tab_widget != NULL && tab_widget == mainTab && mainTab->count() == 1)
            mainTab->tabBar()->setVisible(false);
    }

    tab_widget->deleteIfEmpty();
    isStartingDrag = false;
}

// Actual tab drag started.
void DockTabBar::dragEnterEvent(QDragEnterEvent *event)
{
    if (DockTabWidget::eventIsTabDrag(event))
        event->acceptProposedAction();
}

// Drag event leave the actual area.
void DockTabBar::dragLeaveEvent(QDragLeaveEvent * event)
{
    Q_UNUSED(event)
}

// Drop event handler for tabbar.
void DockTabBar::dropEvent(QDropEvent *event)
{
    DockTabWidget *oldTabWidget = NULL;
    int oldIndex;
    DockTabWidget::decodeTabDropEvent(event, &oldTabWidget, &oldIndex);

    if (oldTabWidget && tab_widget && tab_widget->isInsertable(oldTabWidget, oldIndex))
    {

        int newIndex = insertionIndexAt(event->pos());
        DockTabWidget::moveTab(oldTabWidget, oldIndex, tab_widget, newIndex);

        // create new back/forward/close buttons and register its events.
        tab_widget->setButtonsNewTabbar(newIndex);
        tab_widget->enableDisableToolButton(newIndex);

        // Check if main pgAdmin4 application has only one tab then close tab bar.
        // Here - check for count 2 because tab will be deleted later.
        DockTabWidget *mainTab = DockTabWidget::getMainTabWidget();
        if (mainTab != NULL && oldTabWidget != NULL && oldTabWidget == mainTab && mainTab->count() == 1)
            mainTab->tabBar()->setVisible(false);

        event->acceptProposedAction();
    }
}
