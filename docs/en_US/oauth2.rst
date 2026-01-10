.. _oauth2:

*******************************************************
`Enabling OAUTH2 and OIDC Authentication`:index:
*******************************************************


To enable OAUTH2 or OpenID Connect (OIDC) authentication for pgAdmin, you must
configure the OAUTH2 settings in the *config_local.py* or *config_system.py*
file (see the :ref:`config.py <config_py>` documentation) on the system where
pgAdmin is installed in Server mode. You can copy these settings from *config.py*
file and modify the values for the following parameters.

OAuth2 vs OpenID Connect (OIDC)
================================

pgAdmin supports both OAuth2 and OIDC authentication protocols:

**OAuth2** is an authorization framework that allows third-party applications to
obtain limited access to user accounts. When using OAuth2, pgAdmin must explicitly
call the provider's userinfo endpoint to retrieve user profile information.

**OpenID Connect (OIDC)** is an identity layer built on top of OAuth2 that provides
standardized user authentication and profile information. When using OIDC, user
identity information is included directly in the ID token, which is more efficient
and secure.

.. note::
   When **OAUTH2_SERVER_METADATA_URL** is configured, pgAdmin treats the provider
   as an OIDC provider and will:
   
   - Use ID token claims for user identity (sub, email, preferred_username)
   - Skip the userinfo endpoint call when ID token contains sufficient information
   - Validate the ID token automatically using the provider's public keys
   
   This is the **recommended approach** for modern identity providers like
   Microsoft Entra ID (Azure AD), Google, Keycloak, Auth0, and Okta.


.. _AzureAD: https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles
.. _GitLab: https://docs.gitlab.com/ee/integration/openid_connect_provider.html#shared-information


.. csv-table::
   :header: "**Parameter**", "**Description**"
   :class: longtable
   :widths: 35, 55

   "AUTHENTICATION_SOURCES", "The default value for this parameter is *internal*.
   To enable OAUTH2 authentication, you must include *oauth2* in the list of values
   for this parameter. you can modify the value as follows:

   * [‘oauth2’, ‘internal’]: pgAdmin will display an additional button for authenticating with oauth2"
    "OAUTH2_NAME", "The name of the Oauth2 provider, ex: Google, Github"
    "OAUTH2_DISPLAY_NAME", "Oauth2 display name in pgAdmin"
    "OAUTH2_CLIENT_ID", "Oauth2 Client ID"
    "OAUTH2_CLIENT_SECRET", "Oauth2 Client Secret"
    "OAUTH2_TOKEN_URL", "Oauth2 Access Token endpoint"
    "OAUTH2_AUTHORIZATION_URL", "Endpoint for user authorization"
    "OAUTH2_SERVER_METADATA_URL", "**OIDC Discovery URL** (recommended for OIDC providers). When set, pgAdmin will use OIDC flow with automatic ID token validation and user claims from the ID token. Example: *https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration*. When using this parameter, OAUTH2_TOKEN_URL and OAUTH2_AUTHORIZATION_URL are optional as they will be discovered automatically."
    "OAUTH2_API_BASE_URL", "Oauth2 base URL endpoint to make requests simple, ex: *https://api.github.com/*"
    "OAUTH2_USERINFO_ENDPOINT", "User Endpoint, ex: *user* (for github, or *user/emails* if the user's email address is private) and *userinfo* (for google). **For OIDC providers**, this is optional if the ID token contains sufficient claims (email, preferred_username, or sub)."
    "OAUTH2_SCOPE", "Oauth scope, ex: 'openid email profile'. **For OIDC providers**, include 'openid' scope to receive an ID token."
    "OAUTH2_ICON", "The Font-awesome icon to be placed on the oauth2 button,  ex: fa-github"
    "OAUTH2_BUTTON_COLOR", "Oauth2 button color"
    "OAUTH2_USERNAME_CLAIM", "The claim which is used for the username. If the value is empty, **for OIDC providers** pgAdmin will use: 1) email, 2) preferred_username, or 3) sub (in that order). **For OAuth2 providers** without OIDC, email is required. Ex: *oid* (for AzureAD), *email* (for Github), *preferred_username* (for Keycloak)"
    "OAUTH2_AUTO_CREATE_USER", "Set the value to *True* if you want to automatically
    create a pgAdmin user corresponding to a successfully authenticated Oauth2 user.
    Please note that password is not stored in the pgAdmin database."
    "OAUTH2_ADDITIONAL_CLAIMS", "If a dictionary is provided, pgAdmin will check for a matching key and value on the **ID token first** (for OIDC providers), then fall back to the userinfo endpoint response. In case there is no match with the provided config, the user will receive an authorization error. Useful for checking AzureAD_ *wids* or *groups*, GitLab_ *owner*, *maintainer* and *reporter* claims."
    "OAUTH2_SSL_CERT_VERIFICATION", "Set this variable to False to disable SSL certificate verification for OAuth2 provider.
    This may need to set False, in case of self-signed certificates."
    "OAUTH2_CHALLENGE_METHOD", "Enable PKCE workflow. PKCE method name, only *S256* is supported"
    "OAUTH2_RESPONSE_TYPE", "Enable PKCE workflow. Mandatory with OAUTH2_CHALLENGE_METHOD, must be set to *code*"

