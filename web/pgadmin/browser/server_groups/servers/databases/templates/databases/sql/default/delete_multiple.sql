{# We need database name before we execute drop #}
{% if db_ids %}
SELECT db.datname as name FROM pg_catalog.pg_database as db WHERE db.oid in {{db_ids}};
{% endif %}
{# Using name from above query we will drop the database #}
{% if dbname_array %}
    {% for db in dbname_array  %}
      DROP DATABASE {{ conn|qtIdent(db.name) }};
    {% endfor %}
{% endif %}
