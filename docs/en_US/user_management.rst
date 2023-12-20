.. _user_management:

*******************************
`User Management Dialog`:index:
*******************************

When invoking pgAdmin in desktop mode, a password is randomly generated, and
then ignored. If you install pgAdmin in server mode, you will be prompted for
an administrator email and password for the pgAdmin client.

When you authenticate with pgAdmin, the server definitions associated with that
login role are made available in the tree control.  An administrative user can
use the *User Management* dialog to:

* add or delete pgAdmin roles
* assign privileges
* manage the password associated with a role

.. image:: images/user.png
    :alt: pgAdmin user management window
    :align: center

Use the *Search* field to specify a criteria and review a list of users
that matches with the specified criteria. You can enter a value that matches
the following criteria types: *Authentication source*, *Username*, or *Email*.
For example, you can enter *ldap* in the search box and only the records having
*ldap* as authentication source will be displayed in the *User Management* table.

To add a user, click the Add (+) button at the top right corner.

.. image:: images/add_user.png
    :alt: pgAdmin user management window add new user
    :align: center

Provide information about the new pgAdmin role in the row:

* Use the drop-down list box next to *Authentication source* field to select the
  type of authentication that should be used for the user. If authentication
  source is only 'internal' then *Authentication source* field
  is disabled. Supported *Authentication source* are internal, ldap, kerberos,
  oauth2 and webserver.
* Click in the *Username* field, and provide a username for the user. This field
  is enabled only when you select authentication source except *internal*. If you
  select *internal* as authentication source, your email address is displayed in the
  username field.
* Click in the *Email* field, and provide an email address for the user.
* Use the drop-down list box next to *Role* to select whether a user is an
  *Administrator* or a *User*.

   * Select *Administrator* if the user will have administrative privileges
     within the pgAdmin client.
   * Select *User* to create a non-administrative user account.

* Move the *Active* switch to the *No* position if the account is not currently
  active; the default is *Yes*. Use this switch to disable account activity
  without deleting an account.
* Use the *New password* field to provide the password associated with the user
  specified in the *Email* field. This field is disabled if you select any
  authentication source except *internal*.
* Re-enter the password in the *Confirm password* field. This field is disabled
  if you select *ldap* as authentication source.
* *Locked* switch is disabled by default when set to *False*. It is only enabled
  when the user is locked by trying unsuccessful login attempts. Move the switch
  to the *False* position if you want to unlock the account.

To discard a user, and revoke access to pgAdmin, click the trash icon to the
left of the row and confirm deletion in the *Delete user?* dialog. If the user
has created some shared servers, then the :ref:`Change Ownership <change_ownership>`
dialog will appear to change the ownership of a shared server.


Users with the *Administrator* role are able to add, edit and remove pgAdmin
users, but otherwise have the same capabilities as those with the *User* role.

* Click the *Help* button (?) to access online help.
* Click the *Close* button to save work. You will be prompted to return to the
  dialog if your selections cannot be saved.


Using 'setup.py' command line script
####################################

.. note:: To manage users using ``setup.py`` script, you must use
        the Python interpreter that is normally used to run pgAdmin to ensure
        that the required Python packages are available. In most packages, this
        can be found in the Python Virtual Environment that can be found in the
        installation directory. When using platform-native packages, the system
        installation of Python may be the one used by pgAdmin.

        When using PIP wheel package to install pgadmin, all the commands can be used
        without Python interpreter.

        Some of the examples:
        pgadmin4-cli add-user user1@gmail.com password --role 1
        pgadmin4-cli get-prefs

Manage Users
*************

Add User
*********

To add user, invoke ``setup.py`` with ``add-user`` command line option, followed by
email and password. role and active will be optional fields.

.. code-block:: bash

    /path/to/python /path/to/setup.py add-user user1@gmail.com password

    # to specify a role, admin and non-admin users:

    /path/to/python /path/to/setup.py add-user user1@gmail.com password --admin
    /path/to/python /path/to/setup.py add-user user1@gmail.com password --nonadmin

    # to specify user's status

    /path/to/python /path/to/setup.py add-user user1@gmail.com password --active
    /path/to/python /path/to/setup.py add-user user1@gmail.com password --inactive

Add External User
*****************

To add external authentication user, invoke ``setup.py`` with ``add-external-user`` command line option,
followed by email, password and authentication source. email, role and status will be optional fields.

.. code-block:: bash

    /path/to/python /path/to/setup.py add-external-user user1@gmail.com ldap

    # to specify an email:

    /path/to/python /path/to/setup.py add-external-user ldapuser ldap --email user1@gmail.com

    # to specify a role, admin and non-admin user:

    /path/to/python /path/to/setup.py add-external-user ldapuser ldap  --admin
    /path/to/python /path/to/setup.py add-external-user ldapuser ldap  --nonadmin

    # to specify user's status

    /path/to/python /path/to/setup.py add-external-user user1@gmail.com ldap --active
    /path/to/python /path/to/setup.py add-external-user user1@gmail.com ldap --inactive

Update User
***********

To update user, invoke ``setup.py`` with ``update-user`` command line option, followed by
email address. password, role and active are updatable fields.

.. code-block:: bash

    /path/to/python /path/to/setup.py update-user user1@gmail.com --password new-password

    # to specify a role, admin and non-admin user:

    /path/to/python /path/to/setup.py update-user user1@gmail.com password --role --admin
    /path/to/python /path/to/setup.py update-user user1@gmail.com password --role --nonadmin

    # to specify user's status

   /path/to/python /path/to/setup.py update-user user1@gmail.com password --active
   /path/to/python /path/to/setup.py update-user user1@gmail.com password --inactive

Update External User
********************

To update the external user, invoke ``setup.py`` with ``update-external-user`` command line option,
followed by username and auth source. email, password, role and active are updatable fields.

.. code-block:: bash

    # to change email address:

    /path/to/python /path/to/setup.py update-external-user ldap ldapuser --email newemail@gmail.com

    # to specify a role, admin and non-admin user:

    /path/to/python /path/to/setup.py update-user user1@gmail.com password --role --admin
    /path/to/python /path/to/setup.py update-user user1@gmail.com password --role --nonadmin

    # to change user's status

   /path/to/python /path/to/setup.py update-user ldap ldapuser --active
   /path/to/python /path/to/setup.py update-user ldap ldapuser --inactive

Delete User
***********

To delete the user, invoke ``setup.py`` with ``delete-user`` command line option, followed by
username and auth_source. For Internal users, email adress will be used instead of username.

.. code-block:: bash

    /path/to/python /path/to/setup.py delete-user user1@gmail.com --auth-source internal
    /path/to/python /path/to/setup.py delete-user ldapuser --auth-source ldap


Get User
********

To get the user details, invoke ``setup.py`` with ``get-users`` command line option, followed by
username/email address.

.. code-block:: bash

    # to list all the users:
    /path/to/python /path/to/setup.py get-users

    # to get the user's details:
    /path/to/python /path/to/setup.py get-users --username user1@gmail.com


Output
******

Each command output can be seen in the json format too by adding --json command line option.