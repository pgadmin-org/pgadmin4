.. _external_database:

****************************************************
`External database for pgAdmin configuration`:index:
****************************************************

The configurations used by pgAdmin are stored in the SQLite database.
There are many settings stored in this database, like preferences,
user accounts, auto-discovered servers, and many more.

In SQLite, the database is stored in a single file that may be located anywhere
in the directory, which means it is not prepared for failure (no HA support).
In addition, it is not designed to handle many connections reading/writing data
concurrently.

pgAdmin added support for storing configurations in an external database to
prevent this.

Added the 'CONFIG_DATABASE_URI' parameter in the :ref:`config.py <config_py>`
file.

Use SQLite Database
*******************

To use SQLite Database, make sure CONFIG_DATABASE_URI is empty string, such as
''.

Use External Database
*********************

If you want to use an external database, make sure the CONFIG_DATABASE_URI
format is "dialect+driver://username:password@host:port/database".

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
