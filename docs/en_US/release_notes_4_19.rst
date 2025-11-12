************
Version 4.19
************

Release date: 2020-03-05

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.18.

New features
************

| `Issue #5154 <https://redmine.postgresql.org/issues/5154>`_ -  Added accessibility support in AlertifyJS.
| `Issue #5170 <https://redmine.postgresql.org/issues/5170>`_ -  Added Czech language support.
| `Issue #5179 <https://redmine.postgresql.org/issues/5179>`_ -  Added Python 3.8 support.

Housekeeping
************

| `Issue #5088 <https://redmine.postgresql.org/issues/5088>`_ -  Improve code coverage and API test cases for the Event Trigger module.
| `Issue #5133 <https://redmine.postgresql.org/issues/5133>`_ -  Improvements in the UI for both default and dark themes.
| `Issue #5176 <https://redmine.postgresql.org/issues/5176>`_ -  Enhance logging by tracking stdout and stderr of subprocess when log level set to DEBUG.
| `Issue #5185 <https://redmine.postgresql.org/issues/5185>`_ -  Added option to override the class name of a label tag for select2 control.

Bug fixes
*********

| `Issue #4955 <https://redmine.postgresql.org/issues/4955>`_ -  Changed the color of selected and hovered item for Select2 dropdown.
| `Issue #4996 <https://redmine.postgresql.org/issues/4996>`_ -  Improve the style of the highlighted code after query execution for Dark mode.
| `Issue #5058 <https://redmine.postgresql.org/issues/5058>`_ -  Ensure that AlertifyJS should not be visible as a title for alert dialog.
| `Issue #5077 <https://redmine.postgresql.org/issues/5077>`_ -  Changed background pattern for geometry viewer to use #fff for all themes.
| `Issue #5101 <https://redmine.postgresql.org/issues/5101>`_ -  Fix an issue where debugger not showing all arguments anymore after hitting SQL error while debugging.
| `Issue #5107 <https://redmine.postgresql.org/issues/5107>`_ -  Set proper focus on tab navigation for file manager dialog.
| `Issue #5115 <https://redmine.postgresql.org/issues/5115>`_ -  Fix an issue where command and statements were parsed incorrectly for Rules.
| `Issue #5142 <https://redmine.postgresql.org/issues/5142>`_ -  Ensure that all the transactions should be canceled before closing the connections when a server is disconnected using pgAdmin.
| `Issue #5184 <https://redmine.postgresql.org/issues/5184>`_ -  Fixed Firefox monospaced issue by updating the font to the latest version.
| `Issue #5214 <https://redmine.postgresql.org/issues/5214>`_ -  Update Flask-SQLAlchemy and SQLAlchemy package which is not working on Windows with Python 3.8.
| `Issue #5215 <https://redmine.postgresql.org/issues/5215>`_ -  Fix syntax error when changing the event type for the existing rule.