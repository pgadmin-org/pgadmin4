.. _cloud_pgedge_starfleet:

************************************************
`pgEdge Starfleet Deployment`:index:
************************************************

To deploy a PostgreSQL database on pgEdge Starfleet, follow the steps below.
pgAdmin creates a *Managed* database, which Starfleet hosts for you.

.. image:: images/cloud_provider_for_postgresql.png
    :alt: Cloud Deployment Provider
    :align: center

Once you launch the tool, select the pgEdge Starfleet option and click on the
*Next* button to proceed.

.. image:: images/cloud_starfleet_credentials.png
    :alt: pgEdge Starfleet credentials
    :align: center

In the Credentials step, use the *Authenticate with* field to choose how pgAdmin
signs in to pgEdge Starfleet.

* Choose *Sign in with pgEdge* to sign in with your pgEdge account, and click
  the *Sign in* button. pgAdmin shows a code and a link to the pgEdge sign-in
  page. Open the link in a web browser on any device, sign in, and check that
  the page shows the same code before you confirm it. pgAdmin notices when the
  sign-in is complete; this can take a few seconds. If your account belongs to
  more than one Starfleet tenant, use the *Tenant* field to select the one to
  create the database in.

* Choose *API client credentials* to enter the *Auth ID* and *Auth secret* of a
  Starfleet API client instead. pgAdmin checks them with Starfleet when you
  click *Next*.

.. note:: Create an API client in the pgEdge Starfleet console, under
 *Settings > API Clients*. The Auth secret is shown only when the client is
 created, so keep a copy of it. See the
 `pgEdge Starfleet documentation <https://docs.pgedge.com/pgedge-starfleet/>`_
 for details.

.. note:: Only confirm a sign-in code that you requested yourself in pgAdmin.
 Confirming a code that someone else sent you would give them access to your
 pgEdge account.

.. image:: images/cloud_starfleet_instance.png
    :alt: pgEdge Starfleet instance specification
    :align: center

Use the fields from the Instance Specification step to specify the database
details.

* Use the *Database name* field to name the database. The name may contain
  lowercase letters and digits only, must start with a letter, and can be up
  to 50 characters long.

* Use the *Display name* field to optionally set a friendlier name, up to 25
  characters long.

* Select the location to deploy the database to from the *Region* field.

* Use the *Size* field to select the size of the database.

* Use the *PostgreSQL version* field to select the PostgreSQL version.

* Use the *Allowed IP addresses* field to list the IPv4 addresses or CIDR
  ranges that may connect to the database, separated by commas. The field is
  prefilled with your public IP address. At least one and at most 50 entries
  are required; IPv6 addresses are not accepted. Without a matching entry the
  database will not accept connections from pgAdmin.

* Use the *Connect as* field to choose whether pgAdmin connects as *admin*
  (the database administrator, which is not a superuser) or *app* (an
  application user).

.. image:: images/cloud_starfleet_database.png
    :alt: pgEdge Starfleet database details
    :align: center

In the Database Details step, use the *pgAdmin server group* field to select
the server group the new server will be registered in.

.. image:: images/cloud_starfleet_review.png
    :alt: pgEdge Starfleet review
    :align: center

Finally, review the summary in the Review step and click *Finish* to start the
deployment. The progress of the deployment is shown in the same way as for the
other cloud providers, and the new server is added to the *Object Explorer*
when the database is available. pgAdmin connects with *sslmode* set to
*require* and *gssencmode* set to *disable*.

If the deployment fails after the database has been created, for example
because pgEdge Starfleet reports it as failed or it does not become available
within 30 minutes, pgAdmin removes the server from the *Object Explorer* but
does not delete the database. Check the pgEdge Starfleet console, and delete
the database there if it is not needed.

.. image:: images/cloud_starfleet_password.png
    :alt: pgEdge Starfleet database password
    :align: center

pgEdge Starfleet generates the database password. When the deployment
finishes, pgAdmin shows it once in the *pgEdge Starfleet database password*
dialog, together with the host and user name.

* Use the *Copy* button to copy the password to the clipboard.

* Use the *Save password* button to save the password with the server. This
  button is only shown if saving passwords is permitted by the
  :ref:`ALLOW_SAVE_PASSWORD <config_py>` setting.

The password is not shown again in pgAdmin after the dialog is closed. If you
lose it, reset it from the pgEdge Starfleet console.

.. note:: pgAdmin contacts the Starfleet API at the address given by the
 *STARFLEET_API_URL* configuration setting, which defaults to
 *https://api.pgedge.com*. The address must use HTTPS.
 *Sign in with pgEdge* is offered only when the *STARFLEET_AUTH0_APPS*
 configuration setting has an entry for that address, giving the pgEdge sign-in
 service to use.
