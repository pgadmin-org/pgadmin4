/********************************************************************************
** Form generated from reading UI file 'LogWindow.ui'
**
** Created by: Qt User Interface Compiler version 5.10.1
**
** WARNING! All changes made in this file will be lost when recompiling UI file!
********************************************************************************/

#ifndef UI_LOGWINDOW_H
#define UI_LOGWINDOW_H

#include <QtCore/QVariant>
#include <QtWidgets/QAction>
#include <QtWidgets/QApplication>
#include <QtWidgets/QButtonGroup>
#include <QtWidgets/QDialog>
#include <QtWidgets/QHBoxLayout>
#include <QtWidgets/QHeaderView>
#include <QtWidgets/QLabel>
#include <QtWidgets/QPlainTextEdit>
#include <QtWidgets/QPushButton>
#include <QtWidgets/QVBoxLayout>

QT_BEGIN_NAMESPACE

class Ui_LogWindow
{
public:
    QVBoxLayout *verticalLayout;
    QPlainTextEdit *textLog;
    QHBoxLayout *horizontalLayout;
    QPushButton *btnReload;
    QLabel *lblStatus;
    QPushButton *btnClose;

    void setupUi(QDialog *LogWindow)
    {
        if (LogWindow->objectName().isEmpty())
            LogWindow->setObjectName(QStringLiteral("LogWindow"));
        LogWindow->resize(800, 500);
        verticalLayout = new QVBoxLayout(LogWindow);
        verticalLayout->setObjectName(QStringLiteral("verticalLayout"));
        textLog = new QPlainTextEdit(LogWindow);
        textLog->setObjectName(QStringLiteral("textLog"));
        QFont font;
        font.setFamily(QStringLiteral("Courier"));
        textLog->setFont(font);
        textLog->setReadOnly(true);
        textLog->setPlainText(QStringLiteral(""));
        textLog->setCenterOnScroll(false);

        verticalLayout->addWidget(textLog);

        horizontalLayout = new QHBoxLayout();
        horizontalLayout->setObjectName(QStringLiteral("horizontalLayout"));
        btnReload = new QPushButton(LogWindow);
        btnReload->setObjectName(QStringLiteral("btnReload"));

        horizontalLayout->addWidget(btnReload);

        lblStatus = new QLabel(LogWindow);
        lblStatus->setObjectName(QStringLiteral("lblStatus"));
        QSizePolicy sizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
        sizePolicy.setHorizontalStretch(0);
        sizePolicy.setVerticalStretch(0);
        sizePolicy.setHeightForWidth(lblStatus->sizePolicy().hasHeightForWidth());
        lblStatus->setSizePolicy(sizePolicy);

        horizontalLayout->addWidget(lblStatus);

        btnClose = new QPushButton(LogWindow);
        btnClose->setObjectName(QStringLiteral("btnClose"));

        horizontalLayout->addWidget(btnClose);


        verticalLayout->addLayout(horizontalLayout);


        retranslateUi(LogWindow);
        QObject::connect(btnReload, SIGNAL(clicked()), LogWindow, SLOT(reload()));
        QObject::connect(btnClose, SIGNAL(clicked()), LogWindow, SLOT(close()));

        QMetaObject::connectSlotsByName(LogWindow);
    } // setupUi

    void retranslateUi(QDialog *LogWindow)
    {
        LogWindow->setWindowTitle(QApplication::translate("LogWindow", "Dialog", nullptr));
        btnReload->setText(QApplication::translate("LogWindow", "Reload", nullptr));
        lblStatus->setText(QString());
        btnClose->setText(QApplication::translate("LogWindow", "Close", nullptr));
    } // retranslateUi

};

namespace Ui {
    class LogWindow: public Ui_LogWindow {};
} // namespace Ui

QT_END_NAMESPACE

#endif // UI_LOGWINDOW_H
