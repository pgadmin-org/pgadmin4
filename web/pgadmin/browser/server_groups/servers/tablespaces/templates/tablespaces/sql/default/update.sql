{### SQL to update tablespace object ###}
{% import 'macros/variable.macros' as VARIABLE %}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% if data %}
{# ==== To update tablespace name ==== #}
{% if data.name and data.name != o_data.name %}
ALTER TABLESPACE {{ conn|qtIdent(o_data.name) }}
  RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{# ==== To update tablespace user ==== #}
{% if data.spcuser and data.spcuser != o_data.spcuser %}
ALTER TABLESPACE {{ conn|qtIdent(data.name) }}
  OWNER TO {{ conn|qtIdent(data.spcuser) }};

{% endif %}
{# ==== To update tablespace comments ==== #}
{% if data.description is defined  and data.description != o_data.description %}
COMMENT ON TABLESPACE {{ conn|qtIdent(data.name) }}
  IS {{ data.description|qtLiteral }};

{% endif %}
{# ==== To update tablespace variables ==== #}
{% if 'spcoptions' in data and data.spcoptions|length > 0 %}
{% set variables = data.spcoptions %}
{% if 'deleted' in variables and variables.deleted|length > 0 %}
{{ VARIABLE.UNSET(conn, 'TABLESPACE', data.name, variables.deleted) }}
{% endif %}
{% if 'added' in variables and variables.added|length > 0 %}
{{ VARIABLE.SET(conn, 'TABLESPACE', data.name, variables.added) }}
{% endif %}
{% if 'changed' in variables and variables.changed|length > 0 %}
{{ VARIABLE.SET(conn, 'TABLESPACE', data.name, variables.changed) }}
{% endif %}

{% endif %}
{# ==== To update tablespace privileges ==== #}
{# Change the privileges #}
{% if data.spcacl %}
{% if 'deleted' in data.spcacl %}
{% for priv in data.spcacl.deleted %}
{{ PRIVILEGE.RESETALL(conn, 'TABLESPACE', priv.grantee, data.name) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.spcacl %}
{% for priv in data.spcacl.changed %}
{{ PRIVILEGE.RESETALL(conn, 'TABLESPACE', priv.grantee, data.name) }}
{{ PRIVILEGE.APPLY(conn, 'TABLESPACE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.spcacl %}
{% for priv in data.spcacl.added %}
{{ PRIVILEGE.APPLY(conn, 'TABLESPACE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}

{% endif %}
{% endif %}
