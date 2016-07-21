{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{# Construct sequence name from name and schema #}
{% set seqname=conn|qtIdent(data.schema, data.name) %}
{% if data.seqowner %}

ALTER SEQUENCE {{ seqname }}
    OWNER TO {{ conn|qtIdent(data.seqowner) }};
{% endif %}
{% if data.comment %}

COMMENT ON SEQUENCE {{ seqname }}
    IS {{ data.comment|qtLiteral }};
{% endif %}
{% if data.securities %}

{% for r in data.securities %}
{{ SECLABEL.SET(conn, 'SEQUENCE', data.name, r.provider, r.label, data.schema) }}
{% endfor %}
{% endif %}
{% if data.relacl %}

{% for priv in data.relacl %}
{{ PRIVILEGE.SET(conn, 'SEQUENCE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
