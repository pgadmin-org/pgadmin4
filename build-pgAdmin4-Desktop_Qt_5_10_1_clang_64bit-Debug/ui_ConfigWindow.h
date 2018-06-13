/********************************************************************************
** Form generated from reading UI file 'ConfigWindow.ui'
**
** Created by: Qt User Interface Compiler version 5.10.1
**
** WARNING! All changes made in this file will be lost when recompiling UI file!
********************************************************************************/

#ifndef UI_CONFIGWINDOW_H
#define UI_CONFIGWINDOW_H

#include <QtCore/QVariant>
#include <QtWidgets/QAction>
#include <QtWidgets/QApplication>
#include <QtWidgets/QButtonGroup>
#include <QtWidgets/QDialog>
#include <QtWidgets/QDialogButtonBox>
#include <QtWidgets/QGridLayout>
#include <QtWidgets/QHBoxLayout>
#include <QtWidgets/QHeaderView>
#include <QtWidgets/QLabel>
#include <QtWidgets/QLineEdit>
#include <QtWidgets/QSpacerItem>
#include <QtWidgets/QTabWidget>
#include <QtWidgets/QVBoxLayout>
#include <QtWidgets/QWidget>

QT_BEGIN_NAMESPACE

class Ui_ConfigWindow
{
public:
    QVBoxLayout *verticalLayout;
    QTabWidget *tabWidget;
    QWidget *tab;
    QHBoxLayout *horizontalLayout_4;
    QVBoxLayout *verticalLayout_2;
    QLabel *label_3;
    QSpacerItem *verticalSpacer_4;
    QHBoxLayout *horizontalLayout;
    QLabel *pythonPathLabel_2;
    QLineEdit *browserCommandLineEdit;
    QSpacerItem *verticalSpacer;
    QWidget *tab_2;
    QVBoxLayout *verticalLayout_5;
    QVBoxLayout *verticalLayout_4;
    QLabel *label_4;
    QSpacerItem *verticalSpacer_3;
    QGridLayout *gridLayout;
    QLabel *label_2;
    QLabel *pythonPathLabel;
    QLineEdit *pythonPathLineEdit;
    QLabel *label;
    QLabel *applicationPathLabel;
    QLineEdit *applicationPathLineEdit;
    QSpacerItem *verticalSpacer_2;
    QDialogButtonBox *buttonBox;

