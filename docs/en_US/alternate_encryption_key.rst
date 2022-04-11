.. _alternate_encryption_key:

**********************************
`Alternate Encryption Key`:index:
**********************************

pgAdmin would use the alternate encryption key to secure and later unlock the saved server
passwords if the master password is disabled AND there is NO suitable key/password available
from the authentication module for the user in server mode.

When pgAdmin stores a connection password,
it encrypts it using a key that is formed either from the master password, or
from the pgAdmin login password for the user. In the case of authentication methods
such as OAuth, Kerberos or Webserver, pgAdmin doesn't have access to anything long-lived to
form the encryption key from, hence it uses the master password and if master password
is disabled pgAdmin would use the alternate encryption key, if it is set.


.. note:: You can set the alternate encryption key by setting the configuration
  parameter *ALTERNATE_ENCRYPTION_KEY=<Key>*.
  See :ref:`config_py` for more information on configuration parameters and how
  they can be changed or enforced across an organisation.

.. note:: If the master password and the alternate encryption key is disabled,
  then all the saved passwords will be removed.


.. warning:: By setting this option, you should be fully aware of the potential security
    risk of using the same encryption key for multiple users, that may be accessible to
    sysadmins who would not normally be able to use pgAdmin.

    It is **not recommended** that you use the alternate encryption key instead of master password
    if you use the *Save Password* option.
