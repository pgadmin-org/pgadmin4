.. _external_database:

****************************************************
`External database for pgAdmin user settings`:index:
****************************************************

The user settings used by pgAdmin are stored in a SQLite database. In this
database, many settings are stored, such as preferences, user accounts,
auto-discovered servers, and many more.

As SQLite is a file-based database and it can be anywhere in the file system,
so it is not designed to take care of failures (no HA support). Furthermore,
it isn't designed to handle multiple connections concurrently reading/writing
data to it. Example: In environments such as Kubernetes it may be useful to
use an alternate backend to avoid using SQLite on non-ephemeral storage and to
allow HA of the settings database.

In order to prevent this, pgAdmin now supports storing user settings in an
external database using the new 'CONFIG_DATABASE_URI' parameter in the
:ref:`config.py <config_py>` file.

Use SQLite Database
*******************

In order to use SQLite Database, make sure CONFIG_DATABASE_URI parameter is
set to an empty string like ''. By default it is set to an empty string in the
config.py so if you would like to use SQLite database then no need to change
anything.

Use External Database
*********************

In order to use an external database, make sure CONFIG_DATABASE_URI parameter
is set like "dialect+driver://username:password@host:port/database".

**Note** It is recommended to create the database in advance.

Use PostgreSQL Database
***********************

Following are the formats to use PostgreSQL as an external database.

Basic syntax:

.. code-block:: bash

    postgresql://username:password@host:port/database

Using specific schema (It is recommended to create the schema in advance):

.. code-block:: bash

    postgresql://username:password@host:port/database?options=-csearch_path=<schema name>

Using default pgpass path for the service account:

.. code-block:: bash

    postgresql://username@host:port?options=-csearch_path=<schema name>

Specifying pgpass file path:

.. code-block:: bash

    postgresql://username@host:port?passfile=<path of the pgpass file>&options=-csearch_path=<schema name>
