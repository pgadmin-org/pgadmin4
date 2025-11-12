************
Version 6.15
************

Release date: 2022-10-20

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.14.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

New features
************

  | `Issue #3491 <https://github.com/pgadmin-org/pgadmin4/issues/3491>`_ -  Added support for IAM token based authentication for AWS RDS or Azure DB.
  | `Issue #4392 <https://github.com/pgadmin-org/pgadmin4/issues/4392>`_ -  Added support to specify the background fill color to the table nodes in the ERD tool.
  | `Issue #4994 <https://github.com/pgadmin-org/pgadmin4/issues/4994>`_ -  Allow reordering table columns using drag and drop in ERD Tool.
  | `Issue #4997 <https://github.com/pgadmin-org/pgadmin4/issues/4997>`_ -  Add option to generate SQL with DROP table DDL in ERD Tool.
  | `Issue #5304 <https://github.com/pgadmin-org/pgadmin4/issues/5304>`_ -  Added high availability options to AWS deployment.
  | `Issue #5390 <https://github.com/pgadmin-org/pgadmin4/issues/5390>`_ -  Expose the Gunicorn limit_request_line parameter in the container, with the default set to the maximum 8190.

Housekeeping
************

  | `Issue #5065 <https://github.com/pgadmin-org/pgadmin4/issues/5065>`_ -  Use SocketIO instead of REST for fetching database tables data in ERD.
  | `Issue #5293 <https://github.com/pgadmin-org/pgadmin4/issues/5293>`_ -  Ensure that the tooltips are consistent throughout the entire application.
  | `Issue #5357 <https://github.com/pgadmin-org/pgadmin4/issues/5357>`_ -  Remove Python's 'Six' package completely.

Bug fixes
*********

  | `Issue #5101 <https://github.com/pgadmin-org/pgadmin4/issues/5101>`_ -  Ensure consistent orderings for ACLS when comparing schemas in the schema diff.
  | `Issue #5132 <https://github.com/pgadmin-org/pgadmin4/issues/5132>`_ -  Ensure that the result grid column should take width as pre preferences setting on first execution.
  | `Issue #5133 <https://github.com/pgadmin-org/pgadmin4/issues/5133>`_ -  Fixed an exception occur while taking backup and SSL certificates/keys are not found in the specified path.
  | `Issue #5145 <https://github.com/pgadmin-org/pgadmin4/issues/5145>`_ -  Fixed intermittent error shown while OAuth2 login.
  | `Issue #5167 <https://github.com/pgadmin-org/pgadmin4/issues/5167>`_ -  Ensure that the path to the psqlrc file is correct when multiple users open the PSQL tool at the same time.
  | `Issue #5188 <https://github.com/pgadmin-org/pgadmin4/issues/5188>`_ -  Ensure that the continue/start button should be disabled if the user stops the Debugger for the procedures.
  | `Issue #5210 <https://github.com/pgadmin-org/pgadmin4/issues/5210>`_ -  Ensure that the query tool creates a new tab with the appropriate user when pressing Alt+Shift+Q.
  | `Issue #5212 <https://github.com/pgadmin-org/pgadmin4/issues/5212>`_ -  Added the close button for all the notifications of the notistack.
  | `Issue #5249 <https://github.com/pgadmin-org/pgadmin4/issues/5249>`_ -  Added the ability to display the selected text from the query tool in the find/replace box.
  | `Issue #5261 <https://github.com/pgadmin-org/pgadmin4/issues/5261>`_ -  Ensure that the search filter should be cleared when a new row is added to the user management.
  | `Issue #5262 <https://github.com/pgadmin-org/pgadmin4/issues/5262>`_ -  Ensure that the user management dialog should not allow the same email addresses with different letter casings when creating users.
  | `Issue #5277 <https://github.com/pgadmin-org/pgadmin4/issues/5277>`_ -  Fixed XSS vulnerability issues.
  | `Issue #5296 <https://github.com/pgadmin-org/pgadmin4/issues/5296>`_ -  Ensure that the scroll position should be preserved for the result set in the query tool on tab change.
  | `Issue #5308 <https://github.com/pgadmin-org/pgadmin4/issues/5308>`_ -  Ensure that the default value for a column should be used if it is made empty.
  | `Issue #5327 <https://github.com/pgadmin-org/pgadmin4/issues/5327>`_ -  Fixed an issue where user was unable to select privileges in Safari.
  | `Issue #5332 <https://github.com/pgadmin-org/pgadmin4/issues/5332>`_ -  Fixed console warning shown while updating database node from browser tree.
  | `Issue #5338 <https://github.com/pgadmin-org/pgadmin4/issues/5338>`_ -  Fixed an issue where the prompt is not visible when clicking on the 'save results to file' button on the large data.
  | `Issue #5352 <https://github.com/pgadmin-org/pgadmin4/issues/5352>`_ -  Fixed error occurring while LDAP authentication for a user with multiple email attributes.
  | `Issue #5364 <https://github.com/pgadmin-org/pgadmin4/issues/5364>`_ -  Fixed an issue where notifications disappeared quickly.
  | `Issue #5367 <https://github.com/pgadmin-org/pgadmin4/issues/5367>`_ -  Ensure that the correct value should be returned if an exception occurs while decoding the password.
  | `Issue #5368 <https://github.com/pgadmin-org/pgadmin4/issues/5368>`_ -  Fixed the issue while downloading the file from the file manager.
  | `Issue #5386 <https://github.com/pgadmin-org/pgadmin4/issues/5386>`_ -  Ensure that the login form is hidden if the authentication source is OAuth2 or Kerberos.
  | `Issue #5397 <https://github.com/pgadmin-org/pgadmin4/issues/5397>`_ -  Fixed an issue where the password recovery link was not working.
  | `Issue #5402 <https://github.com/pgadmin-org/pgadmin4/issues/5402>`_ -  Ensure that scroll bar on browser tree should be visible on windows resize.
  | `Issue #5405 <https://github.com/pgadmin-org/pgadmin4/issues/5405>`_ -  Fixed the cross-site scripting vulnerability.
  | `Issue #5427 <https://github.com/pgadmin-org/pgadmin4/issues/5427>`_ -  Fixed an issue where filtered rows were not working.
