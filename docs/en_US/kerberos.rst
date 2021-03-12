.. _kerberos:

*****************************************
`Enabling Kerberos Authentication`:index:
*****************************************

To configure Kerberos authentication, you must set your Kerberos Server and generate the *kinit* ticket on the client. To enable the Kerberos authentication for pgAdmin, you must configure the Kerberos settings in *config_local.py* or *config_system.py* (see the :ref:`config.py <config_py>` documentation) on the system where pgAdmin is installed in Server mode. You can copy these settings from *config.py* file and modify the values for the following parameters.

.. csv-table::
   :header: "**Parameter**", "**Description**"
   :class: longtable
   :widths: 35, 55

   "AUTHENTICATION_SOURCES","The default value for this parameter is *internal*.
   To enable Kerberos authentication, you must include *kerberos* in the list of values for this parameter. you can modify the value as follows:

   * [‘kerberos’]: pgAdmin will use only Kerberos authentication.

   * [‘kerberos’, ‘internal’]: pgAdmin will first try to authenticate the user through kerberos. If that authentication fails, then it will return back to the login dialog where you need to provide internal pgAdmin user credentials for authentication."
   "KERBEROS_AUTO_CREATE_USER", "Specify value to *True* if you want to automatically create a pgAdmin user corresponding to the kerberos user credentials. Please note that password is not stored in the pgAdmin database."
   "KRB_APP_HOST_NAME", "Specify the name of *pgAdmin webserver hostname*. Please note that if it is not set, it will take the value of *default_server* parameter."

Keytab file for HTTP Service
============================

* Generate the *Keytab* file for the HTTP service principal and copy it to the *pgAdmin* webserver machine. Ensure that the operating system user owning the *pgAdmin* webserver is the owner of this file and should be accessible by that user.

* Please note that either you should set *default_keytab_name* parameter in *krb5.conf* file or the environment variable *KRB5_KTNAME*. If not set then explicitly set *KRB_KTNAME* to the location of your *Keytab* file in the *config_local.py* or *config_system.py* file.

Apache HTTPD Configuration
==========================

If the *pgAdmin* server is under the Apache Server, then you need to add the following parameters in *Directory* directive of :ref:`Apache HTTPD Configuration <server_deployment>`:

   * WSGIScriptReloading On

   * WSGIPassAuthorization On


Browser settings to configure Kerberos Authentication
=====================================================

You need to do the browser settings on the client machine to use the *Spnego/Kerberos*.

- For Mozilla Firefox

  - Open the low level Firefox configuration page by loading the *about:config* page.
  - In the Search text box, enter: *network.negotiate-auth.trusted-uris*
  - Double-click the *network.negotiate-auth.trusted-uris* preference and enter the hostname or the domain of the web server that is protected by Kerberos HTTP SPNEGO. Separate multiple domains and hostnames with a comma.
  - Click OK.

- For Google Chrome

  - For Windows:

    * Open the Control Panel to access the Internet Options dialog.
    * Select the Security tab.
    * Select the Local Intranet zone and click the Sites button.
    * Make sure that the first two options, Include all local (intranet) sites not listed in other zones and Include all sites that bypass the proxy server are checked.
    * Click Advanced and add the names of the domains that are protected by Kerberos HTTP SPNEGO, one at a time, to the list of websites. For example, myhost.example.com. Click Close.
    * Click OK to save your configuration changes.

  - For Linux or MacOS:

    * Add the *--auth-server-whitelist* parameter to the google-chrome command. For example, to run Chrome from a Linux prompt, run the google-chrome command as follows:

    .. code-block:: text

       google-chrome --auth-server-whitelist = "hostname/domain"
