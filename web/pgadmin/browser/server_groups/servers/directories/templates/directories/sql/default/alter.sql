{### SQL to alter directory ###}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% if data %}
{### Owner on directory ###}
{% if data.diruser %}
ALTER DIRECTORY {{ conn|qtIdent(data.name) }}
  OWNER TO {{ conn|qtIdent(data.diruser) }};
{% endif %}

{###  ACL on directory ###}
{% if data.diracl %}
{% for priv in data.diracl %}
{{ PRIVILEGE.APPLY(conn, 'DIRECTORY', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}

{% endif %}

{# ======== The SQl Below will fetch id for given dataspace ======== #}
{% if directory %}
SELECT dir.oid FROM pg_catalog.edb_dir dir WHERE dirname = {{directory|qtLiteral(conn)}};
{% endif %}
