{# ============= Create foreign data wrapper ============= #}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% if data.name %}
CREATE FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}{% if data.fdwvalue %}

    VALIDATOR {{ data.fdwvalue }}{%endif%}{% if data.fdwhan %}

    HANDLER {{ data.fdwhan }}{% endif %}{% if data.fdwoptions %}

{% set addAlter = "False" %}
{% for variable in data.fdwoptions %}
{% if variable.fdwoption and variable.fdwoption != '' %}
{% if addAlter == "False" %}
    OPTIONS ({% set addAlter = "True" %}{% endif %}
{{ conn|qtIdent(variable.fdwoption) }} {{variable.fdwvalue|qtLiteral}}{% if not loop.last %},{% else %}){% endif %}
{% endif %}
{% endfor %}{% endif %}{%if data %};{%endif%}

{# ============= Set the owner for foreign data wrapper ============= #}
{% if data.fdwowner %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    OWNER TO {{ conn|qtIdent(data.fdwowner) }};

{% endif %}
{# ============= Comment on of foreign data wrapper object ============= #}
{% if data.description %}

COMMENT ON FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    IS {{ data.description|qtLiteral }};

{% endif %}
{# ============= Create ACL for foreign data wrapper ============= #}
{% if data.fdwacl %}
{% for priv in data.fdwacl %}
{{ PRIVILEGE.APPLY(conn, 'FOREIGN DATA WRAPPER', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}
