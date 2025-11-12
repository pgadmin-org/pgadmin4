{% import 'macros/privilege.macros' as PRIVILEGE %}
{% if data %}
CREATE SCHEMA{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.name) }}
{% if data.namespaceowner %}
    AUTHORIZATION {{ conn|qtIdent(data.namespaceowner) }};

{% endif %}
{% if data.description %}
COMMENT ON SCHEMA {{ conn|qtIdent(data.name) }}
    IS {{ data.description|qtLiteral(conn) }};

{% endif %}
{% if data.nspacl %}
{% for priv in data.nspacl %}
{{ PRIVILEGE.APPLY(conn, 'SCHEMA', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}{% endfor %}
{% endif %}
{% endif %}
