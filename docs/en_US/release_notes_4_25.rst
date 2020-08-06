************
Version 4.25
************

Release date: 2020-08-20

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.24.

New features
************

| `Issue #3904 <https://redmine.postgresql.org/issues/3904>`_ -  Replace charting library Flotr2 with ChartJS using React.
| `Issue #5610 <https://redmine.postgresql.org/issues/5610>`_ -  Add a --yes command line option to setup-web.sh to allow non-interactive use.

Housekeeping
************

| `Issue #5324 <https://redmine.postgresql.org/issues/5324>`_ -  Improve code coverage and API test cases for Foreign Servers and User Mappings.
| `Issue #5327 <https://redmine.postgresql.org/issues/5327>`_ -  Improve code coverage and API test cases for Schemas.
| `Issue #5336 <https://redmine.postgresql.org/issues/5336>`_ -  Improve code coverage and API test cases for Types.
| `Issue #5700 <https://redmine.postgresql.org/issues/5700>`_ -  Remove old Python 2 compatibility code.

Bug fixes
*********

| `Issue #3767 <https://redmine.postgresql.org/issues/3767>`_ -  Ensure that the original file format should be retained when saving the same file in SQL editor.
| `Issue #4361 <https://redmine.postgresql.org/issues/4361>`_ -  Fixed ssh tunnel hang issue when the user tries to disconnect the server.
| `Issue #4387 <https://redmine.postgresql.org/issues/4387>`_ -  Fixed an issue where the user is not able to insert the data if the table and columns name contains special characters.
| `Issue #4810 <https://redmine.postgresql.org/issues/4810>`_ -  Fixed an issue where the user is not able to save the new row if the table is empty.
| `Issue #5429 <https://redmine.postgresql.org/issues/5429>`_ -  Ensure that the Dictionaries drop-down shows all the dictionaries in the FTS configuration dialog.
| `Issue #5490 <https://redmine.postgresql.org/issues/5490>`_ -  Make the runtime configuration dialog non-modal.
| `Issue #5632 <https://redmine.postgresql.org/issues/5632>`_ -  Ensure that the user will be able to modify the start value of the Identity column.
| `Issue #5646 <https://redmine.postgresql.org/issues/5646>`_ -  Ensure that RLS Policy node should be searchable using search object.
| `Issue #5708 <https://redmine.postgresql.org/issues/5708>`_ -  Correct TLS certificate filename in the container deployment docs.
| `Issue #5710 <https://redmine.postgresql.org/issues/5710>`_ -  Fixed an issue when comparing the table with a trigger throwing error in schema diff.