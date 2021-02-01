************
Version 5.0
************

Release date: 2021-02-25

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.30.

New features
************

| `Issue #5912 <https://redmine.postgresql.org/issues/5912>`_ -  Added support for Logical Replication.
| `Issue #5967 <https://redmine.postgresql.org/issues/5967>`_ -  Implemented runtime using NWjs to open pgAdmin4 in a standalone window instead of the system tray and web browser.
| `Issue #6170 <https://redmine.postgresql.org/issues/6170>`_ -  Rotate the logfile in the container distribution.

Housekeeping
************

| `Issue #5017 <https://redmine.postgresql.org/issues/5017>`_ -  Use cheroot as the default production server for pgAdmin4.

Bug fixes
*********

| `Issue #5871 <https://redmine.postgresql.org/issues/5871>`_ -  Ensure that username should be visible in the 'Connect to Server' popup when service and user name both specified.
| `Issue #6045 <https://redmine.postgresql.org/issues/6045>`_ -  Fixed autocomplete issue where it is not showing any suggestions if the schema name contains escape characters.
| `Issue #6087 <https://redmine.postgresql.org/issues/6087>`_ -  Fixed an issue where the dependencies tab showing multiple owners for the objects having shared dependencies.
| `Issue #6163 <https://redmine.postgresql.org/issues/6163>`_ -  Fixed an issue where Zoom to fit button only works if the diagram is larger than the canvas.
| `Issue #6164 <https://redmine.postgresql.org/issues/6164>`_ -  Ensure that the diagram should not vanish entirely if zooming out too far in ERD.
| `Issue #6177 <https://redmine.postgresql.org/issues/6177>`_ -  Fixed an issue while downloading ERD images in Safari and Firefox.
| `Issue #6179 <https://redmine.postgresql.org/issues/6179>`_ -  Fixed an issue where Generate SQL displayed twice in the ERD tool.
| `Issue #6180 <https://redmine.postgresql.org/issues/6180>`_ -  Updated missing documentation for the 'Download Image' option in ERD.
| `Issue #6187 <https://redmine.postgresql.org/issues/6187>`_ -  Limit the upgrade check to run once per day.
