************
Version 6.11
************

Release date: 2022-06-30

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.10.

New features
************

  | `Issue #2647 <https://redmine.postgresql.org/issues/2647>`_ -  Added mouse over indication for breakpoint area in the Debugger.
  | `Issue #2648 <https://redmine.postgresql.org/issues/2648>`_ -  Added search text option to the Debugger panel.
  | `Issue #7178 <https://redmine.postgresql.org/issues/7178>`_ -  Added capability to deploy PostgreSQL servers on Microsoft Azure.
  | `Issue #7332 <https://redmine.postgresql.org/issues/7332>`_ -  Added support for passing password using Docker Secret to Docker images.
  | `Issue #7351 <https://redmine.postgresql.org/issues/7351>`_ -  Added the option 'Show template databases?' to display template databases regardless of the setting of 'Show system objects?'.
  | `Issue #7485 <https://redmine.postgresql.org/issues/7485>`_ -  Added support for visualise the graph using a Line chart in the query tool.

Housekeeping
************

  | `Issue #6132 <https://redmine.postgresql.org/issues/6132>`_ -  Port Debugger to React.
  | `Issue #7315 <https://redmine.postgresql.org/issues/7315>`_ -  Updates documentation for the Traefik v2 container deployment.
  | `Issue #7411 <https://redmine.postgresql.org/issues/7411>`_ -  Update pgcli to latest release 3.4.1.
  | `Issue #7469 <https://redmine.postgresql.org/issues/7469>`_ -  Upgrade Chartjs to the latest 3.8.0.

Bug fixes
*********

  | `Issue #7423 <https://redmine.postgresql.org/issues/7423>`_ -  Fixed an issue where there is no setting to turn off notifications in the Query Tool.
  | `Issue #7440 <https://redmine.postgresql.org/issues/7440>`_ -  Fixed an issue where passwords entered in the 'Connect To Server' dialog were truncated.
  | `Issue #7441 <https://redmine.postgresql.org/issues/7441>`_ -  Ensure that the Query Editor should be focused when switching between query tool tabs.
  | `Issue #7443 <https://redmine.postgresql.org/issues/7443>`_ -  Fixed and issue where 'Use spaces' not working in the query tool.
  | `Issue #7453 <https://redmine.postgresql.org/issues/7453>`_ -  Fixed an issue where the Database restriction is not working.
  | `Issue #7460 <https://redmine.postgresql.org/issues/7460>`_ -  Fixed an issue where pgAdmin stuck while creating a new index.
  | `Issue #7461 <https://redmine.postgresql.org/issues/7461>`_ -  Fixed an issue where the connection wasn't being closed when the user switched to a new connection and closed the query tool.
  | `Issue #7468 <https://redmine.postgresql.org/issues/7468>`_ -  Skip the history records if the JSON info can't be parsed instead of showing 'No history'.
  | `Issue #7502 <https://redmine.postgresql.org/issues/7502>`_ -  Fixed an issue where an error message is displayed when creating the new database.
  | `Issue #7506 <https://redmine.postgresql.org/issues/7506>`_ -  Fixed permission denied error when deploying PostgreSQL in Azure using Docker.