Redirect URL
============

The redirect url to configure Oauth2 server is *<http/https>://<pgAdmin Server URL>/oauth2/authorize*
After successful application authorization, the authorization server will redirect the user back to the pgAdmin url
specified here. Select https scheme if your pgAdmin server serves over https protocol otherwise select http.

Master Password
===============

In the multi user mode, pgAdmin uses user's login password to encrypt/decrypt the PostgreSQL server password.
In the Oauth2 authentication, the pgAdmin does not store the user's password, so we need an encryption key to store
the PostgreSQL server password.
To accomplish this, set the configuration parameter MASTER_PASSWORD to *True*, so upon setting the master password,
it will be used as an encryption key while storing the password. If it is False, the server password can not be stored.

Login Page
==========

After configuration, on restart, you can see the login page with the Oauth2 login button(s).

.. image:: images/oauth2_login.png
    :alt: Oauth2 login
    :align: center

PKCE Workflow
=============

Ref: https://oauth.net/2/pkce

To enable PKCE workflow, set the configuration parameters OAUTH2_CHALLENGE_METHOD to *S256* and OAUTH2_RESPONSE_TYPE to *code*.
Both parameters are mandatory to enable PKCE workflow.

OIDC Configuration Examples
============================

Using OIDC with Discovery Metadata (Recommended)
-------------------------------------------------

When using OIDC providers, configure the **OAUTH2_SERVER_METADATA_URL** parameter
to enable automatic discovery and ID token validation:

.. code-block:: python

    OAUTH2_CONFIG = [{
        'OAUTH2_NAME': 'my-oidc-provider',
        'OAUTH2_DISPLAY_NAME': 'My OIDC Provider',
        'OAUTH2_CLIENT_ID': 'your-client-id',
        'OAUTH2_CLIENT_SECRET': 'your-client-secret',
        'OAUTH2_SERVER_METADATA_URL': 'https://provider.example.com/.well-known/openid-configuration',
        'OAUTH2_SCOPE': 'openid email profile',
        # OAUTH2_USERINFO_ENDPOINT is optional when using OIDC
        # Token and authorization URLs are discovered automatically
    }]

With this configuration:

- pgAdmin will use the OIDC discovery endpoint to automatically find token and authorization URLs
- User identity will be extracted from ID token claims (sub, email, preferred_username)
- The userinfo endpoint will only be called as a fallback if ID token lacks required claims
- ID token will be automatically validated using the provider's public keys

Username Resolution for OIDC
-----------------------------

When **OAUTH2_SERVER_METADATA_URL** is configured (OIDC mode), pgAdmin will
resolve the username in the following order:

1. **OAUTH2_USERNAME_CLAIM** (if configured) - checks ID token first, then userinfo
2. **email** claim from ID token or userinfo endpoint
3. **preferred_username** claim from ID token (standard OIDC claim)
4. **sub** claim from ID token (always present in OIDC, used as last resort)

Example with custom username claim:

.. code-block:: python

    OAUTH2_CONFIG = [{
        # ... other config ...
        'OAUTH2_USERNAME_CLAIM': 'preferred_username',
        # pgAdmin will use 'preferred_username' from ID token for the username
    }]

Example without custom claim (uses automatic fallback):

.. code-block:: python

    OAUTH2_CONFIG = [{
        # ... other config ...
        # No OAUTH2_USERNAME_CLAIM specified
        # pgAdmin will try: email -> preferred_username -> sub
    }]

Additional Claims Authorization with OIDC
------------------------------------------

When using **OAUTH2_ADDITIONAL_CLAIMS** with OIDC providers, pgAdmin will:

1. Check the ID token claims first (more secure, no additional network call)
2. Fall back to userinfo endpoint response if needed

Example:

.. code-block:: python

    OAUTH2_CONFIG = [{
        # ... other config ...
        'OAUTH2_ADDITIONAL_CLAIMS': {
            'groups': ['admin-group', 'pgadmin-users'],
            'roles': ['database-admin']
        },
        # pgAdmin will check these claims in ID token first,
        # then userinfo endpoint if not found
    }]

Legacy OAuth2 Configuration (Without OIDC)
-------------------------------------------

For providers that don't support OIDC discovery, configure all endpoints manually:

.. code-block:: python

    OAUTH2_CONFIG = [{
        'OAUTH2_NAME': 'github',
        'OAUTH2_DISPLAY_NAME': 'GitHub',
        'OAUTH2_CLIENT_ID': 'your-client-id',
        'OAUTH2_CLIENT_SECRET': 'your-client-secret',
        'OAUTH2_TOKEN_URL': 'https://github.com/login/oauth/access_token',
        'OAUTH2_AUTHORIZATION_URL': 'https://github.com/login/oauth/authorize',
        'OAUTH2_API_BASE_URL': 'https://api.github.com/',
        'OAUTH2_USERINFO_ENDPOINT': 'user',
        'OAUTH2_SCOPE': 'user:email',
        # No OAUTH2_SERVER_METADATA_URL - pure OAuth2 mode
    }]

In this mode, user identity is retrieved only from the userinfo endpoint.
