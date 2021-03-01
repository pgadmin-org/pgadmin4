.. _master_password:

************************
`Master Password`:index:
************************

A master password is required to secure and later unlock the saved server
passwords. This is applicable only for desktop mode users.

* You are prompted to enter the master password when you open the window for
  the first time after starting the application.
* Once you set the master password, all the existing saved passwords will be
  re-encrypted using the master password.
* The server passwords which are saved in the SQLite DB file are encrypted and
  decrypted using the master password.

.. image:: images/master_password_set.png
    :alt: Set master password
    :align: center

.. note:: pgAdmin aims to be **secure by default**, however, you can disable the master
  password by setting the configuration parameter *MASTER_PASSWORD_REQUIRED=False*.
  See :ref:`config_py` for more information on configuration parameters and how
  they can be changed or enforced across an organisation.

.. note:: If the master password is disabled, then all the saved passwords will
    be removed.

.. warning:: If the master password is disabled, then the saved passwords will
    be encrypted using a key which is derived from information within the
    configuration database. Use of a master password ensures that the encryption
    key does not need to be stored anywhere, and thus prevents possible access
    to server credentials if the configuration database becomes available to an
    attacker.

    It is **strongly** recommended that you use the master password if you use
    the *Save Password* option.

* The master password is not stored anywhere on the physical storage. It is
  temporarily stored in the application memory and it does not get saved when
  the application is restarted.
* You are prompted to enter the master password when pgAdmin server is
  restarted.

.. image:: images/master_password_enter.png
    :alt: Enter master password
    :align: center


* If you forget the master password, you can use the *Reset Master Password*
  button to reset the password.

.. image:: images/master_password_reset.png
    :alt: Reset master password
    :align: center

.. warning:: Resetting the master password will also remove all saved passwords
    and close all existing established connections.
