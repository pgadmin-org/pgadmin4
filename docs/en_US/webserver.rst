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
     to the login page where you need to provide internal pgAdmin user
     credentials for authentication."
    "WEBSERVER_AUTO_CREATE_USER", "Set the value to *True* if you want to automatically
    create a pgAdmin user corresponding to a successfully authenticated Webserver user.
    Please note that password is not stored in the pgAdmin database."
    "WEBSERVER_REMOTE_USER", "To get the web server remote user details, set this variable to any header or
    environment variable name which comes from the web server after webserver authentication.
    The default value is REMOTE_USER and the possible values are REMOTE_USER,
    HTTP_X_FORWARDED_USER, X-Forwarded-User."
    "WEBSERVER_REMOTE_USER_FROM_HEADER", "Set to *True* only if your reverse proxy passes the
    authenticated identity as an HTTP request header rather than the REMOTE_USER CGI variable.
    Defaults to *False*. See the warning below before enabling this."
    "WEBSERVER_TRUSTED_PROXIES", "A list of IP addresses/CIDR ranges of the reverse proxies
    that are allowed to assert the identity header. Required (non-empty) for
    WEBSERVER_REMOTE_USER_FROM_HEADER to take effect. Defaults to an empty list."
    "WEBSERVER_SHARED_SECRET", "An optional shared secret that the trusted proxy must inject
    into every request, as additional proof that the identity header was set by the proxy
    and not the client. Defaults to *None* (not checked)."
    "WEBSERVER_SHARED_SECRET_HEADER", "The header name carrying WEBSERVER_SHARED_SECRET.
    Defaults to *X-Pgadmin-Webserver-Secret*."

.. warning::
    Setting WEBSERVER_REMOTE_USER to a header-derived name (such as
    HTTP_X_FORWARDED_USER, or REMOTE-USER/Remote-user) means the identity is
    read from a client-controlled HTTP request header, not necessarily a
    value set by your webserver's authentication plug-in. Any client that
    can reach pgAdmin can set this header itself and impersonate any user,
    including an existing Administrator, unless you:

    * Set ``WEBSERVER_REMOTE_USER_FROM_HEADER = True``.
    * List every reverse proxy allowed to assert the identity in
      ``WEBSERVER_TRUSTED_PROXIES``.
    * Configure your reverse proxy to strip *every* inbound spelling of the
      header (any hyphen/underscore variant, in any case) before it sets its
      own, so a client cannot smuggle a value past it.
    * Optionally configure ``WEBSERVER_SHARED_SECRET`` /
      ``WEBSERVER_SHARED_SECRET_HEADER`` as an additional proof that the
      header was set by your proxy.

    Without all of the above, pgAdmin does not trust a header-asserted
    identity and login through it is rejected.

Master Password
===============

In the multi user mode, pgAdmin uses user's login password to encrypt/decrypt the PostgreSQL server password.
In the Webserver authentication, the pgAdmin does not store the user's password, so we need an encryption key to store
the PostgreSQL server password.
To accomplish this, set the configuration parameter MASTER_PASSWORD to *True*, so upon setting the master password,
it will be used as an encryption key while storing the password. If it is False, the server password can not be stored.
