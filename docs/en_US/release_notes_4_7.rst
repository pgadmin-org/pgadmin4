***********
Version 4.7
***********

Release date: 2019-05-30

This release contains a number of bug fixes since the release of pgAdmin4 4.6.


Bug fixes
*********

| `Bug #3377 <https://redmine.postgresql.org/issues/3377>`_ - In server mode, update all the saved server credentials when user password is changed.
| `Bug #3885 <https://redmine.postgresql.org/issues/3885>`_ - Fix the responsive layout of the main menu bar.
| `Bug #4162 <https://redmine.postgresql.org/issues/4162>`_ - Fix syntax error when adding more than one column to the existing table.
| `Bug #4164 <https://redmine.postgresql.org/issues/4164>`_ - Fix file browser path issue which occurs when client is on Windows and server is on Mac/Linux.
| `Bug #4184 <https://redmine.postgresql.org/issues/4184>`_ - Added Master Password to increase the security of saved passwords.
| `Bug #4194 <https://redmine.postgresql.org/issues/4194>`_ - Fix accessibility issue for menu navigation.
| `Bug #4208 <https://redmine.postgresql.org/issues/4208>`_ - Update the UI logo.
| `Bug #4217 <https://redmine.postgresql.org/issues/4217>`_ - Fixed CSRF security vulnerability issue, per Alvin Lindstam
| `Bug #4218 <https://redmine.postgresql.org/issues/4218>`_ - Properly assign dropdownParent in Select2 controls.
| `Bug #4219 <https://redmine.postgresql.org/issues/4219>`_ - Ensure popper.js is installed when needed.
| `Bug #4227 <https://redmine.postgresql.org/issues/4227>`_ - Fixed Tab key navigation for Maintenance dialog.
| `Bug #4244 <https://redmine.postgresql.org/issues/4244>`_ - Fix Tab key issue for Toggle switch controls and button on the dialog footer in Safari browser.
| `Bug #4245 <https://redmine.postgresql.org/issues/4245>`_ - Ensure that element should get highlighted when they get focus on using Tab key.
| `Bug #4246 <https://redmine.postgresql.org/issues/4246>`_ - Fixed console error when subnode control is used in panels.
| `Bug #4261 <https://redmine.postgresql.org/issues/4261>`_ - Stop using application/x-javascript as a mime type and use the RFC-compliant application/javascript instead.
| `Bug #4262 <https://redmine.postgresql.org/issues/4262>`_ - Fixed error on displaying table properties of a table partitioned by list having a default partition.
| `Bug #4263 <https://redmine.postgresql.org/issues/4263>`_ - Fix handling of JSON in the Query Tool with NULL elements.
| `Bug #4269 <https://redmine.postgresql.org/issues/4269>`_ - Fix navigation of switch cells in grids.
| `Bug #4275 <https://redmine.postgresql.org/issues/4275>`_ - Clarify wording for the NO INHERIT option on constraints, per Michel Feinstein.
| `Bug #4276 <https://redmine.postgresql.org/issues/4276>`_ - Relax the permission check on the directory containing the config database, as it may fail in some environments such as OpenShift.
| `Bug #4278 <https://redmine.postgresql.org/issues/4278>`_ - Prevent Backgrid Password cells from losing focus if the browser opens an autocomplete list.
| `Bug #4284 <https://redmine.postgresql.org/issues/4284>`_ - Fix syntax error when creating a table with a serial column.