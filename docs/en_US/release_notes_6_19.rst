************
Version 6.19
************

Release date: 2023-01-17

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.18.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

New features
************

  | `Issue #5569 <https://github.com/pgadmin-org/pgadmin4/issues/5569>`_ -  Added support of AWS provider for BigAnimal cloud deployment.

Housekeeping
************

  | `Issue #5563 <https://github.com/pgadmin-org/pgadmin4/issues/5563>`_ -  Allow YouTube video demo links to be added to appropriate pgAdmin documentation.
  | `Issue #5615 <https://github.com/pgadmin-org/pgadmin4/issues/5615>`_ -  Rewrite pgAdmin main menu bar to use React.

Bug fixes
*********

  | `Issue #5487 <https://github.com/pgadmin-org/pgadmin4/issues/5487>`_ -  Fixed an issue where incorrect password used with shared server.
  | `Issue #5541 <https://github.com/pgadmin-org/pgadmin4/issues/5541>`_ -  Ensure the browser tree does not freeze while rendering 10k+ nodes/objects.
  | `Issue #5542 <https://github.com/pgadmin-org/pgadmin4/issues/5542>`_ -  Fixed an issue updating the schema node de-select the node in the tree if only one schema is present in the collection node.
  | `Issue #5559 <https://github.com/pgadmin-org/pgadmin4/issues/5559>`_ -  Fixed tree flickering issue on scroll.
  | `Issue #5577 <https://github.com/pgadmin-org/pgadmin4/issues/5577>`_ -  Fixed an issue where the default value of string for columns should wrap in quotes in the create script.
  | `Issue #5586 <https://github.com/pgadmin-org/pgadmin4/issues/5586>`_ -  Fix the webserver and internal authentication setup issue.
  | `Issue #5613 <https://github.com/pgadmin-org/pgadmin4/issues/5613>`_ -  Ensure the appbundle has correct permissions so that pgAdmin can be accessed by users other than owner.
  | `Issue #5622 <https://github.com/pgadmin-org/pgadmin4/issues/5622>`_ -  Fixed an issue where the ignore owner flag is not working for some cases in the Schema Diff.
  | `Issue #5626 <https://github.com/pgadmin-org/pgadmin4/issues/5626>`_ -  Fixed an issue where actions performed on the tree node should update the context menu options.
  | `Issue #5627 <https://github.com/pgadmin-org/pgadmin4/issues/5627>`_ -  Ensure that the submenus under the trigger's context menu are enabled/disabled correctly.
  | `Issue #5640 <https://github.com/pgadmin-org/pgadmin4/issues/5640>`_ -  Update boto3 & botocore to the latest version.
  | `Issue #5641 <https://github.com/pgadmin-org/pgadmin4/issues/5641>`_ -  Fixed an issue where Geometry viewer does not show popup when columns are less than 3.
  | `Issue #5647 <https://github.com/pgadmin-org/pgadmin4/issues/5647>`_ -  Fixed an issue where row count notification was disappearing automatically.
  | `Issue #5661 <https://github.com/pgadmin-org/pgadmin4/issues/5661>`_ -  Fix select dropdown border issue.
  | `Issue #5666 <https://github.com/pgadmin-org/pgadmin4/issues/5666>`_ -  Fixed a missing "jwks_uri" in metadata error that occurred when logging in with an oAuth2 provider like Azure or Google.
  | `Issue #5675 <https://github.com/pgadmin-org/pgadmin4/issues/5675>`_ -  Fixed an issue where rename panel was losing focus when trying to add name if input box is empty.
  | `Issue #5734 <https://github.com/pgadmin-org/pgadmin4/issues/5734>`_ -  Ensure that the authenticated users can't access each other's directories and files by providing relative paths.(CVE-2023-0241)
