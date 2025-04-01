.. _enabling_ldap_authentication:

**************************************************
`Enabling LDAP Authentication`:index:
**************************************************

To enable LDAP authentication for pgAdmin, you must configure the LDAP
settings in the *config_local.py* or *config_system.py* file (see the
:ref:`config.py <config_py>` documentation) on the system where pgAdmin is
installed in Server mode. You can copy these settings from *config.py* file
and modify the values for the following parameters:

There are 3 ways to configure LDAP:

* Bind as pgAdmin user

* Anonymous bind

* Dedicated user bind


.. csv-table::
   :header: "**Parameter**", "**Description**"
   :class: longtable
   :widths: 35, 55

   "AUTHENTICATION_SOURCES","The default value for this parameter is *internal*.
   To enable LDAP authentication, you must include *ldap* in the list of values
   for this parameter. you can modify the value as follows:

   * [‘ldap’]: pgAdmin will use only LDAP authentication.

   * [‘ldap’, ‘internal’]: pgAdmin will first try to authenticate the user through
     LDAP. If that authentication fails, then internal user entries of pgAdmin
     will be used for authentication.

   * [‘internal’, ‘ldap’]: pgAdmin will first try to authenticate the user
     through internal user entries. If that authentication fails, then LDAP
     authentication will be used."
   "LDAP_AUTO_CREATE_USER", "Specifies if you want to automatically create a pgAdmin
   user corresponding to the LDAP user credentials. Please note that LDAP password
   is not stored in the pgAdmin database."
   "LDAP_CONNECTION_TIMEOUT","Specifies the connection timeout (in seconds) for LDAP
   authentication."
   "LDAP_SERVER_URI", "An LDAP URI is a combination of connection protocol
   (ldap or ldaps), IP address/hostname and port of the directory server that you
   want to connect to. For example, 'ldap://172.16.209.35:389' is a valid
   LDAP_SERVER_URI where ldap is the connection protocol, 172.16.209.35 is the IP
   address and 389 is the port. Port 636 is used for the ldaps communication protocol."
   "LDAP_USERNAME_ATTRIBUTE","Specifies the LDAP attribute that contains the
   usernames. For LDAP authentication, you need to enter the value of that
   particular attribute as username. For example, if you set the value of
   LDAP_USERNAME_ATTRIBUTE as ‘cn’ and you have defined 'cn=admin' in your LDAP server
   entries, you should be able to authenticate by entering ‘admin’ in the 
   *Email Address / Username* field and its corresponding password in the *Password* 
   field."
   "LDAP_SEARCH_BASE_DN","Specifies the distinguished name (DN) for the top-most user
   directory that you want to search. You can use this parameter for limiting the search
   request to a specific group of users. For example, if you want to search only within
   the Organizational Unit named sales, you can define the value for LDAP_SEARCH_BASE_DN
   parameter as following:
   LDAP_SEARCH_BASE_DN = ‘ou=sales,dc=example,dc=com'

   This is an optional parameter only while binding as pgAdmin user.
   If you do not specify any value for LDAP_SEARCH_BASE_DN, then the value for
   LDAP_BASE_DN will be considered for the same."
   "LDAP_SEARCH_FILTER","Defines the criteria to retrieve matching entries in an
   LDAP search request. For example, LDAP_SEARCH_FILTER = '(objectclass=HR)’ setting
   searches only for users having HR as their objectClass attribute."
   "LDAP_SEARCH_SCOPE","Indicates the set of entries at or below the Base DN that
   maybe considered as potential matches for a search request. You can specify the
   scope of a search as either a *base*, *level*, or *subtree* search. A *base* search
   limits the search to the base object. A *level* search is restricted to the immediate
   children of a base object, but excludes the base object itself. A *subtree* search
   includes all child objects as well as the base object."
   "LDAP_DN_CASE_SENSITIVE", "Indicates whether the DN (Distinguished Names) are case sensitive or not.
   Possible values are True or False. By default is set to False."
   "LDAP_USE_STARTTLS","Specifies if you want to use Transport Layer Security (TLS)
   for secure communication between LDAP clients and LDAP servers. If you specify
   the connection protocol in *LDAP_SERVER_URI* as *ldaps*, this parameter is ignored."
   "LDAP_CA_CERT_FILE","Specifies the path to the trusted CA certificate file. This
   parameter is applicable only if you are using *ldaps* as connection protocol or
   you have set *LDAP_USE_STARTTLS* parameter to *True*."
   "LDAP_CERT_FILE","Specifies the path to the server certificate file. This parameter
   is applicable only if you are using *ldaps* as connection protocol or you have
   set *LDAP_USE_STARTTLS* parameter to *True*."
   "LDAP_KEY_FILE","Specifies the path to the server private key file. This parameter
   is applicable only if you are using *ldaps* as connection protocol or you have
   set *LDAP_USE_STARTTLS* parameter to *True*."
   "LDAP_IGNORE_MALFORMED_SCHEMA", "Some flaky LDAP servers returns malformed schema.
   If this parameter set to *True*, no exception will be raised and schema is thrown away
   but authentication will be done. This parameter should remain False, as recommended."
   "**Bind as pgAdmin user**"
   "LDAP_BASE_DN","Specifies the base DN from where a server will start the search
   for users. For example, an LDAP search for any user will be performed by the server
   starting at the base DN (dc=example,dc=com). When the base DN matches, the full
   DN (cn=admin,dc=example,dc=com) is used to bind with the supplied password."
   "**Anonymous bind**"
   "LDAP_ANONYMOUS_BIND","Set this parameter to *True* for anonymous binding.
   After the connection is made, the pgadmin login user will be further authenticated
   by the username and password provided at the login screen."
   "**Dedicated user bind**"
   "LDAP_BIND_USER", "The account of the user to log in for simple bind.
   Set this parameter to allow the connection to bind using a dedicated user.
   After the connection is made, the pgadmin login user will be further
   authenticated by the username and password provided at the login screen.
   at the login screen."
   "LDAP_BIND_PASSWORD", "Password for simple bind.
   Specify the value if you have set the LDAP_BIND_USER parameter."