    void setupUi(QDialog *ConfigWindow)
    {
        if (ConfigWindow->objectName().isEmpty())
            ConfigWindow->setObjectName(QStringLiteral("ConfigWindow"));
        ConfigWindow->resize(625, 300);
        QSizePolicy sizePolicy(QSizePolicy::Minimum, QSizePolicy::Minimum);
        sizePolicy.setHorizontalStretch(0);
        sizePolicy.setVerticalStretch(0);
        sizePolicy.setHeightForWidth(ConfigWindow->sizePolicy().hasHeightForWidth());
        ConfigWindow->setSizePolicy(sizePolicy);
        ConfigWindow->setMinimumSize(QSize(625, 300));
        verticalLayout = new QVBoxLayout(ConfigWindow);
        verticalLayout->setObjectName(QStringLiteral("verticalLayout"));
        tabWidget = new QTabWidget(ConfigWindow);
        tabWidget->setObjectName(QStringLiteral("tabWidget"));
        tab = new QWidget();
        tab->setObjectName(QStringLiteral("tab"));
        horizontalLayout_4 = new QHBoxLayout(tab);
        horizontalLayout_4->setObjectName(QStringLiteral("horizontalLayout_4"));
        verticalLayout_2 = new QVBoxLayout();
        verticalLayout_2->setObjectName(QStringLiteral("verticalLayout_2"));
        verticalLayout_2->setSizeConstraint(QLayout::SetMaximumSize);
        label_3 = new QLabel(tab);
        label_3->setObjectName(QStringLiteral("label_3"));
        QSizePolicy sizePolicy1(QSizePolicy::Expanding, QSizePolicy::Preferred);
        sizePolicy1.setHorizontalStretch(0);
        sizePolicy1.setVerticalStretch(0);
        sizePolicy1.setHeightForWidth(label_3->sizePolicy().hasHeightForWidth());
        label_3->setSizePolicy(sizePolicy1);
        label_3->setMaximumSize(QSize(589, 16777215));
        label_3->setWordWrap(true);

        verticalLayout_2->addWidget(label_3);

        verticalSpacer_4 = new QSpacerItem(20, 10, QSizePolicy::Minimum, QSizePolicy::Fixed);

        verticalLayout_2->addItem(verticalSpacer_4);

        horizontalLayout = new QHBoxLayout();
        horizontalLayout->setObjectName(QStringLiteral("horizontalLayout"));
        horizontalLayout->setSizeConstraint(QLayout::SetMaximumSize);
        pythonPathLabel_2 = new QLabel(tab);
        pythonPathLabel_2->setObjectName(QStringLiteral("pythonPathLabel_2"));
        QSizePolicy sizePolicy2(QSizePolicy::Minimum, QSizePolicy::Preferred);
        sizePolicy2.setHorizontalStretch(0);
        sizePolicy2.setVerticalStretch(0);
        sizePolicy2.setHeightForWidth(pythonPathLabel_2->sizePolicy().hasHeightForWidth());
        pythonPathLabel_2->setSizePolicy(sizePolicy2);

        horizontalLayout->addWidget(pythonPathLabel_2);

        browserCommandLineEdit = new QLineEdit(tab);
        browserCommandLineEdit->setObjectName(QStringLiteral("browserCommandLineEdit"));

        horizontalLayout->addWidget(browserCommandLineEdit);


        verticalLayout_2->addLayout(horizontalLayout);

        verticalSpacer = new QSpacerItem(20, 40, QSizePolicy::Minimum, QSizePolicy::Expanding);

        verticalLayout_2->addItem(verticalSpacer);


        horizontalLayout_4->addLayout(verticalLayout_2);

        tabWidget->addTab(tab, QString());
        tab_2 = new QWidget();
        tab_2->setObjectName(QStringLiteral("tab_2"));
        verticalLayout_5 = new QVBoxLayout(tab_2);
        verticalLayout_5->setObjectName(QStringLiteral("verticalLayout_5"));
        verticalLayout_4 = new QVBoxLayout();
        verticalLayout_4->setObjectName(QStringLiteral("verticalLayout_4"));
        label_4 = new QLabel(tab_2);
        label_4->setObjectName(QStringLiteral("label_4"));
        label_4->setWordWrap(true);

        verticalLayout_4->addWidget(label_4);

        verticalSpacer_3 = new QSpacerItem(20, 10, QSizePolicy::Minimum, QSizePolicy::Fixed);

        verticalLayout_4->addItem(verticalSpacer_3);

        gridLayout = new QGridLayout();
        gridLayout->setObjectName(QStringLiteral("gridLayout"));
        label_2 = new QLabel(tab_2);
        label_2->setObjectName(QStringLiteral("label_2"));

        gridLayout->addWidget(label_2, 3, 1, 1, 1);

        pythonPathLabel = new QLabel(tab_2);
        pythonPathLabel->setObjectName(QStringLiteral("pythonPathLabel"));

        gridLayout->addWidget(pythonPathLabel, 0, 0, 1, 1);

        pythonPathLineEdit = new QLineEdit(tab_2);
        pythonPathLineEdit->setObjectName(QStringLiteral("pythonPathLineEdit"));

        gridLayout->addWidget(pythonPathLineEdit, 0, 1, 1, 1);

        label = new QLabel(tab_2);
        label->setObjectName(QStringLiteral("label"));
        label->setWordWrap(true);

        gridLayout->addWidget(label, 1, 1, 1, 1);

        applicationPathLabel = new QLabel(tab_2);
        applicationPathLabel->setObjectName(QStringLiteral("applicationPathLabel"));

        gridLayout->addWidget(applicationPathLabel, 2, 0, 1, 1);

        applicationPathLineEdit = new QLineEdit(tab_2);
        applicationPathLineEdit->setObjectName(QStringLiteral("applicationPathLineEdit"));

        gridLayout->addWidget(applicationPathLineEdit, 2, 1, 1, 1);


        verticalLayout_4->addLayout(gridLayout);

        verticalSpacer_2 = new QSpacerItem(20, 40, QSizePolicy::Minimum, QSizePolicy::Expanding);

        verticalLayout_4->addItem(verticalSpacer_2);


        verticalLayout_5->addLayout(verticalLayout_4);

        tabWidget->addTab(tab_2, QString());

        verticalLayout->addWidget(tabWidget);

        buttonBox = new QDialogButtonBox(ConfigWindow);
        buttonBox->setObjectName(QStringLiteral("buttonBox"));
        buttonBox->setOrientation(Qt::Horizontal);
        buttonBox->setStandardButtons(QDialogButtonBox::Cancel|QDialogButtonBox::Ok);

        verticalLayout->addWidget(buttonBox);


        retranslateUi(ConfigWindow);
        QObject::connect(buttonBox, SIGNAL(accepted()), ConfigWindow, SLOT(accept()));
        QObject::connect(buttonBox, SIGNAL(rejected()), ConfigWindow, SLOT(reject()));

        tabWidget->setCurrentIndex(0);


        QMetaObject::connectSlotsByName(ConfigWindow);
    } // setupUi

    void retranslateUi(QDialog *ConfigWindow)
    {
        ConfigWindow->setWindowTitle(QApplication::translate("ConfigWindow", "Dialog", nullptr));
        label_3->setText(QApplication::translate("ConfigWindow", "Enter a command line to be used to start the browser. If blank, the system default browser will be used. %URL% will be replaced with the appropriate URL when executing the browser.", nullptr));
        pythonPathLabel_2->setText(QApplication::translate("ConfigWindow", "Browser Command", nullptr));
        tabWidget->setTabText(tabWidget->indexOf(tab), QApplication::translate("ConfigWindow", "Runtime", nullptr));
        label_4->setText(QApplication::translate("ConfigWindow", "The options below are intended for expert users only, and may not behave as expected as they modify fixed search paths and are not alternate values. Modify with care!", nullptr));
        label_2->setText(QApplication::translate("ConfigWindow", "Enter the path to the directory containing pgAdmin.py if desired.", nullptr));
        pythonPathLabel->setText(QApplication::translate("ConfigWindow", "Python Path", nullptr));
        label->setText(QApplication::translate("ConfigWindow", "Enter a PYTHONPATH if desired. Path elements should be semi-colon delimited.", nullptr));
        applicationPathLabel->setText(QApplication::translate("ConfigWindow", "Application Path", nullptr));
        tabWidget->setTabText(tabWidget->indexOf(tab_2), QApplication::translate("ConfigWindow", "Python", nullptr));
    } // retranslateUi

};

namespace Ui {
    class ConfigWindow: public Ui_ConfigWindow {};
} // namespace Ui

QT_END_NAMESPACE

#endif // UI_CONFIGWINDOW_H
