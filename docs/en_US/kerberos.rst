.. _kerberos:

*****************************************
`Enabling Kerberos Authentication`:index:
*****************************************

**Prerequisite:** Kerberos understanding and setup

Reference: https://web.mit.edu/kerberos/

To configure Kerberos authentication, you must setup your Kerberos Server and
obtain a ticket on the client using *kinit*.

Note: Active Directory users with Kerberos support do not require kinit.

To enable Kerberos authentication for pgAdmin, you must configure the
Kerberos settings in *config_local.py* or *config_system.py*
(see the :ref:`config.py <config_py>` documentation) on the
system where pgAdmin is installed in Server mode. You can copy these settings
from *config.py* file and modify the values for the following parameters.

.. csv-table::
   :header: "**Parameter**", "**Description**"
   :class: longtable
   :widths: 35, 55

   "AUTHENTICATION_SOURCES","The default value for this parameter is *internal*.
   To enable Kerberos authentication, you must include *kerberos* in the
   list of values for this parameter. you can modify the value as follows:

   * [‘kerberos’]: pgAdmin will use only Kerberos authentication.

   * [‘kerberos’, ‘internal’]: pgAdmin will first try to authenticate the user
     through kerberos. If that authentication fails, then it will return back
     to the login page where you need to provide internal pgAdmin user
     credentials for authentication."
   "KERBEROS_AUTO_CREATE_USER", "Set the value to *True* if you want to
   automatically create a pgAdmin user corresponding to a successfully
   authenticated Kerberos user. Please note that password is not stored in the
   pgAdmin database."
   "KRB_APP_HOST_NAME", "Specify the name of *pgAdmin webserver hostname*.
   Please note that if it is not set, it will take the value of
   *default_server* parameter."


Keytab file for HTTP Service
============================

* Generate the *Keytab* file for the HTTP service principal HTTP/<host-name>@realm,
  and copy it to the *pgAdmin* webserver machine. Ensure that the operating system
  user owning the *pgAdmin* webserver is the owner of this file and should be
  accessible by that user.

* Please note that either you should set *default_keytab_name* parameter in
  *krb5.conf* file or the environment variable *KRB5_KTNAME*. If not set then
  explicitly set *KRB_KTNAME* to the location of your *Keytab* file in the
  *config_local.py* or *config_system.py* file.

Apache HTTPD Configuration
==========================

If the *pgAdmin* server is under the Apache Server, then you need to add the
following parameters in *Directory* directive of
:ref:`Apache HTTPD Configuration <server_deployment>`:

   * WSGIScriptReloading On

   * WSGIPassAuthorization On


Browser settings to configure Kerberos Authentication
=====================================================

You need to configure the browser settings on the client machine to use
Kerberos authentication via *SPNEGO*.

- For Mozilla Firefox

  - Open the low level Firefox configuration page by entering *about:config* in
    the address bar.
  - In the Search text box, enter: *network.negotiate-auth.trusted-uris*
  - Double-click the *network.negotiate-auth.trusted-uris* preference and enter
    the hostname or the domain of the web server that is protected by Kerberos
    HTTP SPNEGO. Separate multiple domains and hostnames with a comma.
  - Click OK.

- For Google Chrome

  - On Windows:

    * Open the Control Panel to access the Internet Options dialog.
    * Select the Security tab.
    * Select the Local Intranet zone and click the Sites button.
    * Make sure that the first two options, *Include all local (intranet) sites
      not listed in other zones* and *Include all sites that bypass the proxy
      server* are checked.
    * Click Advanced and add the names of the domains that are protected by
      Kerberos HTTP SPNEGO, one at a time, to the list of websites. For example,
      myhost.example.com. Click Close.
    * Click OK to save your configuration changes.

  - On Linux or macOS:

    * Add the *--auth-server-whitelist* parameter to the google-chrome command.
      For example, to run Chrome from a Linux prompt, run the google-chrome
      command as follows:

    .. code-block:: text

       google-chrome --auth-server-whitelist = "hostname/domain"


PostgreSQL Server settings to configure Kerberos Authentication
===============================================================

