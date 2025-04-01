{### SQL to create directory object ###}
{% if data %}

CREATE DIRECTORY {{ conn|qtIdent(data.name) }} AS {{ data.path|qtLiteral(conn) }};

{### Owner on directory ###}
{% if data.diruser %}
ALTER DIRECTORY {{ conn|qtIdent(data.name) }}
  OWNER TO {{ conn|qtIdent(data.diruser) }};
{% endif %}

{% endif %}

{# ======== The SQl Below will fetch id for given directory ======== #}
{% if directory %}
SELECT dir.oid FROM pg_catalog.edb_dir dir WHERE dirname = {{directory|qtLiteral(conn)}};
{% endif %}