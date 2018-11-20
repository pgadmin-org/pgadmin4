***********
Version 3.6
***********

Release date: 2018-11-29

This release contains a number of features and fixes reported since the release of pgAdmin4 3.5


Features
********

| `Feature #1513 <https://redmine.postgresql.org/issues/1513>`_ - Add support for dropping multiple objects at once from the collection Properties panel.

Bug fixes
*********

| `Bug #3016 <https://redmine.postgresql.org/issues/3016>`_ - Ensure previous notices are not removed from the Messages tab in the Query Tool if an error occurs during query execution.
| `Bug #3029 <https://redmine.postgresql.org/issues/3029>`_ - Allow the selection order to be preserved in the Select2 control to fix column ordering in data Import/Export.
| `Bug #3629 <https://redmine.postgresql.org/issues/3629>`_ - Allow use of 0 (integer) and empty strings as parameters in the debugger.
| `Bug #3723 <https://redmine.postgresql.org/issues/3723>`_ - Properly report errors when debugging cannot be started.
| `Bug #3736 <https://redmine.postgresql.org/issues/3736>`_ - Fix toggle breakpoints buttons in the debugger.
| `Bug #3746 <https://redmine.postgresql.org/issues/3746>`_ - Fix dropping of multiple functions/procedures at once.