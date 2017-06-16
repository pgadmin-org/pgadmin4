//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// TabWindow.h - Declaration of the custom tab widget
//
//////////////////////////////////////////////////////////////////////////

#ifndef TABWINDOW_H
#define TABWINDOW_H

#include "pgAdmin4.h"
#include "WebViewWindow.h"

// Define button sizes
#ifdef _WIN32
const int PGA_BTN_SIZE = 18;
#else
const int PGA_BTN_SIZE = 16;
#endif

#include <QTabBar>
#include <QTabWidget>

#define MIMETYPE_TABINDEX "x-paintfield-tabindex"

class DockTabBar;

class DockTabWidget : public QTabWidget
{
    Q_OBJECT
    friend class DockTabBar;
public:

    explicit DockTabWidget(QWidget *parent = 0);

    DockTabWidget(DockTabWidget *other, QWidget *parent = 0);

    // Drop event handlers of parent tab widget.
    static void moveTab(DockTabWidget *source, int sourceIndex, DockTabWidget *dest, int destIndex);
    static void decodeTabDropEvent(QDropEvent *event, DockTabWidget **p_tabWidget, int *p_index);
    static bool eventIsTabDrag(QDragEnterEvent *event);
    void setButtonsNewTabbar(int index);

    static DockTabWidget *mainTabWidget;
    static DockTabWidget* getMainTabWidget()
    {
        return mainTabWidget;
    }

    void setFloatingBaseWidget(QWidget *widget);
    QWidget *floatingBaseWidget()
    {
        return floatingWidget;
    }

    void setFloatingEnabled(bool x);
    bool isFloatingEnabled() const
    {
        return floatingEnabled;
    }

    virtual bool isInsertable(QWidget *widget);
    bool isInsertable(DockTabWidget *other, int index)
    {
        return isInsertable(other->widget(index));
    }
    virtual DockTabWidget *createAnotherTabWidget(QWidget *parent = 0);

    int getButtonIndex(QPushButton *btn);
    void showHideToolButton(const int &index,const int &option);
    void enableDisableToolButton(const int &index);
    void setTabToolTipText(const int &index, const QString &toolTipString);
    QTabBar *tabBar() const
    {
        return QTabWidget::tabBar();
    }

signals:
    void willBeAutomaticallyDeleted(DockTabWidget *widget);

public slots:
    void deleteIfEmpty();
    void dockClosetabs();
    void dockGoBackPage();
    void dockGoForwardPage();
    void tabIndexChanged(int index);

private:
    QWidget *floatingWidget;
    bool floatingEnabled;
};

class DockTabBar : public QTabBar
{
    Q_OBJECT
public:
    DockTabBar(DockTabWidget *tabWidget, QWidget *parent = 0);
    // return tab widget of respective tab bar widget.
    DockTabWidget *tabWidget()
    {
        return tab_widget;
    }

protected:
    // re-implemnted mouse event to detect tab drag started or not.
    void mousePressEvent(QMouseEvent *event);
    void mouseMoveEvent(QMouseEvent *event);

    // re-implemnted drag-drop event for docking of tabs.
    void dragEnterEvent(QDragEnterEvent *event);
    void dropEvent(QDropEvent *event);
    void dragLeaveEvent(QDragLeaveEvent * event);

    // re-implemented paint event to draw the text on tab bar of tab widget control.
    void paintEvent(QPaintEvent *event)
    {
        Q_UNUSED(event);
        bool isToolBtnVisible = false;

        DockTabWidget *l_tab_widget = dynamic_cast<DockTabWidget*>(this->parent());

        if (l_tab_widget != NULL)
        {
            int current_index = l_tab_widget->currentIndex();
            QStylePainter painter(this);
            for(int i = 0; i < l_tab_widget->count(); ++i)
            {
                QString str = l_tab_widget->tabText(i);
                if (!str.startsWith("pgAdmin 4") && !str.startsWith("Query -") && !str.startsWith("Debugger"))
                    isToolBtnVisible = true;

                QStyleOptionTab option;
                initStyleOption(&option, i);
                QString tempText = this->tabText(i);
                if (tempText.length() > 28)
                {
                    tempText = tempText.mid(0,27);
                    tempText += QString("...");
                }

                QRect rect(option.rect);

                // If toolButton is visible then only draw text after tool button pixel area.
                // If tool button is not visible - draw the text after margin of 10px.
                if (isToolBtnVisible)
                {
                    if ((current_index != -1) && i == current_index)
                    {
                        if (str.startsWith("Query -") || str.startsWith("Debugger"))
                            rect.setX(option.rect.x() + 10);
                        else
                            rect.setX(option.rect.x() + 45);
                    }
                    else
                        rect.setX(option.rect.x() + 10);
                }
                else
                    rect.setX(option.rect.x() + 10);

                rect.setY(option.rect.y() + 7);

                option.text = QString();

                painter.drawControl(QStyle::CE_TabBarTab, option);
                painter.drawItemText(rect, 0, palette(), 1, tempText);
            }
        }
    }

#ifdef __APPLE__
    QSize tabSizeHint(int) const
    {
        return QSize(250, 26);
    }
#endif

private:
    int insertionIndexAt(const QPoint &pos);
    DockTabWidget *tab_widget;
    bool isStartingDrag;
    QPoint dragStartPos;
};

#endif // TABWINDOW_H
