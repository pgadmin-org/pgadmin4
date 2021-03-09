{# We need database name before we execute drop #}
{% if did %}
SELECT db.datname as name FROM pg_catalog.pg_database as db WHERE db.oid = {{did}}
{% endif %}
{# Using name from above query we will drop the database #}
{% if datname %}
DROP DATABASE {{ conn|qtIdent(datname) }};
{% endif %}
