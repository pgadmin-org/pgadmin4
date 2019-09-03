{# ============= Create foreign server ============= #}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% if data %}
CREATE SERVER {{ conn|qtIdent(data.name) }}{% if data.fsrvtype %}

    TYPE {{ data.fsrvtype|qtLiteral }}{% endif %}{% if data.fsrvversion %}

    VERSION {{ data.fsrvversion|qtLiteral }}{%-endif %}{% if fdwdata %}

    FOREIGN DATA WRAPPER {{ conn|qtIdent(fdwdata.name) }}{% endif %}{% if data.fsrvoptions %}

{% if is_valid_options %}
    OPTIONS ({% for variable in data.fsrvoptions %}{% if loop.index != 1 %}, {% endif %}
{{ conn|qtIdent(variable.fsrvoption) }} {{ variable.fsrvvalue|qtLiteral }}{% endfor %}){% endif %}{% endif %};

{# ============= Set the owner for foreign server ============= #}
{% if data.fsrvowner %}

ALTER SERVER {{ conn|qtIdent(data.name) }}
    OWNER TO {{ conn|qtIdent(data.fsrvowner) }};
{% endif %}
{# ============= Set the comment for foreign server ============= #}
{% if data.description %}

COMMENT ON SERVER {{ conn|qtIdent(data.name) }}
    IS {{ data.description|qtLiteral }};

{% endif %}
{# ============= Set the ACL for foreign server ============= #}
{% if data.fsrvacl %}
{% for priv in data.fsrvacl %}
{{ PRIVILEGE.APPLY(conn, 'FOREIGN SERVER', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}{% endfor %}
{% endif %}
{% endif %}
