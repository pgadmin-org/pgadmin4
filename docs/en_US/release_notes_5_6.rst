************
Version 5.6
************

Release date: 2021-08-12

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.5.

New features
************


Housekeeping
************


Bug fixes
*********

| `Issue #6337 <https://redmine.postgresql.org/issues/6337>`_ -  Ensure that the login account should be locked after N number of attempts. N is configurable using the 'MAX_LOGIN_ATTEMPTS' parameter.
| `Issue #6369 <https://redmine.postgresql.org/issues/6369>`_ -  Fixed CSRF errors for stale sessions by increasing the session expiration time for desktop mode.
| `Issue #6448 <https://redmine.postgresql.org/issues/6448>`_ -  Fixed an issue in the search object when searching in 'all types' or 'subscription' if the user doesn't have access to the subscription.
| `Issue #6574 <https://redmine.postgresql.org/issues/6574>`_ -  Fixed an issue where paste is not working through Right-Click option on PSQL.
| `Issue #6580 <https://redmine.postgresql.org/issues/6580>`_ -  Fixed TypeError 'NoneType' object is not sub scriptable.
