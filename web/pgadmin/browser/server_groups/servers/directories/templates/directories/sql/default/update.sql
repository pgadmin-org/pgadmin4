{### SQL to update directory object ###}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% if data %}

{# ==== To update directory name ==== #}
{% if data.name and data.name != o_data.name %}
ALTER DIRECTORY {{ conn|qtIdent(o_data.name) }}
  RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}

{# ==== To update OWNER name ==== #}
{% if data.diruser %}
ALTER DIRECTORY {{ conn|qtIdent(data.name) }} OWNER TO {{ conn|qtIdent(data.diruser) }};
{% endif %}

{# ==== To update directory privileges ==== #}
{# Change the privileges #}
{% if data.diracl %}
{% if 'deleted' in data.diracl %}
{% for priv in data.diracl.deleted %}
{{ PRIVILEGE.RESETALL(conn, 'DIRECTORY', priv.grantee, data.name) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.diracl %}
{% for priv in data.diracl.changed %}
{{ PRIVILEGE.RESETALL(conn, 'DIRECTORY', priv.grantee, data.name) }}
{{ PRIVILEGE.APPLY(conn, 'DIRECTORY', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.diracl %}
{% for priv in data.diracl.added %}
{{ PRIVILEGE.APPLY(conn, 'DIRECTORY', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}

{% endif %}
{% endif %}