* To connect the PostgreSQL server with Kerberos authentication, GSSAPI support
  has to be enabled when PostgreSQL is built and the necessary
  `configuration <https://www.postgresql.org/docs/current/gssapi-auth.html>`_
  has to be in place.

* In pgAdmin you need to enable Kerberos authentication for the PostgreSQL
  server by setting "Kerberos authentication" flag to True in the Server dialog.
  Once it is enabled, pgAdmin will not prompt for a password and will try to
  connect to the PostgreSQL server using Kerberos.

* Note that, you have to login into pgAdmin with Kerberos authentication to
  then connect to PostgreSQL using Kerberos.

* In server mode, the only Kerberos credentials used to connect to a
  PostgreSQL server are those delegated by a user who logged in to pgAdmin
  with Kerberos, and only for a server with "Kerberos authentication"
  enabled. The default credential cache and client keytab of the operating
  system account that pgAdmin runs as are never used, so a user cannot
  connect to a server with that account's Kerberos identity.

* To enforce this for Windows SSPI, which uses the logon of the account
  pgAdmin runs as, and for gssproxy, which environment variables do not
  stop, in server mode pgAdmin also tells libpq what to use and what to
  refuse.

  * For a Kerberos-login user's connection to a server with Kerberos
    authentication enabled, pgAdmin forces ``gsslib=gssapi``, replacing any
    ``gsslib`` the user set. Without it, a libpq built with both GSSAPI and
    SSPI answers the server's request with SSPI, which uses the Windows
    logon of the account pgAdmin runs as and ignores the delegated
    credentials, whereas ``gsslib=gssapi`` makes libpq use the delegated
    credential cache. This helps only with a Windows libpq build that
    includes both GSSAPI and SSPI, as pgAdmin's Windows packages do. With
    libpq 16 or later, SSPI is also refused with ``require_auth=!sspi``;
    with an older libpq it is not refused.

  * Every other connection uses ``require_auth=!gss,!sspi`` and
    ``gssencmode=disable``, merged with the server's own "Require
    authentication" (``require_auth``) parameter. A server whose
    ``require_auth`` allows only ``gss`` can be used only by a
    Kerberos-login user connecting to a server with Kerberos authentication
    enabled, and one that allows only ``sspi`` cannot be used in server
    mode.

  * The ``require_auth`` protection needs libpq 16 or later in pgAdmin.
    Without it only the ``KRB5CCNAME`` and ``KRB5_CLIENT_KTNAME`` isolation
    applies to connections that may not use Kerberos, which does not cover
    Windows SSPI or gssproxy. ``gssencmode`` needs libpq 12 or later;
    ``gsslib`` is known to every libpq that pgAdmin supports.

  * psql and the utilities (such as pg_dump) get no ``require_auth`` in their
    connection string unless the user set one for the server, which is then
    merged as above. Their protection is the ``PGREQUIREAUTH``,
    ``PGGSSENCMODE`` and ``PGGSSLIB`` environment variables. Only a libpq
    16 or later in the utility honours ``PGREQUIREAUTH``; an older one
    ignores it silently.

  * A service file entry's settings take precedence over these environment
    variables for psql and the utilities, whereas pgAdmin's own connections
    are not affected, because their connection string takes precedence over
    the service file. Only a service listed in
    ``SERVER_MODE_ALLOWED_SERVICES`` can be used in server mode, so only an
    entry the administrator has written can do this. Do not set
    ``require_auth``, ``gssencmode`` or ``gsslib`` in such an entry unless
    every pgAdmin user may use what it allows: the ``KRB5CCNAME`` and
    ``KRB5_CLIENT_KTNAME`` isolation cannot be overridden by a service file,
    but ``require_auth`` and ``gsslib`` in a listed service can re-enable
    Windows SSPI or gssproxy for the utilities.


Master Password
===============

In the multi user mode, pgAdmin uses user's login password to encrypt/decrypt the PostgreSQL server password.
In the Kerberos authentication, the pgAdmin user does not have the password, so we need an encryption key to store
the PostgreSQL server password for the servers which are not configured to use the Kerberos authentication.
To accomplish this, set the configuration parameter MASTER_PASSWORD to *True*, so upon setting the master password,
it will be used as an encryption key while storing the password. If it is False, the server password can not be stored.
