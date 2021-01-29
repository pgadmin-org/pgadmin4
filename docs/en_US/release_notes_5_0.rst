************
Version 5.0
************

Release date: 2021-02-25

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.30.

New features
************


Housekeeping
************


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

. Documentation missing for 'Download Image' option in ERD. Fixes #6180.
2. Generate SQL displayed twice in ERD tool. Fixes #6179.
3. Zooming out too far makes the diagram vanish entirely. Fixes #6164.
4. Zoom to fit button only works if the diagram is larger than the canvas. Fixes #6163.
