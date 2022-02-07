.. _webserver:

********************************************
`Enabling Webserver Authentication`:index:
********************************************

To configure Webserver authentication, you must setup your webserver
with any authentication plug-in (such as Shibboleth, HTTP BASIC auth)
as long as it sets the REMOTE_USER environment variable.
To enable Webserver authentication for pgAdmin, you must configure the Webserver
settings in the *config_local.py* or *config_system.py* file (see the
:ref:`config.py <config_py>` documentation) on the system where pgAdmin is
installed in Server mode. You can copy these settings from *config.py* file
and modify the values for the following parameters:


.. csv-table::
   :header: "**Parameter**", "**Description**"
   :class: longtable
   :widths: 35, 55

   "AUTHENTICATION_SOURCES", "The default value for this parameter is *internal*.
   To enable OAUTH2 authentication, you must include *webserver* in the list of values
   for this parameter. you can modify the value as follows:

   * [‘webserver’]: pgAdmin will use only Webserver authentication.

   * [‘webserver’, ‘internal’]: pgAdmin will first try to authenticate the user
     through webserver. If that authentication fails, then it will return back
     to the login dialog where you need to provide internal pgAdmin user
     credentials for authentication."
    "WEBSERVER_AUTO_CREATE_USER", "Set the value to *True* if you want to automatically
    create a pgAdmin user corresponding to a successfully authenticated Webserver user.
    Please note that password is not stored in the pgAdmin database."
    "WEBSERVER_REMOTE_USER", "To get the web server remote user details, set this variable to any header or
    environment variable name which comes from the web server after webserver authentication.
    The default value is REMOTE_USER and the possible values are REMOTE_USER,
    HTTP_X_FORWARDED_USER, X-Forwarded-User."


Master Password
===============

In the multi user mode, pgAdmin uses user's login password to encrypt/decrypt the PostgreSQL server password.
In the Webserver authentication, the pgAdmin does not store the user's password, so we need an encryption key to store
the PostgreSQL server password.
To accomplish this, set the configuration parameter MASTER_PASSWORD to *True*, so upon setting the master password,
it will be used as an encryption key while storing the password. If it is False, the server password can not be stored.
